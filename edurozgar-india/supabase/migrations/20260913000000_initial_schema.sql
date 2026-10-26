-- Core opportunity records (mirrors src/lib/types.ts Opportunity)
create table if not exists public.opportunities (
  id text primary key,
  title text not null,
  opportunity_type text not null check (opportunity_type in ('scholarship','government_job','admission','fellowship','skill_development')),
  sub_type text not null default '',
  provider_name text not null,
  provider_type text not null,
  description text not null default '',
  state text not null default 'All India',
  district text,
  location text not null default '',
  education_level text[] not null default '{}',
  course_or_post text,
  qualification text not null default '',
  subject text,
  gender_eligibility text not null default 'all' check (gender_eligibility in ('all','women_only','men_only')),
  minority_eligibility jsonb not null default '{"flag":"not_stated"}',
  muslim_eligibility jsonb not null default '{"flag":"not_stated"}',
  other_category_eligibility text[] not null default '{}',
  income_limit text,
  minimum_marks text,
  age_minimum int,
  age_maximum int,
  age_relaxation text,
  vacancies int,
  salary_or_benefit text,
  scholarship_amount text,
  application_fee text,
  opening_date date not null,
  closing_date date not null,
  correction_deadline date,
  exam_date date,
  admit_card_date date,
  result_date date,
  selection_process text,
  required_documents text[] not null default '{}',
  official_notification_url text not null,
  official_application_url text not null,
  official_source_domain text not null,
  application_method text not null default 'online',
  status text not null default 'open',
  last_verified_date date not null,
  next_verification_date date not null,
  source_excerpt text,
  editor_notes text,
  no_application_fee boolean not null default false,
  disability_eligible boolean not null default false,
  first_generation_learner_priority boolean not null default false,
  rural_ews_priority boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.opportunities is 'Canonical, publicly-readable scholarship/job/admission listings. Writes go through server-side API routes only (service role) — never directly from the browser.';

-- One row per official URL we watch for a given opportunity.
create table if not exists public.source_checks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text not null references public.opportunities(id) on delete cascade,
  url_type text not null check (url_type in ('official_notification_url','official_application_url')),
  url text not null,
  enabled boolean not null default true,
  last_checked_at timestamptz,
  last_status_code int,
  content_hash text,
  last_changed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (opportunity_id, url_type)
);

comment on table public.source_checks is 'Tracks one official URL per opportunity/url_type for the daily change-detection job. Internal only — not exposed to the browser.';

-- Detected changes or due re-verifications, awaiting human review before anything public changes.
create table if not exists public.review_queue (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text references public.opportunities(id) on delete cascade,
  source_check_id uuid references public.source_checks(id) on delete set null,
  reason text not null check (reason in ('content_changed','verification_due','link_broken','user_report','user_suggestion')),
  detail jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','applied','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

comment on table public.review_queue is 'Queue of things a human editor should look at: a watched source''s content changed, an opportunity''s next_verification_date arrived, a link broke, or a visitor submitted a report/suggestion. Nothing here auto-publishes to opportunities.';

-- Append-only record of admin actions, for the admin panel's audit log.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor text not null default 'system',
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.opportunities enable row level security;
alter table public.source_checks enable row level security;
alter table public.review_queue enable row level security;
alter table public.audit_log enable row level security;

-- Public, anonymous read access to listings (this is the whole point of the site).
create policy "opportunities are publicly readable"
  on public.opportunities for select
  to anon, authenticated
  using (true);

-- No anon/authenticated policies on source_checks, review_queue, audit_log:
-- with RLS enabled and no matching policy, only the service_role key (used
-- server-side by the edge function and Next.js API routes) can touch them.
