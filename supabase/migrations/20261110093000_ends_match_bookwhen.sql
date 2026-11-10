-- Membership end date follows Bookwhen "Renews at" (bw_renews_at).
-- +12 months is only a fallback when no Bookwhen date is known. Signatures, grants,
-- SECURITY DEFINER and search_path settings are unchanged (CREATE OR REPLACE).

-- (1) Card link: prefer Bookwhen renewal; never replace a Bookwhen date with +12 months.
create or replace function private.link_card_core(p_barcode text, p_member_id uuid default null::uuid, p_first_name text default null::text, p_last_name text default null::text, p_email text default null::text, p_bookwhen_customer_id text default null::text, p_ends_at date default null::date)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  mid uuid := p_member_id;
begin
  if coalesce(trim(p_barcode), '') = '' then
    raise exception 'barcode required';
  end if;

  if mid is null and p_bookwhen_customer_id is not null then
    select id into mid from public.members where bookwhen_customer_id = p_bookwhen_customer_id;
  end if;

  if mid is null then
    if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = '' then
      raise exception 'name required';
    end if;
    insert into public.members(
      first_name, last_name, email, bookwhen_customer_id, membership_ends_at, membership_starts_at
    ) values (
      trim(p_first_name),
      trim(p_last_name),
      nullif(lower(trim(p_email)), ''),
      p_bookwhen_customer_id,
      p_ends_at,
      case when p_ends_at is not null then (p_ends_at - interval '12 months')::date end
    )
    returning id into mid;
  else
    update public.members set
      membership_starts_at = case when membership_ends_at is null
        then coalesce(membership_starts_at, current_date) else membership_starts_at end,
      membership_ends_at = case
        when bw_renews_at is not null then bw_renews_at
        when membership_ends_at is not null then membership_ends_at
        else coalesce(p_ends_at, (coalesce(membership_starts_at, current_date) + interval '12 months')::date)
      end
    where id = mid
      and cancelled_at is null
      and (membership_ends_at is null
           or (bw_renews_at is not null and membership_ends_at is distinct from bw_renews_at));
  end if;

  insert into public.cards(barcode, member_id, issued_on)
  values (trim(p_barcode), mid, current_date)
  on conflict (barcode) do update
    set member_id = excluded.member_id,
        active = true,
        issued_on = coalesce(public.cards.issued_on, current_date);

  insert into public.membership_events(member_id, event_type, detail)
  values (mid, 'card_linked', jsonb_build_object('barcode', trim(p_barcode)));

  return mid;
end
$function$;

-- (2) Bookwhen check: the Bookwhen renewal date wins over any stored end date.
create or replace function public.save_bw_check(p_member_id uuid, p_status text, p_lcl text, p_renews_at date, p_renews_text text, p_sub_id text, p_bookwhen_customer_id text default null::text)
 returns table(bw_status text, bw_lcl text, bw_renews_at date, bw_checked_at timestamp with time zone, bookwhen_customer_id text, membership_ends_at date)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare cid text := nullif(trim(p_bookwhen_customer_id),'');
begin
 if cid is not null and exists(select 1 from members m where m.bookwhen_customer_id=cid and m.id<>p_member_id) then cid := null; end if;
 return query update members m set bw_status=left(upper(p_status),20),bw_lcl=left(p_lcl,20),bw_renews_at=p_renews_at,
  bw_renews_text=left(p_renews_text,80),bw_sub_id=left(p_sub_id,40),bw_checked_at=now(),
  bookwhen_customer_id=coalesce(m.bookwhen_customer_id,cid),
  membership_ends_at=coalesce(p_renews_at,m.membership_ends_at)
 where m.id=p_member_id returning m.bw_status,m.bw_lcl,m.bw_renews_at,m.bw_checked_at,m.bookwhen_customer_id,m.membership_ends_at;
end $function$;

-- (3) Email ingest: no invented +12 months. New sign-ups stay valid via bw_status='ACTIVE'
--     with a null end (member_scan_status / lookup_card treat that as valid) until the
--     Bookwhen check or card link supplies the real date.
create or replace function public.ingest_bookwhen_email(p_message_id text, p_kind text, p_email text, p_first text, p_last text, p_notes text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_id uuid; v_email text:=lower(trim(p_email));
begin
 if exists(select 1 from bookwhen_email_log where gmail_message_id=p_message_id) then
  return jsonb_build_object('status','already_processed'); end if;
 select id into v_id from members where lower(email)=v_email limit 1;
 if p_kind='new' then
  if v_id is null then
   insert into members(first_name,last_name,email,pending_card,bw_status,bw_checked_at,membership_starts_at,membership_ends_at)
   values(coalesce(p_first,''),coalesce(p_last,''),v_email,true,'ACTIVE',now(),current_date,null)
   returning id into v_id;
  else
   update members set pending_card = not exists(select 1 from cards c where c.member_id=v_id and c.active),
    cancelled_at=null,bw_status='ACTIVE',bw_checked_at=now(),
    membership_starts_at=case when membership_ends_at is null or membership_ends_at<current_date then current_date else membership_starts_at end,
    membership_ends_at=case
      when bw_renews_at is not null and bw_renews_at>=current_date then bw_renews_at
      when membership_ends_at is null or membership_ends_at<current_date then null
      else membership_ends_at end,
    first_name=coalesce(nullif(first_name,''),p_first),last_name=coalesce(nullif(last_name,''),p_last) where id=v_id;
  end if;
 elsif p_kind='cancelled' and v_id is not null then
  update members set cancelled_at=now(),bw_status='CANCELLED',pending_card=false where id=v_id;
 end if;
 insert into bookwhen_email_log(gmail_message_id,kind,member_id,notes) values(p_message_id,p_kind,v_id,p_notes);
 return jsonb_build_object('status','ok','member_id',v_id);
end $function$;

-- (4) Manual add: existing member's Bookwhen renewal date first; +12 months from issue only if none.
create or replace function public.add_member_with_card(p_first_name text, p_last_name text, p_barcode text, p_issued_on date, p_email text default null::text)
 returns table(first_name text, last_name text, membership_ends_at date, status text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare mid uuid; fn text := trim(coalesce(p_first_name,'')); ln text := trim(coalesce(p_last_name,'')); ends date; v_bw date;
begin
 if fn='' or ln='' then raise exception 'First and last name required'; end if;
 if coalesce(trim(p_barcode),'')='' then raise exception 'Barcode required'; end if;
 if p_issued_on is null then raise exception 'Card issue date required'; end if;
 if p_issued_on>current_date then raise exception 'Issue date cannot be in the future'; end if;
 if exists(select 1 from cards c where c.barcode=trim(p_barcode) and c.active and c.member_id is not null) then raise exception 'Card already linked to a member'; end if;
 if nullif(lower(trim(p_email)),'') is not null then
  select m.id, m.bw_renews_at into mid, v_bw from members m where m.email=lower(trim(p_email)); end if;
 ends := coalesce(v_bw, (p_issued_on + interval '12 months')::date);
 if mid is null then
  insert into members(first_name,last_name,email,membership_starts_at,membership_ends_at)
  values(fn,ln,nullif(lower(trim(p_email)),''),p_issued_on,ends) returning id into mid;
 else
  update members set first_name=fn,last_name=ln,membership_starts_at=p_issued_on,membership_ends_at=ends where id=mid;
 end if;
 insert into cards(barcode,member_id,issued_on) values(trim(p_barcode),mid,p_issued_on)
 on conflict(barcode) do update set member_id=excluded.member_id,issued_on=excluded.issued_on,active=true;
 insert into membership_events(member_id,event_type,detail) values(mid,'member_added_manual',
  jsonb_build_object('barcode',trim(p_barcode),'issued_on',p_issued_on,'ends_at',ends,'ends_source',case when v_bw is not null then 'bookwhen' else 'issue_plus_12m' end));
 return query select * from lookup_card(trim(p_barcode));
end $function$;

-- (5) Scan validity: expire on the Bookwhen renewal date when known, else the stored end.
create or replace function public.lookup_card(p_barcode text)
 returns table(first_name text, last_name text, membership_ends_at date, status text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
 select m.first_name,m.last_name,coalesce(m.bw_renews_at,m.membership_ends_at),
  case
   when m.cancelled_at is not null or m.bw_status='CANCELLED'
     or (coalesce(m.bw_renews_at,m.membership_ends_at) is not null and coalesce(m.bw_renews_at,m.membership_ends_at)<current_date) then 'expired'
   when coalesce(m.bw_renews_at,m.membership_ends_at)>=current_date then 'valid'
   when coalesce(m.bw_renews_at,m.membership_ends_at) is null and coalesce(m.bw_status,'ACTIVE')='ACTIVE' and m.cancelled_at is null then 'valid'
   else 'expired' end
 from cards c join members m on m.id=c.member_id
 where c.barcode=trim(p_barcode) and c.active
 union all
 select null,null,null,'unknown' where not exists(
  select 1 from cards c where c.barcode=trim(p_barcode) and c.active and c.member_id is not null)
 limit 1 $function$;

create or replace function private.member_scan_status(p_member members)
 returns text
 language plpgsql
 stable
 set search_path to 'public'
as $function$
declare v_end date := coalesce(p_member.bw_renews_at, p_member.membership_ends_at);
begin
  if p_member.lost_card_at is not null then return 'lost'; end if;
  if p_member.cancelled_at is not null or p_member.bw_status = 'CANCELLED' then return 'expired'; end if;
  if v_end is not null and v_end < current_date then return 'expired'; end if;
  if v_end >= current_date then return 'valid'; end if;
  if v_end is null and coalesce(p_member.bw_status,'ACTIVE') = 'ACTIVE' and p_member.cancelled_at is null then return 'valid'; end if;
  return 'expired';
end
$function$;
