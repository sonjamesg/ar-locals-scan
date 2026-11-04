create or replace function public.unlink_card(p_member_id uuid)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare bcs text;
begin
 select string_agg(barcode, ',') into bcs from cards where member_id=p_member_id and active;
 if bcs is null then raise exception 'no active card to unlink'; end if;
 update cards set active=false, member_id=null where member_id=p_member_id and active;
 update members set pending_card=true where id=p_member_id
  and not exists(select 1 from cards where member_id=p_member_id and active);
 insert into membership_events(member_id,event_type,detail) values(p_member_id,'card_unlinked',jsonb_build_object('barcode',bcs));
 return bcs;
end $function$;
grant execute on function public.unlink_card(uuid) to anon, authenticated;
