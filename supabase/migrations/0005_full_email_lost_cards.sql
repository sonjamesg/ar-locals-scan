-- Full emails in search, lost-card flag + replacement queue
alter table public.members add column if not exists lost_card_at timestamptz;

drop function if exists public.search_members(text);
create function public.search_members(p_q text)
returns table(id uuid,first_name text,last_name text,email text,membership_ends_at date,bookwhen_customer_id text,lost_card_at timestamptz,card_barcode text)
language sql security definer set search_path=public stable as $$
 select m.id,m.first_name,m.last_name,m.email,m.membership_ends_at,m.bookwhen_customer_id,m.lost_card_at,
  (select c.barcode from cards c where c.member_id=m.id and c.active order by c.updated_at desc limit 1)
 from members m where length(trim(p_q))>=2
  and ((m.first_name||' '||m.last_name) ilike '%'||trim(p_q)||'%' or m.email ilike '%'||lower(trim(p_q))||'%')
 order by (lower(m.email)=lower(trim(p_q))) desc nulls last,
  greatest(similarity(m.first_name||' '||m.last_name,p_q),similarity(coalesce(m.email,''),lower(p_q))) desc
 limit 10 $$;

create or replace function public.mark_card_lost(p_member_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin update members set lost_card_at=now() where id=p_member_id;
 if not found then raise exception 'member not found'; end if;
 insert into membership_events(member_id,event_type) values(p_member_id,'card_lost'); end $$;

create or replace function public.unmark_card_lost(p_member_id uuid)
returns void language sql security definer set search_path=public as $$
 update members set lost_card_at=null where id=p_member_id $$;

create or replace function public.list_lost_cards()
returns table(id uuid,first_name text,last_name text,email text,membership_ends_at date,bookwhen_customer_id text,lost_card_at timestamptz,card_barcode text)
language sql security definer set search_path=public stable as $$
 select m.id,m.first_name,m.last_name,m.email,m.membership_ends_at,m.bookwhen_customer_id,m.lost_card_at,
  (select c.barcode from cards c where c.member_id=m.id and c.active order by c.updated_at desc limit 1)
 from members m where m.lost_card_at is not null order by m.lost_card_at $$;

-- When a card is linked to a member with a lost card: deactivate old cards, clear flag
create or replace function public.cards_after_link() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.active and new.member_id is not null and exists(select 1 from members where id=new.member_id and lost_card_at is not null) then
  update cards set active=false where member_id=new.member_id and id<>new.id and active;
  update members set lost_card_at=null where id=new.member_id;
  insert into membership_events(member_id,event_type,detail) values(new.member_id,'card_replaced',jsonb_build_object('barcode',new.barcode));
 end if; return new; end $$;
drop trigger if exists t_cards_after_link on public.cards;
create trigger t_cards_after_link after insert or update of member_id,active on public.cards for each row execute function public.cards_after_link();

revoke all on function public.search_members(text),public.mark_card_lost(uuid),public.unmark_card_lost(uuid),public.list_lost_cards() from public;
grant execute on function public.search_members(text),public.mark_card_lost(uuid),public.unmark_card_lost(uuid),public.list_lost_cards() to anon,authenticated;
revoke all on function public.cards_after_link() from public;
