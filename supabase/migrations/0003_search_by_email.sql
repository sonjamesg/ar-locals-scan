-- Search members by name OR email (most imported members are email-only)
create or replace function public.search_members(p_q text)
returns table(id uuid,first_name text,last_name text,email_hint text,membership_ends_at date,bookwhen_customer_id text)
language sql security definer set search_path=public stable as $$
 select id,first_name,last_name,
  case when email is null then null else left(email,2)||'***@'||split_part(email,'@',2) end,
  membership_ends_at,bookwhen_customer_id
 from members where length(trim(p_q))>=2
  and ((first_name||' '||last_name) ilike '%'||trim(p_q)||'%'
       or email ilike '%'||lower(trim(p_q))||'%')
 order by (lower(email)=lower(trim(p_q))) desc nulls last,
  greatest(similarity(first_name||' '||last_name,p_q),similarity(coalesce(email,''),lower(p_q))) desc
 limit 10 $$;
revoke all on function public.search_members from public;
grant execute on function public.search_members to anon,authenticated;
