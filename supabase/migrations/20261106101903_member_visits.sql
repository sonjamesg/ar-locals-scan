-- Member gym visit / check-in tracking (Scan desk only).
-- Policy: first counted visit each Europe/London calendar day always counts.
-- Same-day later scans count only if >= 3 hours after the latest COUNTED visit.
-- Suppressed scans do not insert and do not extend the 3-hour window.
-- lookup_card stays read-only; Search / Check / batch must NOT call record_scan_visit.

create schema if not exists private;

create table if not exists public.member_visits (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  visited_at timestamptz not null default now(),
  barcode text,
  source text not null default 'scan_desk',
  created_at timestamptz not null default now(),
  constraint member_visits_source_check check (source in ('scan_desk','manual_check'))
);

create index if not exists member_visits_member_visited_idx
  on public.member_visits (member_id, visited_at desc);
create index if not exists member_visits_visited_at_idx
  on public.member_visits (visited_at desc);

alter table public.member_visits enable row level security;
alter table public.member_visits force row level security;
revoke all on table public.member_visits from anon, authenticated, public;
grant all on table public.member_visits to postgres, service_role;

-- London calendar day start (as timestamptz) for a UTC instant
create or replace function private.london_day_start(p_ts timestamptz)
returns timestamptz
language sql
immutable
set search_path to 'public'
as $fn$
  select ((p_ts at time zone 'Europe/London')::date)::timestamp at time zone 'Europe/London';
$fn$;

create or replace function private.member_scan_status(p_member members)
returns text
language plpgsql
stable
set search_path to 'public'
as $fn$
begin
  if p_member.lost_card_at is not null then return 'lost'; end if;
  if p_member.cancelled_at is not null or p_member.bw_status = 'CANCELLED' then return 'expired'; end if;
  if p_member.membership_ends_at is not null and p_member.membership_ends_at < current_date then return 'expired'; end if;
  if p_member.membership_ends_at >= current_date then return 'valid'; end if;
  if p_member.membership_ends_at is null and coalesce(p_member.bw_status,'ACTIVE') = 'ACTIVE' and p_member.cancelled_at is null then return 'valid'; end if;
  return 'expired';
end
$fn$;

-- Core record helper (member already resolved + locked)
create or replace function private.record_member_visit_locked(
  p_member_id uuid,
  p_barcode text,
  p_source text,
  p_now timestamptz default now()
)
returns table (
  recorded boolean,
  suppressed boolean,
  reason text,
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
  v_now timestamptz := coalesce(p_now, now());
  v_day_start timestamptz := private.london_day_start(v_now);
  v_day_end timestamptz := v_day_start + interval '1 day';
  v_last timestamptz;
  v_today int;
  v_id uuid;
  v_at timestamptz;
begin
  select max(mv.visited_at) into v_last
  from public.member_visits mv
  where mv.member_id = p_member_id;

  select count(*)::int into v_today
  from public.member_visits mv
  where mv.member_id = p_member_id
    and mv.visited_at >= v_day_start
    and mv.visited_at < v_day_end;

  -- First counted visit of the London calendar day always counts
  if v_today = 0 then
    insert into public.member_visits(member_id, visited_at, barcode, source)
    values (p_member_id, v_now, nullif(trim(p_barcode),''), coalesce(nullif(p_source,''),'scan_desk'))
    returning id, member_visits.visited_at into v_id, v_at;
    return query select true, false, 'recorded_first_today'::text, v_id, v_at, v_at, 1, null::timestamptz;
    return;
  end if;

  -- Same day: only count if >= 3 hours after latest COUNTED visit
  if v_last is not null and v_now >= v_last + interval '3 hours' then
    insert into public.member_visits(member_id, visited_at, barcode, source)
    values (p_member_id, v_now, nullif(trim(p_barcode),''), coalesce(nullif(p_source,''),'scan_desk'))
    returning id, member_visits.visited_at into v_id, v_at;
    return query select true, false, 'recorded_session'::text, v_id, v_at, v_at, v_today + 1, null::timestamptz;
    return;
  end if;

  -- Suppressed: do not insert; window stays anchored to last counted visit
  return query select
    false,
    true,
    'within_session_window'::text,
    null::uuid,
    null::timestamptz,
    v_last,
    v_today,
    case when v_last is null then null else v_last + interval '3 hours' end;
end
$fn$;

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
  c public.cards;
  m public.members;
  st text;
  r record;
begin
  if coalesce(trim(p_barcode),'') = '' then
    return query select false,false,'missing_barcode'::text,'unknown'::text,null::uuid,null::text,null::text,null::date,
      null::uuid,null::timestamptz,null::timestamptz,0,null::timestamptz;
    return;
  end if;

  select * into c from public.cards where barcode = trim(p_barcode) and active and member_id is not null limit 1;
  if c.id is null then
    return query select false,false,'unknown_card'::text,'unknown'::text,null::uuid,null::text,null::text,null::date,
      null::uuid,null::timestamptz,null::timestamptz,0,null::timestamptz;
    return;
  end if;

  -- Concurrency-safe per member
  perform pg_advisory_xact_lock(hashtextextended(c.member_id::text, 0));

  select * into m from public.members where id = c.member_id for update;
  if m.id is null then
    return query select false,false,'unknown_card'::text,'unknown'::text,null::uuid,null::text,null::text,null::date,
      null::uuid,null::timestamptz,null::timestamptz,0,null::timestamptz;
    return;
  end if;

  st := private.member_scan_status(m);
  if st <> 'valid' then
    return query select false,false,'not_eligible'::text,st,m.id,m.first_name,m.last_name,
      coalesce(m.membership_ends_at, m.bw_renews_at::date),
      null::uuid,null::timestamptz,null::timestamptz,0,null::timestamptz;
    return;
  end if;

  select * into r from private.record_member_visit_locked(m.id, c.barcode, 'scan_desk', coalesce(p_now, now()));
  return query select r.recorded, r.suppressed, r.reason, 'valid'::text, m.id, m.first_name, m.last_name,
    coalesce(m.membership_ends_at, m.bw_renews_at::date),
    r.visit_id, r.visited_at, r.last_counted_at, r.visits_today, r.next_eligible_at;
end
$fn$;

-- Public Scan-desk mutation (NOT used by Search / Check / batch)
create or replace function public.record_scan_visit(p_barcode text)
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
begin
  return query select * from private.record_scan_visit(p_barcode, now());
end
$fn$;

-- Test helper with injectable time (still SECURITY DEFINER; used only in SQL tests)
create or replace function private.record_scan_visit_at(p_barcode text, p_now timestamptz)
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
begin
  return query select * from private.record_scan_visit(p_barcode, p_now);
end
$fn$;

-- Month report (Europe/London month bounds). Ranking = distinct visit days.
create or replace function private.visits_month_report(p_year int, p_month int)
returns table (
  member_id uuid,
  first_name text,
  last_name text,
  email text,
  visit_count bigint,
  distinct_days bigint,
  last_visit_at timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'private'
as $fn$
  with bounds as (
    select
      make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'Europe/London') as start_ts,
      (make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'Europe/London') + interval '1 month') as end_ts
  )
  select m.id, m.first_name, m.last_name, m.email,
    count(v.id)::bigint as visit_count,
    count(distinct (v.visited_at at time zone 'Europe/London')::date)::bigint as distinct_days,
    max(v.visited_at) as last_visit_at
  from public.member_visits v
  join public.members m on m.id = v.member_id
  cross join bounds b
  where v.visited_at >= b.start_ts and v.visited_at < b.end_ts
    and coalesce(v.source,'') <> 'agent_test'
  group by m.id, m.first_name, m.last_name, m.email
  order by distinct_days desc, visit_count desc, last_visit_at desc nulls last;
$fn$;

create or replace function public.visits_month_report(p_year int, p_month int)
returns table (
  member_id uuid,
  first_name text,
  last_name text,
  email text,
  visit_count bigint,
  distinct_days bigint,
  last_visit_at timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'private'
as $fn$
  select * from private.visits_month_report(p_year, p_month);
$fn$;

create or replace function private.member_visit_stats(p_member_id uuid)
returns table (
  total_visits bigint,
  distinct_days bigint,
  last_visit_at timestamptz,
  visits_this_month bigint,
  days_this_month bigint
)
language sql
stable
security definer
set search_path to 'public', 'private'
as $fn$
  with now_london as (
    select (now() at time zone 'Europe/London') as local_ts
  ),
  month_bounds as (
    select
      make_timestamptz(extract(year from local_ts)::int, extract(month from local_ts)::int, 1, 0, 0, 0, 'Europe/London') as start_ts,
      (make_timestamptz(extract(year from local_ts)::int, extract(month from local_ts)::int, 1, 0, 0, 0, 'Europe/London') + interval '1 month') as end_ts
    from now_london
  )
  select
    count(v.id)::bigint,
    count(distinct (v.visited_at at time zone 'Europe/London')::date)::bigint,
    max(v.visited_at),
    count(v.id) filter (where v.visited_at >= mb.start_ts and v.visited_at < mb.end_ts)::bigint,
    count(distinct (v.visited_at at time zone 'Europe/London')::date)
      filter (where v.visited_at >= mb.start_ts and v.visited_at < mb.end_ts)::bigint
  from public.member_visits v
  cross join month_bounds mb
  where v.member_id = p_member_id
    and coalesce(v.source,'') <> 'agent_test';
$fn$;

create or replace function public.member_visit_stats(p_member_id uuid)
returns table (
  total_visits bigint,
  distinct_days bigint,
  last_visit_at timestamptz,
  visits_this_month bigint,
  days_this_month bigint
)
language sql
stable
security definer
set search_path to 'public', 'private'
as $fn$
  select * from private.member_visit_stats(p_member_id);
$fn$;

create or replace function public.member_visit_history(p_member_id uuid, p_limit int default 30)
returns table (
  id uuid,
  visited_at timestamptz,
  barcode text,
  source text
)
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select v.id, v.visited_at, v.barcode, v.source
  from public.member_visits v
  where v.member_id = p_member_id
    and coalesce(v.source,'') <> 'agent_test'
  order by v.visited_at desc
  limit least(greatest(coalesce(p_limit,30),1),100);
$fn$;

revoke all on function public.record_scan_visit(text) from public;
revoke all on function public.visits_month_report(int, int) from public;
revoke all on function public.member_visit_stats(uuid) from public;
revoke all on function public.member_visit_history(uuid, int) from public;

grant execute on function public.record_scan_visit(text) to anon, authenticated;
grant execute on function public.visits_month_report(int, int) to anon, authenticated;
grant execute on function public.member_visit_stats(uuid) to anon, authenticated;
grant execute on function public.member_visit_history(uuid, int) to anon, authenticated;

revoke all on all functions in schema private from public, anon, authenticated;
