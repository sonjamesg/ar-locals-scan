-- Treat ACTIVE members with no expiry as valid; set 12-month dates on email ingest and card link.
create or replace function public.lookup_card(p_barcode text)
returns table(first_name text, last_name text, membership_ends_at date, status text)
language sql stable security definer set search_path to 'public' as $function$
 select m.first_name,m.last_name,coalesce(m.membership_ends_at,m.bw_renews_at::date),
  case
   when m.cancelled_at is not null or m.bw_status='CANCELLED'
     or (m.membership_ends_at is not null and m.membership_ends_at<current_date) then 'expired'
   when m.membership_ends_at>=current_date then 'valid'
   when m.membership_ends_at is null and coalesce(m.bw_status,'ACTIVE')='ACTIVE' and m.cancelled_at is null then 'valid'
   else 'expired' end
 from cards c join members m on m.id=c.member_id
 where c.barcode=trim(p_barcode) and c.active
 union all
 select null,null,null,'unknown' where not exists(
  select 1 from cards c where c.barcode=trim(p_barcode) and c.active and c.member_id is not null)
 limit 1 $function$;

create or replace function public.ingest_bookwhen_email(p_message_id text, p_kind text, p_email text, p_first text, p_last text, p_notes text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_id uuid; v_email text:=lower(trim(p_email));
begin
 if exists(select 1 from bookwhen_email_log where gmail_message_id=p_message_id) then
  return jsonb_build_object('status','already_processed'); end if;
 select id into v_id from members where lower(email)=v_email limit 1;
 if p_kind='new' then
  if v_id is null then
   insert into members(first_name,last_name,email,pending_card,bw_status,bw_checked_at,membership_starts_at,membership_ends_at)
   values(coalesce(p_first,''),coalesce(p_last,''),v_email,true,'ACTIVE',now(),current_date,(current_date+interval '12 months')::date)
   returning id into v_id;
  else
   update members set pending_card = not exists(select 1 from cards c where c.member_id=v_id and c.active),
    cancelled_at=null,bw_status='ACTIVE',bw_checked_at=now(),
    membership_starts_at=case when membership_ends_at is null or membership_ends_at<current_date then current_date else membership_starts_at end,
    membership_ends_at=case when membership_ends_at is null or membership_ends_at<current_date then (current_date+interval '12 months')::date else membership_ends_at end,
    first_name=coalesce(nullif(first_name,''),p_first),last_name=coalesce(nullif(last_name,''),p_last) where id=v_id;
  end if;
 elsif p_kind='cancelled' and v_id is not null then
  update members set cancelled_at=now(),bw_status='CANCELLED',pending_card=false where id=v_id;
 end if;
 insert into bookwhen_email_log(gmail_message_id,kind,member_id,notes) values(p_message_id,p_kind,v_id,p_notes);
 return jsonb_build_object('status','ok','member_id',v_id);
end $function$;

create or replace function public.link_card(p_barcode text, p_member_id uuid default null, p_first_name text default null, p_last_name text default null, p_email text default null, p_bookwhen_customer_id text default null, p_ends_at date default null)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare mid uuid := p_member_id;
begin
 if mid is null and p_bookwhen_customer_id is not null then
  select id into mid from members where bookwhen_customer_id=p_bookwhen_customer_id; end if;
 if mid is null then
  if coalesce(trim(p_first_name),'')='' or coalesce(trim(p_last_name),'')='' then raise exception 'name required'; end if;
  insert into members(first_name,last_name,email,bookwhen_customer_id,membership_ends_at,membership_starts_at)
  values(trim(p_first_name),trim(p_last_name),nullif(lower(trim(p_email)),''),p_bookwhen_customer_id,
   p_ends_at, case when p_ends_at is not null then (p_ends_at - interval '12 months')::date end)
  returning id into mid;
 else
  update members set
   membership_starts_at=coalesce(membership_starts_at,current_date),
   membership_ends_at=coalesce(p_ends_at,(coalesce(membership_starts_at,current_date)+interval '12 months')::date)
  where id=mid and membership_ends_at is null and cancelled_at is null;
 end if;
 insert into cards(barcode,member_id,issued_on) values(trim(p_barcode),mid,current_date)
 on conflict(barcode) do update set member_id=excluded.member_id,active=true,issued_on=coalesce(cards.issued_on,current_date);
 insert into membership_events(member_id,event_type,detail) values(mid,'card_linked',jsonb_build_object('barcode',trim(p_barcode)));
 return mid;
end $function$;
