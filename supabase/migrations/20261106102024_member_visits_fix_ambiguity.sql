create or replace function private.record_scan_visit(p_barcode text, p_now timestamptz default now())
returns table (
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
  v_card public.cards;
  v_member public.members;
  v_status text;
  v_rec record;
  v_now timestamptz := coalesce(p_now, now());
begin
  if coalesce(trim(p_barcode),'') = '' then
    return query select false,false,'missing_barcode'::text,'unknown'::text,null::uuid,null::text,null::text,null::date,
      null::uuid,null::timestamptz,null::timestamptz,0,null::timestamptz;
    return;
  end if;

  select c.* into v_card
  from public.cards c
  where c.barcode = trim(p_barcode) and c.active and c.member_id is not null
  limit 1;

  if v_card.id is null then
    return query select false,false,'unknown_card'::text,'unknown'::text,null::uuid,null::text,null::text,null::date,
      null::uuid,null::timestamptz,null::timestamptz,0,null::timestamptz;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_card.member_id::text, 0));

  select m.* into v_member from public.members m where m.id = v_card.member_id for update;
  if v_member.id is null then
    return query select false,false,'unknown_card'::text,'unknown'::text,null::uuid,null::text,null::text,null::date,
      null::uuid,null::timestamptz,null::timestamptz,0,null::timestamptz;
    return;
  end if;

  v_status := private.member_scan_status(v_member);
  if v_status <> 'valid' then
    return query select false,false,'not_eligible'::text,v_status,v_member.id,v_member.first_name,v_member.last_name,
      coalesce(v_member.membership_ends_at, v_member.bw_renews_at::date),
      null::uuid,null::timestamptz,null::timestamptz,0,null::timestamptz;
    return;
  end if;

  select * into v_rec from private.record_member_visit_locked(v_member.id, v_card.barcode, 'scan_desk', v_now);
  return query select v_rec.recorded, v_rec.suppressed, v_rec.reason, 'valid'::text, v_member.id, v_member.first_name, v_member.last_name,
    coalesce(v_member.membership_ends_at, v_member.bw_renews_at::date),
    v_rec.visit_id, v_rec.visited_at, v_rec.last_counted_at, v_rec.visits_today, v_rec.next_eligible_at;
end
$fn$;
