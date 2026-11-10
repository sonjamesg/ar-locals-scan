-- READ-ONLY helpers for the Visits board + member visit profile (no writes, no changes to existing rows/functions).
-- Note: only COUNTED visits exist in member_visits; scans suppressed by the 3-hour rule are not stored.

create or replace function public.visits_raw(p_from timestamptz default null, p_to timestamptz default null, p_member_id uuid default null)
returns table (member_id uuid, visited_at timestamptz, source text)
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select v.member_id, v.visited_at, v.source
  from public.member_visits v
  where coalesce(v.source,'') <> 'agent_test'
    and (p_from is null or v.visited_at >= p_from)
    and (p_to is null or v.visited_at < p_to)
    and (p_member_id is null or v.member_id = p_member_id)
  order by v.visited_at
  limit 50000;
$fn$;

create or replace function public.member_card_profile(p_member_id uuid)
returns table (card_barcode text, card_issued_on date, card_linked_at timestamptz, cards_total int, origin text, member_created_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select
    (select c.barcode from public.cards c where c.member_id = m.id and c.active order by c.updated_at desc limit 1),
    (select c.issued_on from public.cards c where c.member_id = m.id and c.active order by c.updated_at desc limit 1),
    coalesce(
      (select max(e.created_at) from public.membership_events e where e.member_id = m.id and e.event_type = 'card_linked'),
      (select c.created_at from public.cards c where c.member_id = m.id and c.active order by c.updated_at desc limit 1)),
    (select count(*)::int from public.cards c where c.member_id = m.id),
    case when exists (select 1 from public.bookwhen_email_log l where l.member_id = m.id and l.kind = 'new') then 'purchase_email'
         else 'desk' end,
    m.created_at
  from public.members m
  where m.id = p_member_id;
$fn$;

revoke all on function public.visits_raw(timestamptz, timestamptz, uuid) from public;
revoke all on function public.member_card_profile(uuid) from public;
grant execute on function public.visits_raw(timestamptz, timestamptz, uuid) to anon, authenticated;
grant execute on function public.member_card_profile(uuid) to anon, authenticated;
