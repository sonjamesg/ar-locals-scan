-- Staff desk feedback board (shared across reception PCs).
-- Access only via SECURITY DEFINER RPCs; table has RLS and no anon/authenticated grants.

create schema if not exists private;

create table if not exists public.staff_feedback (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  author_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_feedback_body_len check (char_length(body) between 1 and 2000),
  constraint staff_feedback_author_len check (author_label is null or char_length(author_label) <= 80)
);

create index if not exists staff_feedback_created_at_idx on public.staff_feedback (created_at desc);

alter table public.staff_feedback enable row level security;
alter table public.staff_feedback force row level security;

revoke all on table public.staff_feedback from anon, authenticated, public;
grant all on table public.staff_feedback to postgres, service_role;

-- Private helpers (not exposed via PostgREST public schema)
create or replace function private.normalize_feedback_body(p_body text)
returns text
language plpgsql
immutable
set search_path to 'public'
as $fn$
declare t text;
begin
  t := trim(both from coalesce(p_body, ''));
  if t = '' then raise exception 'Feedback cannot be blank'; end if;
  if char_length(t) > 2000 then raise exception 'Feedback is too long (max 2000 characters)'; end if;
  return t;
end
$fn$;

create or replace function private.normalize_feedback_author(p_author text)
returns text
language plpgsql
immutable
set search_path to 'public'
as $fn$
declare t text;
begin
  t := nullif(trim(both from coalesce(p_author, '')), '');
  if t is not null and char_length(t) > 80 then raise exception 'Name is too long (max 80 characters)'; end if;
  return t;
end
$fn$;

create or replace function private.list_staff_feedback()
returns table (
  id uuid,
  body text,
  author_label text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select f.id, f.body, f.author_label, f.created_at, f.updated_at
  from public.staff_feedback f
  order by f.created_at desc
  limit 200;
$fn$;

create or replace function private.add_staff_feedback(p_body text, p_author text default null)
returns public.staff_feedback
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare row public.staff_feedback;
begin
  insert into public.staff_feedback(body, author_label)
  values (private.normalize_feedback_body(p_body), private.normalize_feedback_author(p_author))
  returning * into row;
  return row;
end
$fn$;

create or replace function private.update_staff_feedback(p_id uuid, p_body text, p_author text default null)
returns public.staff_feedback
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare row public.staff_feedback;
begin
  if p_id is null then raise exception 'Missing feedback id'; end if;
  update public.staff_feedback
     set body = private.normalize_feedback_body(p_body),
         author_label = private.normalize_feedback_author(p_author),
         updated_at = now()
   where id = p_id
  returning * into row;
  if row.id is null then raise exception 'Feedback not found'; end if;
  return row;
end
$fn$;

create or replace function private.delete_staff_feedback(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare deleted uuid;
begin
  if p_id is null then raise exception 'Missing feedback id'; end if;
  delete from public.staff_feedback where id = p_id returning id into deleted;
  if deleted is null then raise exception 'Feedback not found'; end if;
  return deleted;
end
$fn$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;
revoke all on all functions in schema private from public, anon, authenticated;

-- Public thin wrappers (callable via supabase.rpc) — same desk pattern as list_members / unlink_card
create or replace function public.list_staff_feedback()
returns table (
  id uuid,
  body text,
  author_label text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'private'
as $fn$
  select * from private.list_staff_feedback();
$fn$;

create or replace function public.add_staff_feedback(p_body text, p_author text default null)
returns table (
  id uuid,
  body text,
  author_label text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'private'
as $fn$
declare row public.staff_feedback;
begin
  row := private.add_staff_feedback(p_body, p_author);
  return query select row.id, row.body, row.author_label, row.created_at, row.updated_at;
end
$fn$;

create or replace function public.update_staff_feedback(p_id uuid, p_body text, p_author text default null)
returns table (
  id uuid,
  body text,
  author_label text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'private'
as $fn$
declare row public.staff_feedback;
begin
  row := private.update_staff_feedback(p_id, p_body, p_author);
  return query select row.id, row.body, row.author_label, row.created_at, row.updated_at;
end
$fn$;

create or replace function public.delete_staff_feedback(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'private'
as $fn$
begin
  return private.delete_staff_feedback(p_id);
end
$fn$;

revoke all on function public.list_staff_feedback() from public;
revoke all on function public.add_staff_feedback(text, text) from public;
revoke all on function public.update_staff_feedback(uuid, text, text) from public;
revoke all on function public.delete_staff_feedback(uuid) from public;

grant execute on function public.list_staff_feedback() to anon, authenticated;
grant execute on function public.add_staff_feedback(text, text) to anon, authenticated;
grant execute on function public.update_staff_feedback(uuid, text, text) to anon, authenticated;
grant execute on function public.delete_staff_feedback(uuid) to anon, authenticated;
