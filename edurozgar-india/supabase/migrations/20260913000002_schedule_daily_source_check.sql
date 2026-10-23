create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Secret used to authenticate pg_cron -> edge function calls, so the function
-- isn't publicly invocable. The value lives in app_secrets (id='cron_secret'),
-- which must be populated separately (see README's "Keeping this current"
-- section for how) — never as a literal in this file.
create table if not exists public.app_secrets (
  id text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
-- No anon/authenticated policies: only service_role (this cron job, the edge
-- function) can read or write it.

-- Unschedule any previous version of this job before re-creating it, so
-- re-running this migration is idempotent instead of stacking duplicate jobs.
select cron.unschedule(jobid) from cron.job where jobname = 'daily-source-check';

select cron.schedule(
  'daily-source-check',
  '17 3 * * *',  -- 03:17 UTC daily (~08:47 IST) — off the hour to avoid stampeding with other jobs
  $$
  select net.http_post(
    url := 'https://qilvkchratzbbrdvzkkv.supabase.co/functions/v1/daily-source-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_secrets where id = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
