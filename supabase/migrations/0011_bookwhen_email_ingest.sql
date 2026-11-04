-- Idempotent ingest of a Bookwhen notification email (called by the Gmail-polling routine, service role only)
create or replace function public.ingest_bookwhen_email(p_message_id text,p_kind text,p_email text,p_first text,p_last text,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_email text:=lower(trim(p_email));
begin
 if exists(select 1 from bookwhen_email_log where gmail_message_id=p_message_id) then
  return jsonb_build_object('status','already_processed'); end if;
 select id into v_id from members where lower(email)=v_email limit 1;
 if p_kind='new' then
  if v_id is null then
   insert into members(first_name,last_name,email,pending_card,bw_status,bw_checked_at)
   values(coalesce(p_first,''),coalesce(p_last,''),v_email,true,'ACTIVE',now()) returning id into v_id;
  else
   update members set pending_card = not exists(select 1 from cards c where c.member_id=v_id and c.active),
    cancelled_at=null,bw_status='ACTIVE',bw_checked_at=now(),
    first_name=coalesce(nullif(first_name,''),p_first),last_name=coalesce(nullif(last_name,''),p_last) where id=v_id;
  end if;
 elsif p_kind='cancelled' and v_id is not null then
  update members set cancelled_at=now(),bw_status='CANCELLED',pending_card=false where id=v_id;
 end if;
 insert into bookwhen_email_log(gmail_message_id,kind,member_id,notes) values(p_message_id,p_kind,v_id,p_notes);
 return jsonb_build_object('status','ok','member_id',v_id);
end $$;
revoke all on function public.ingest_bookwhen_email(text,text,text,text,text,text) from public,anon,authenticated;
