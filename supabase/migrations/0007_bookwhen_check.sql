alter table public.members add column if not exists bw_status text, add column if not exists bw_lcl text,
 add column if not exists bw_renews_at date, add column if not exists bw_renews_text text,
 add column if not exists bw_sub_id text, add column if not exists bw_checked_at timestamptz;
drop function if exists public.search_members(text);
create function public.search_members(p_q text)
returns table(id uuid,first_name text,last_name text,email text,membership_ends_at date,bookwhen_customer_id text,lost_card_at timestamptz,card_barcode text,
 bw_status text,bw_lcl text,bw_renews_at date,bw_checked_at timestamptz)
language sql security definer set search_path=public stable as $$
 select m.id,m.first_name,m.last_name,m.email,m.membership_ends_at,m.bookwhen_customer_id,m.lost_card_at,
  (select c.barcode from cards c where c.member_id=m.id and c.active order by c.updated_at desc limit 1),
  m.bw_status,m.bw_lcl,m.bw_renews_at,m.bw_checked_at
 from members m where length(trim(p_q))>=2
  and ((m.first_name||' '||m.last_name) ilike '%'||trim(p_q)||'%' or m.email ilike '%'||lower(trim(p_q))||'%')
 order by (lower(m.email)=lower(trim(p_q))) desc nulls last,
  greatest(similarity(m.first_name||' '||m.last_name,p_q),similarity(coalesce(m.email,''),lower(p_q))) desc
 limit 10 $$;
revoke all on function public.search_members(text) from public;
grant execute on function public.search_members(text) to anon,authenticated;
