-- Manual add: member + card in one transaction. Card valid 12 months from issue date.
alter table public.cards add column if not exists issued_on date;
create or replace function public.add_member_with_card(p_full_name text,p_barcode text,p_issued_on date,p_email text default null)
returns table(first_name text,last_name text,membership_ends_at date,status text)
language plpgsql security definer set search_path=public as $$
declare mid uuid; n text := regexp_replace(trim(coalesce(p_full_name,'')),'\s+',' ','g'); fn text; ln text; ends date;
begin
 if n='' then raise exception 'Name required'; end if;
 if coalesce(trim(p_barcode),'')='' then raise exception 'Barcode required'; end if;
 if p_issued_on is null then raise exception 'Card issue date required'; end if;
 if p_issued_on>current_date then raise exception 'Issue date cannot be in the future'; end if;
 if exists(select 1 from cards c where c.barcode=trim(p_barcode) and c.active and c.member_id is not null) then raise exception 'Card already linked to a member'; end if;
 fn := split_part(n,' ',1); ln := nullif(trim(substr(n,length(fn)+1)),''); ln := coalesce(ln,'');
 ends := (p_issued_on + interval '12 months')::date;
 if nullif(lower(trim(p_email)),'') is not null then
  select id into mid from members where email=lower(trim(p_email)); end if;
 if mid is null then
  insert into members(first_name,last_name,email,membership_starts_at,membership_ends_at)
  values(fn,ln,nullif(lower(trim(p_email)),''),p_issued_on,ends) returning id into mid;
 else
  update members set first_name=fn,last_name=ln,membership_starts_at=p_issued_on,membership_ends_at=ends where id=mid;
 end if;
 insert into cards(barcode,member_id,issued_on) values(trim(p_barcode),mid,p_issued_on)
 on conflict(barcode) do update set member_id=excluded.member_id,issued_on=excluded.issued_on,active=true;
 insert into membership_events(member_id,event_type,detail) values(mid,'member_added_manual',
  jsonb_build_object('barcode',trim(p_barcode),'issued_on',p_issued_on,'ends_at',ends));
 return query select * from lookup_card(trim(p_barcode));
end $$;
revoke all on function public.add_member_with_card from public;
grant execute on function public.add_member_with_card to anon,authenticated;
