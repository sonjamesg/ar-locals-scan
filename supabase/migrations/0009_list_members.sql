create or replace function public.list_members()
returns table(id uuid,first_name text,last_name text,email text,membership_ends_at date,bookwhen_customer_id text,lost_card_at timestamptz,card_barcode text,
 bw_status text,bw_lcl text,bw_renews_at date,bw_checked_at timestamptz)
language sql security definer set search_path=public stable as $$
 select m.id,m.first_name,m.last_name,m.email,m.membership_ends_at,m.bookwhen_customer_id,m.lost_card_at,
  (select c.barcode from cards c where c.member_id=m.id and c.active order by c.updated_at desc limit 1),
  m.bw_status,m.bw_lcl,m.bw_renews_at,m.bw_checked_at
 from members m order by lower(coalesce(nullif(m.first_name,''),m.email,'')),lower(coalesce(m.last_name,'')) $$;
revoke all on function public.list_members() from public;
grant execute on function public.list_members() to anon,authenticated;
