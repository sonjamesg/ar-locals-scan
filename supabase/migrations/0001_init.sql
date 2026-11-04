create extension if not exists pg_trgm;
create table public.members(
 id uuid primary key default gen_random_uuid(),
 first_name text not null, last_name text not null,
 email text unique, bookwhen_customer_id text unique,
 membership_starts_at date, membership_ends_at date, notes text,
 created_at timestamptz default now(), updated_at timestamptz default now());
create index members_name_trgm on public.members using gin ((first_name||' '||last_name) gin_trgm_ops);
create table public.cards(
 id uuid primary key default gen_random_uuid(),
 barcode text unique not null, member_id uuid references public.members(id) on delete set null,
 active boolean not null default true,
 created_at timestamptz default now(), updated_at timestamptz default now());
create table public.membership_events(
 id bigint generated always as identity primary key,
 member_id uuid references public.members(id) on delete cascade,
 event_type text not null, detail jsonb, created_at timestamptz default now());
create or replace function public.touch() returns trigger language plpgsql as $$begin new.updated_at=now(); return new; end$$;
create trigger t_members before update on public.members for each row execute function public.touch();
create trigger t_cards before update on public.cards for each row execute function public.touch();
-- RLS on, no policies: tables unreadable via anon/authenticated. Access only via SECURITY DEFINER RPCs below.
alter table public.members enable row level security;
alter table public.cards enable row level security;
alter table public.membership_events enable row level security;

create or replace function public.lookup_card(p_barcode text)
returns table(first_name text,last_name text,membership_ends_at date,status text)
language sql security definer set search_path=public stable as $$
 select m.first_name,m.last_name,m.membership_ends_at,
  case when m.membership_ends_at>=current_date then 'valid' else 'expired' end
 from cards c join members m on m.id=c.member_id
 where c.barcode=trim(p_barcode) and c.active
 union all
 select null,null,null,'unknown' where not exists(
  select 1 from cards c where c.barcode=trim(p_barcode) and c.active and c.member_id is not null)
 limit 1 $$;

-- Typeahead over local members (min 2 chars, max 10 rows, limited fields)
create or replace function public.search_members(p_q text)
returns table(id uuid,first_name text,last_name text,email_hint text,membership_ends_at date,bookwhen_customer_id text)
language sql security definer set search_path=public stable as $$
 select id,first_name,last_name,
  case when email is null then null else left(email,2)||'***@'||split_part(email,'@',2) end,
  membership_ends_at,bookwhen_customer_id
 from members where length(trim(p_q))>=2
  and (first_name||' '||last_name) ilike '%'||trim(p_q)||'%'
 order by similarity(first_name||' '||last_name,p_q) desc limit 10 $$;

-- Link barcode to existing member, or create member (e.g. from a Bookwhen match) then link
create or replace function public.link_card(p_barcode text,p_member_id uuid default null,
 p_first_name text default null,p_last_name text default null,p_email text default null,
 p_bookwhen_customer_id text default null,p_ends_at date default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare mid uuid := p_member_id;
begin
 if mid is null and p_bookwhen_customer_id is not null then
  select id into mid from members where bookwhen_customer_id=p_bookwhen_customer_id; end if;
 if mid is null then
  if coalesce(trim(p_first_name),'')='' or coalesce(trim(p_last_name),'')='' then raise exception 'name required'; end if;
  insert into members(first_name,last_name,email,bookwhen_customer_id,membership_ends_at,membership_starts_at)
  values(trim(p_first_name),trim(p_last_name),nullif(lower(trim(p_email)),''),p_bookwhen_customer_id,
   p_ends_at, case when p_ends_at is not null then p_ends_at - interval '12 months' end)
  returning id into mid;
 end if;
 insert into cards(barcode,member_id) values(trim(p_barcode),mid)
 on conflict(barcode) do update set member_id=excluded.member_id,active=true;
 insert into membership_events(member_id,event_type,detail) values(mid,'card_linked',jsonb_build_object('barcode',trim(p_barcode)));
 return mid;
end $$;
revoke all on function public.lookup_card,public.search_members,public.link_card from public;
grant execute on function public.lookup_card,public.search_members,public.link_card to anon,authenticated;
