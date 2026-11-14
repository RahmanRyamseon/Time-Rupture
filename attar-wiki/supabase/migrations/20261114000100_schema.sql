-- Attar Wiki: core schema
-- Content tables, community tables, revisions, moderation.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('reader', 'contributor', 'editor', 'admin');
create type public.attar_type as enum ('natural_deg_bhapka', 'blended', 'synthetic', 'ruh');
create type public.note_position as enum ('top', 'heart', 'base');
create type public.vote_metric as enum ('longevity', 'sillage', 'heat', 'humidity', 'winter');
create type public.entity_type as enum ('attar', 'house', 'note', 'region', 'glossary', 'guide');
create type public.edit_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
create type public.shelf_status as enum ('own', 'want', 'tried');
create type public.review_status as enum ('published', 'pending', 'hidden');
create type public.skin_type as enum ('dry', 'normal', 'oily', 'combination', 'unsure');
create type public.climate_type as enum ('hot_dry', 'hot_humid', 'monsoon', 'temperate', 'cold');
create type public.relation_type as enum ('similar', 'clone_of', 'inspired_by');
create type public.media_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Contributor' check (char_length(display_name) between 1 and 60),
  role public.user_role not null default 'contributor',
  city text check (city is null or char_length(city) <= 80),
  bio text check (bio is null or char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Content tables
-- Every content table has: id, slug, created_at, updated_at, published.
-- Optional *_hi columns hold Hindi text; English is the source of truth.
-- ---------------------------------------------------------------------------
create table public.regions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  name_hi text,
  aliases text[] not null default '{}',
  state text,
  country text not null default 'India',
  summary text,
  summary_hi text,
  history text,
  specialities text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.houses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  name_hi text,
  aliases text[] not null default '{}',
  city text,
  region_id uuid references public.regions (id) on delete set null,
  founded_year int check (founded_year is null or founded_year between 1000 and 2100),
  summary text,
  summary_hi text,
  history text,
  website_url text check (website_url is null or website_url ~* '^https?://'),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  name_hi text,
  aliases text[] not null default '{}',
  botanical_name text,
  category text, -- e.g. floral, woody, resinous, earthy (free text from CSV)
  summary text,
  summary_hi text,
  smell text,
  botany text,
  grown_in text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attars (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  name_hi text,
  aliases text[] not null default '{}',
  house_id uuid references public.houses (id) on delete set null,
  attar_type public.attar_type,
  base_oil text,
  scent_family text,
  summary text,
  summary_hi text,
  description text,
  how_made text,
  region_id uuid references public.regions (id) on delete set null,
  occasions text[] not null default '{}',
  launch_year int check (launch_year is null or launch_year between 1000 and 2100),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attar_notes (
  attar_id uuid not null references public.attars (id) on delete cascade,
  note_id uuid not null references public.notes (id) on delete cascade,
  position public.note_position not null,
  sort_order smallint not null default 0,
  primary key (attar_id, note_id, position)
);
create index attar_notes_note_idx on public.attar_notes (note_id);

create table public.attar_relations (
  id uuid primary key default gen_random_uuid(),
  attar_id uuid not null references public.attars (id) on delete cascade,
  related_attar_id uuid references public.attars (id) on delete cascade,
  external_name text,
  relation public.relation_type not null,
  note text,
  created_at timestamptz not null default now(),
  check (related_attar_id is not null or external_name is not null),
  check (related_attar_id is null or related_attar_id <> attar_id)
);
create unique index attar_relations_unique_internal
  on public.attar_relations (attar_id, related_attar_id, relation) where related_attar_id is not null;
create unique index attar_relations_unique_external
  on public.attar_relations (attar_id, lower(external_name), relation) where external_name is not null;
create index attar_relations_related_idx on public.attar_relations (related_attar_id);

create table public.price_reports (
  id uuid primary key default gen_random_uuid(),
  attar_id uuid not null references public.attars (id) on delete cascade,
  price_min_inr numeric(10, 2) not null check (price_min_inr >= 0),
  price_max_inr numeric(10, 2) not null check (price_max_inr >= 0),
  volume_ml numeric(8, 2) not null check (volume_ml > 0),
  reported_on date not null,
  source_name text not null,
  source_url text check (source_url is null or source_url ~* '^https?://'),
  note text,
  created_at timestamptz not null default now(),
  check (price_max_inr >= price_min_inr)
);
create index price_reports_attar_idx on public.price_reports (attar_id, reported_on desc);

create table public.glossary (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  term text not null,
  term_hi text,
  aliases text[] not null default '{}',
  short_definition text,
  short_definition_hi text,
  body text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  title_hi text,
  summary text,
  summary_hi text,
  body text, -- Markdown
  author_name text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Citations and media (polymorphic over entity_type + entity_id)
-- ---------------------------------------------------------------------------
create table public.citations (
  id uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  entity_id uuid not null,
  field_name text not null,
  url text not null check (url ~* '^https?://'),
  title text not null,
  publisher text,
  accessed_at date not null default current_date,
  quote text check (quote is null or char_length(quote) <= 300),
  sort_order smallint not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index citations_entity_idx on public.citations (entity_type, entity_id);
create unique index citations_unique on public.citations (entity_type, entity_id, field_name, url);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  entity_id uuid not null,
  storage_path text not null unique,
  alt text not null check (char_length(alt) between 3 and 200),
  license text not null check (license in ('CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'OWN-WORK-CC-BY-SA-4.0', 'BRAND-PERMISSION')),
  credit text not null check (char_length(credit) between 2 and 200),
  source_url text check (source_url is null or source_url ~* '^https?://'),
  permission_note text,
  width int,
  height int,
  status public.media_status not null default 'pending',
  is_primary boolean not null default false,
  uploaded_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (license <> 'BRAND-PERMISSION' or permission_note is not null)
);
create index media_entity_idx on public.media (entity_type, entity_id) where status = 'approved';

-- ---------------------------------------------------------------------------
-- Revisions & edit suggestions
-- ---------------------------------------------------------------------------
create table public.revisions (
  id bigint generated always as identity primary key,
  entity_type public.entity_type not null,
  entity_id uuid not null,
  snapshot jsonb not null,
  change_summary text,
  changed_by uuid references auth.users (id) on delete set null,
  edit_suggestion_id uuid,
  created_at timestamptz not null default now()
);
create index revisions_entity_idx on public.revisions (entity_type, entity_id, id desc);

create table public.edit_suggestions (
  id uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  entity_id uuid, -- null = proposal for a new page
  base_revision_id bigint references public.revisions (id) on delete set null,
  proposed jsonb not null check (jsonb_typeof(proposed) = 'object'),
  summary text not null check (char_length(summary) between 5 and 500),
  status public.edit_status not null default 'pending',
  submitted_by uuid not null references auth.users (id) on delete cascade,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  applied_entity_id uuid,
  created_at timestamptz not null default now()
);
create index edit_suggestions_status_idx on public.edit_suggestions (status, created_at);
create index edit_suggestions_user_idx on public.edit_suggestions (submitted_by, created_at desc);

alter table public.revisions
  add constraint revisions_edit_suggestion_fk
  foreign key (edit_suggestion_id) references public.edit_suggestions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Community data
-- ---------------------------------------------------------------------------
create table public.votes (
  user_id uuid not null references auth.users (id) on delete cascade,
  attar_id uuid not null references public.attars (id) on delete cascade,
  metric public.vote_metric not null,
  value smallint not null check (value between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, attar_id, metric)
);
create index votes_attar_idx on public.votes (attar_id, metric);

-- Aggregates maintained by trigger (public, filterable, no raw votes exposed)
create table public.attar_vote_stats (
  attar_id uuid not null references public.attars (id) on delete cascade,
  metric public.vote_metric not null,
  vote_count int not null default 0,
  vote_avg numeric(4, 2),
  distribution int[] not null default '{0,0,0,0,0}',
  updated_at timestamptz not null default now(),
  primary key (attar_id, metric)
);
create index attar_vote_stats_metric_idx on public.attar_vote_stats (metric, vote_avg desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  attar_id uuid not null references public.attars (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 20 and 1500),
  skin_type public.skin_type,
  climate public.climate_type,
  city text check (city is null or char_length(city) <= 80),
  status public.review_status not null default 'published',
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attar_id, user_id)
);
create index reviews_attar_idx on public.reviews (attar_id, created_at desc) where status = 'published';
create index reviews_moderation_idx on public.reviews (status, report_count desc);

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'abuse', 'off_topic', 'copied_text', 'commercial', 'other')),
  details text check (details is null or char_length(details) <= 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);

create table public.shelf_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  attar_id uuid not null references public.attars (id) on delete cascade,
  status public.shelf_status not null,
  personal_note text check (personal_note is null or char_length(personal_note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, attar_id)
);

create table public.page_views (
  entity_type public.entity_type not null,
  entity_id uuid not null,
  day date not null default current_date,
  views int not null default 0,
  primary key (entity_type, entity_id, day)
);

-- Spelling variants used only by search normalisation (not content).
create table public.search_synonyms (
  variant text primary key,
  canonical text not null
);

-- Search index maintained by triggers (see search migration)
create table public.search_documents (
  entity_type public.entity_type not null,
  entity_id uuid not null,
  slug text not null,
  title text not null,
  title_hi text,
  subtitle text,
  haystack text not null default '',
  doc tsvector,
  published boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (entity_type, entity_id)
);

-- Helpful indexes for filters
create index attars_house_idx on public.attars (house_id);
create index attars_region_idx on public.attars (region_id);
create index attars_family_idx on public.attars (scent_family);
create index attars_type_idx on public.attars (attar_type);
create index attars_updated_idx on public.attars (updated_at desc);
create index houses_region_idx on public.houses (region_id);
