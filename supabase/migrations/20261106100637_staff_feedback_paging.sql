-- Paginated staff feedback list so every note can be read (was hard-capped at 200).

drop function if exists public.list_staff_feedback();
drop function if exists private.list_staff_feedback();

create or replace function private.list_staff_feedback(p_limit int default 50, p_offset int default 0)
returns table (
  id uuid,
  body text,
  author_label text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path to 'public'
as $fn$
  with bounds as (
    select least(greatest(coalesce(p_limit, 50), 1), 100)::int as lim,
           greatest(coalesce(p_offset, 0), 0)::int as off
  ),
  tot as (
    select count(*)::bigint as n from public.staff_feedback
  )
  select f.id, f.body, f.author_label, f.created_at, f.updated_at, tot.n
  from public.staff_feedback f
  cross join tot
  cross join bounds b
  order by f.created_at desc, f.id desc
  limit (select lim from bounds)
  offset (select off from bounds);
$fn$;

create or replace function public.list_staff_feedback(p_limit int default 50, p_offset int default 0)
returns table (
  id uuid,
  body text,
  author_label text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path to 'public', 'private'
as $fn$
  select * from private.list_staff_feedback(p_limit, p_offset);
$fn$;

revoke all on function public.list_staff_feedback(int, int) from public;
grant execute on function public.list_staff_feedback(int, int) to anon, authenticated;
