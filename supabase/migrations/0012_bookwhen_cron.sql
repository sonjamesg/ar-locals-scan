-- Every 10 min Supabase itself calls the bookwhen-gmail-sync Edge Function (no Grok Bot involved).
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('bookwhen-gmail-sync') where exists(select 1 from cron.job where jobname='bookwhen-gmail-sync');
select cron.schedule('bookwhen-gmail-sync','*/10 * * * *',$$
  select net.http_post(url:='https://qpcqovuzmyxinozypxik.supabase.co/functions/v1/bookwhen-gmail-sync',
    headers:='{"Content-Type":"application/json"}'::jsonb, body:='{}'::jsonb, timeout_milliseconds:=30000) $$);
