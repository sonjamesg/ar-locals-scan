create or replace function public.save_bw_check(p_member_id uuid,p_status text,p_lcl text,p_renews_at date,p_renews_text text,p_sub_id text)
returns table(bw_status text,bw_lcl text,bw_renews_at date,bw_checked_at timestamptz)
language sql security definer set search_path=public as $$
 update members set bw_status=left(upper(p_status),20),bw_lcl=left(p_lcl,20),bw_renews_at=p_renews_at,
  bw_renews_text=left(p_renews_text,80),bw_sub_id=left(p_sub_id,40),bw_checked_at=now()
 where id=p_member_id returning bw_status,bw_lcl,bw_renews_at,bw_checked_at $$;
revoke all on function public.save_bw_check(uuid,text,text,date,text,text) from public;
grant execute on function public.save_bw_check(uuid,text,text,date,text,text) to anon,authenticated;
