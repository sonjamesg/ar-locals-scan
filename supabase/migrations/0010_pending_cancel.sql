-- Scaffolding for Bookwhen email sync (new members -> pending card, cancellations)
alter table public.members add column if not exists pending_card boolean not null default false,
 add column if not exists cancelled_at timestamptz;
create table if not exists public.bookwhen_email_log(gmail_message_id text primary key,processed_at timestamptz not null default now(),
 kind text,member_id uuid references public.members(id) on delete set null,notes text);
alter table public.bookwhen_email_log enable row level security;

drop function if exists public.search_members(text);
create function public.search_members(p_q text)
returns table(id uuid,first_name text,last_name text,email text,membership_ends_at date,bookwhen_customer_id text,lost_card_at timestamptz,card_barcode text,
 bw_status text,bw_lcl text,bw_renews_at date,bw_checked_at timestamptz,pending_card boolean,cancelled_at timestamptz)
language sql security definer set search_path=public stable as $$
 select m.id,m.first_name,m.last_name,m.email,m.membership_ends_at,m.bookwhen_customer_id,m.lost_card_at,
  (select c.barcode from cards c where c.member_id=m.id and c.active order by c.updated_at desc limit 1),
  m.bw_status,m.bw_lcl,m.bw_renews_at,m.bw_checked_at,m.pending_card,m.cancelled_at
 from members m where length(trim(p_q))>=2
  and ((m.first_name||' '||m.last_name) ilike '%'||trim(p_q)||'%' or m.email ilike '%'||lower(trim(p_q))||'%')
 order by (lower(m.email)=lower(trim(p_q))) desc nulls last,
  greatest(similarity(m.first_name||' '||m.last_name,p_q),similarity(coalesce(m.email,''),lower(p_q))) desc
 limit 10 $$;

drop function if exists public.list_members();
create function public.list_members()
returns table(id uuid,first_name text,last_name text,email text,membership_ends_at date,bookwhen_customer_id text,lost_card_at timestamptz,card_barcode text,
 bw_status text,bw_lcl text,bw_renews_at date,bw_checked_at timestamptz,pending_card boolean,cancelled_at timestamptz)
language sql security definer set search_path=public stable as $$
 select m.id,m.first_name,m.last_name,m.email,m.membership_ends_at,m.bookwhen_customer_id,m.lost_card_at,
  (select c.barcode from cards c where c.member_id=m.id and c.active order by c.updated_at desc limit 1),
  m.bw_status,m.bw_lcl,m.bw_renews_at,m.bw_checked_at,m.pending_card,m.cancelled_at
 from members m order by lower(coalesce(nullif(m.first_name,''),m.email,'')),lower(coalesce(m.last_name,'')) $$;

create or replace function public.list_pending_cards()
returns table(id uuid,first_name text,last_name text,email text,membership_ends_at date,bookwhen_customer_id text,lost_card_at timestamptz,card_barcode text,
 bw_status text,bw_lcl text,bw_renews_at date,bw_checked_at timestamptz,pending_card boolean,cancelled_at timestamptz,created_at timestamptz)
language sql security definer set search_path=public stable as $$
 select m.id,m.first_name,m.last_name,m.email,m.membership_ends_at,m.bookwhen_customer_id,m.lost_card_at,
  (select c.barcode from cards c where c.member_id=m.id and c.active order by c.updated_at desc limit 1),
  m.bw_status,m.bw_lcl,m.bw_renews_at,m.bw_checked_at,m.pending_card,m.cancelled_at,m.created_at
 from members m where m.pending_card and m.cancelled_at is null order by m.created_at $$;

create or replace function public.mark_card_issued(p_member_id uuid)
returns void language sql security definer set search_path=public as $$ update members set pending_card=false where id=p_member_id $$;

create or replace function public.mark_member_cancelled(p_member_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin update members set cancelled_at=now(),bw_status='CANCELLED',pending_card=false where id=p_member_id;
 if not found then raise exception 'member not found'; end if;
 insert into membership_events(member_id,event_type) values(p_member_id,'cancelled'); end $$;

-- Linking any active card clears pending_card (plus existing lost-card replacement logic)
create or replace function public.cards_after_link() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.active and new.member_id is not null then
  update members set pending_card=false where id=new.member_id and pending_card;
  if exists(select 1 from members where id=new.member_id and lost_card_at is not null) then
   update cards set active=false where member_id=new.member_id and id<>new.id and active;
   update members set lost_card_at=null where id=new.member_id;
   insert into membership_events(member_id,event_type,detail) values(new.member_id,'card_replaced',jsonb_build_object('barcode',new.barcode));
  end if;
 end if; return new; end $$;

revoke all on function public.search_members(text),public.list_members(),public.list_pending_cards(),public.mark_card_issued(uuid),public.mark_member_cancelled(uuid) from public;
grant execute on function public.search_members(text),public.list_members(),public.list_pending_cards(),public.mark_card_issued(uuid),public.mark_member_cancelled(uuid) to anon,authenticated;
