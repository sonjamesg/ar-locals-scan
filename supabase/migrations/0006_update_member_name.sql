create or replace function public.update_member_name(p_member_id uuid,p_first_name text,p_last_name text)
returns void language plpgsql security definer set search_path=public as $$
begin update members set first_name=coalesce(trim(p_first_name),''),last_name=coalesce(trim(p_last_name),'') where id=p_member_id;
 if not found then raise exception 'member not found'; end if; end $$;
grant execute on function public.update_member_name(uuid,text,text) to anon,authenticated;
