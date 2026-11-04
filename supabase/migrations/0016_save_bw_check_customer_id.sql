drop function if exists public.save_bw_check(uuid,text,text,date,text,text);
create or replace function public.save_bw_check(p_member_id uuid,p_status text,p_lcl text,p_renews_at date,p_renews_text text,p_sub_id text,p_bookwhen_customer_id text default null)
returns table(bw_status text,bw_lcl text,bw_renews_at date,bw_checked_at timestamptz,bookwhen_customer_id text,membership_ends_at date)
language plpgsql security definer set search_path=public as $$
declare cid text := nullif(trim(p_bookwhen_customer_id),'');
begin
 if cid is not null and exists(select 1 from members m where m.bookwhen_customer_id=cid and m.id<>p_member_id) then cid := null; end if;
 return query update members m set bw_status=left(upper(p_status),20),bw_lcl=left(p_lcl,20),bw_renews_at=p_renews_at,
  bw_renews_text=left(p_renews_text,80),bw_sub_id=left(p_sub_id,40),bw_checked_at=now(),
  bookwhen_customer_id=coalesce(m.bookwhen_customer_id,cid),
  membership_ends_at=coalesce(m.membership_ends_at,p_renews_at)
 where m.id=p_member_id returning m.bw_status,m.bw_lcl,m.bw_renews_at,m.bw_checked_at,m.bookwhen_customer_id,m.membership_ends_at;
end $$;
revoke all on function public.save_bw_check(uuid,text,text,date,text,text,text) from public;
grant execute on function public.save_bw_check(uuid,text,text,date,text,text,text) to anon,authenticated;
