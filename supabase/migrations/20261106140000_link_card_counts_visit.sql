-- Initial reception scan-desk card link counts as a check-in for eligible members.
-- Lost/Pending/Search/import keep using public.link_card (no visit).
-- Scan desk uses public.link_card_from_scan (atomic link + visit policy).

alter table public.member_visits
  drop constraint if exists member_visits_source_check;

alter table public.member_visits
  add constraint member_visits_source_check
  check (source = any (array['scan_desk'::text, 'manual_check'::text, 'card_link'::text]));

-- Shared link core (no visit side effects)
create or replace function private.link_card_core(
  p_barcode text,
  p_member_id uuid default null,
  p_first_name text default null,
  p_last_name text default null,
  p_email text default null,
  p_bookwhen_customer_id text default null,
  p_ends_at date default null
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  mid uuid := p_member_id;
begin
  if coalesce(trim(p_barcode), '') = '' then
    raise exception 'barcode required';
  end if;

  if mid is null and p_bookwhen_customer_id is not null then
    select id into mid from public.members where bookwhen_customer_id = p_bookwhen_customer_id;
  end if;

  if mid is null then
    if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = '' then
      raise exception 'name required';
    end if;
    insert into public.members(
      first_name, last_name, email, bookwhen_customer_id, membership_ends_at, membership_starts_at
    ) values (
      trim(p_first_name),
      trim(p_last_name),
      nullif(lower(trim(p_email)), ''),
      p_bookwhen_customer_id,
      p_ends_at,
      case when p_ends_at is not null then (p_ends_at - interval '12 months')::date end
    )
    returning id into mid;
  else
    update public.members set
      membership_starts_at = coalesce(membership_starts_at, current_date),
      membership_ends_at = coalesce(
        p_ends_at,
        (coalesce(membership_starts_at, current_date) + interval '12 months')::date
      )
    where id = mid
      and membership_ends_at is null
      and cancelled_at is null;
  end if;

  insert into public.cards(barcode, member_id, issued_on)
  values (trim(p_barcode), mid, current_date)
  on conflict (barcode) do update
    set member_id = excluded.member_id,
        active = true,
        issued_on = coalesce(public.cards.issued_on, current_date);

  insert into public.membership_events(member_id, event_type, detail)
  values (mid, 'card_linked', jsonb_build_object('barcode', trim(p_barcode)));

  return mid;
end
$fn$;

-- Existing callers unchanged: link only, never counts a visit
create or replace function public.link_card(
  p_barcode text,
  p_member_id uuid default null,
  p_first_name text default null,
  p_last_name text default null,
  p_email text default null,
  p_bookwhen_customer_id text default null,
  p_ends_at date default null
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'private'
as $fn$
begin
  return private.link_card_core(
    p_barcode, p_member_id, p_first_name, p_last_name, p_email, p_bookwhen_customer_id, p_ends_at
  );
end
$fn$;

-- Scan-desk confirmed link: atomic link + eligible visit (same 3h / London-day policy)
create or replace function public.link_card_from_scan(
  p_barcode text,
  p_member_id uuid default null,
  p_first_name text default null,
  p_last_name text default null,
  p_email text default null,
  p_bookwhen_customer_id text default null,
  p_ends_at date default null,
  p_now timestamptz default now()
) returns table (
  recorded boolean,
  suppressed boolean,
  reason text,
  status text,
  member_id uuid,
  first_name text,
  last_name text,
  membership_ends_at date,
  visit_id uuid,
  visited_at timestamptz,
  last_counted_at timestamptz,
  visits_today int,
  next_eligible_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'private'
as $fn$
declare
  v_mid uuid;
  v_member public.members;
  v_status text;
  v_now timestamptz := coalesce(p_now, now());
  v_rec record;
begin
  v_mid := private.link_card_core(
    p_barcode, p_member_id, p_first_name, p_last_name, p_email, p_bookwhen_customer_id, p_ends_at
  );

  perform pg_advisory_xact_lock(hashtextextended(v_mid::text, 0));

  select m.* into v_member from public.members m where m.id = v_mid for update;
  if v_member.id is null then
    return query select
      false, false, 'member_missing'::text, 'unknown'::text,
      null::uuid, null::text, null::text, null::date,
      null::uuid, null::timestamptz, null::timestamptz, 0, null::timestamptz;
    return;
  end if;

  v_status := private.member_scan_status(v_member);

  if v_status <> 'valid' then
    -- Link succeeded; ineligible members do not get a visit
    return query select
      false, false, 'linked_not_eligible'::text, v_status,
      v_member.id, v_member.first_name, v_member.last_name,
      coalesce(v_member.membership_ends_at, v_member.bw_renews_at::date),
      null::uuid, null::timestamptz, null::timestamptz, 0, null::timestamptz;
    return;
  end if;

  select * into v_rec
  from private.record_member_visit_locked(v_member.id, trim(p_barcode), 'card_link', v_now);

  return query select
    v_rec.recorded, v_rec.suppressed, v_rec.reason, 'valid'::text,
    v_member.id, v_member.first_name, v_member.last_name,
    coalesce(v_member.membership_ends_at, v_member.bw_renews_at::date),
    v_rec.visit_id, v_rec.visited_at, v_rec.last_counted_at, v_rec.visits_today, v_rec.next_eligible_at;
end
$fn$;

-- Injectable-time test helper (private only)
create or replace function private.link_card_from_scan_at(
  p_barcode text,
  p_member_id uuid,
  p_now timestamptz,
  p_first_name text default null,
  p_last_name text default null,
  p_email text default null,
  p_bookwhen_customer_id text default null,
  p_ends_at date default null
) returns table (
  recorded boolean,
  suppressed boolean,
  reason text,
  status text,
  member_id uuid,
  first_name text,
  last_name text,
  membership_ends_at date,
  visit_id uuid,
  visited_at timestamptz,
  last_counted_at timestamptz,
  visits_today int,
  next_eligible_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'private'
as $fn$
begin
  return query select * from public.link_card_from_scan(
    p_barcode, p_member_id, p_first_name, p_last_name, p_email, p_bookwhen_customer_id, p_ends_at, p_now
  );
end
$fn$;

revoke all on function public.link_card_from_scan(text, uuid, text, text, text, text, date, timestamptz) from public;
grant execute on function public.link_card_from_scan(text, uuid, text, text, text, text, date, timestamptz) to anon, authenticated;

-- Keep link_card grants
revoke all on function public.link_card(text, uuid, text, text, text, text, date) from public;
grant execute on function public.link_card(text, uuid, text, text, text, text, date) to anon, authenticated;

revoke all on all functions in schema private from public, anon, authenticated;
