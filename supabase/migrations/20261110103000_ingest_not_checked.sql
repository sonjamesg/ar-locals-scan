-- Bookwhen purchase emails = the member just paid → ACTIVE, card pending, provisional end
-- date = purchase date + 12 months (James t239u). But a purchase email is NOT a Bookwhen
-- subscription check: bw_checked_at stays null until "Check user" (save_bw_check), which then
-- overwrites membership_ends_at with the real renewal date and stores LCL / subscription link.
CREATE OR REPLACE FUNCTION public.ingest_bookwhen_email(p_message_id text, p_kind text, p_email text, p_first text, p_last text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_email text:=lower(trim(p_email));
begin
 if exists(select 1 from bookwhen_email_log where gmail_message_id=p_message_id) then
  return jsonb_build_object('status','already_processed'); end if;
 select id into v_id from members where lower(email)=v_email limit 1;
 if p_kind='new' then
  if v_id is null then
   insert into members(first_name,last_name,email,pending_card,bw_status,bw_checked_at,membership_starts_at,membership_ends_at)
   values(coalesce(p_first,''),coalesce(p_last,''),v_email,true,'ACTIVE',null,current_date,(current_date + interval '12 months')::date)
   returning id into v_id;
  else
   update members set pending_card = not exists(select 1 from cards c where c.member_id=v_id and c.active),
    cancelled_at=null,
    bw_status='ACTIVE', -- paid again; bw_checked_at untouched (not a Bookwhen check)
    membership_starts_at=case when membership_ends_at is null or membership_ends_at<current_date then current_date else membership_starts_at end,
    membership_ends_at=case
      when bw_renews_at is not null and bw_renews_at>=current_date then bw_renews_at
      when membership_ends_at is null or membership_ends_at<current_date then (current_date + interval '12 months')::date
      else membership_ends_at end,
    first_name=coalesce(nullif(first_name,''),p_first),last_name=coalesce(nullif(last_name,''),p_last) where id=v_id;
  end if;
 elsif p_kind='cancelled' and v_id is not null then
  update members set cancelled_at=now(),bw_status='CANCELLED',pending_card=false where id=v_id;
 end if;
 insert into bookwhen_email_log(gmail_message_id,kind,member_id,notes) values(p_message_id,p_kind,v_id,p_notes);
 return jsonb_build_object('status','ok','member_id',v_id);
end $function$;
