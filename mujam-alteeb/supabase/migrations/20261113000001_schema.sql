-- Mijmara — core schema. Bilingual entity tables, per-field citations, media, revisions,
-- votes, reviews, collections, roles and moderation.
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------------------------------------------------------------- roles & profiles
create type public.user_role as enum ('reader', 'contributor', 'editor', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-zA-Z0-9_\-؀-ۿ]{2,32}$'),
  display_name text,
  role public.user_role not null default 'contributor',
  city text,
  numerals text not null default 'western' check (numerals in ('western', 'eastern')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Username stays null until the user picks one (avoids collisions from derived names).
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.current_role_is(roles public.user_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = any (roles));
$$;

-- ---------------------------------------------------------------- reference data
create table public.citations (
  id text primary key,
  url text not null check (url ~ '^https?://'),
  title text not null,
  publisher text not null default '',
  accessed date not null,
  quote text not null default ''
);

create table public.taxonomy (
  type text not null,
  id text not null,
  name_ar text not null,
  name_en text not null,
  sort_order int not null default 0,
  primary key (type, id)
);

-- ---------------------------------------------------------------- entities
create table public.houses (
  id text primary key,
  slug_ar text not null unique, slug_en text not null unique,
  name_ar text not null, name_en text not null,
  country_ar text not null default '', country_en text not null default '',
  city_ar text not null default '', city_en text not null default '',
  founded_year int check (founded_year between 1000 and 2100),
  founder_ar text not null default '', founder_en text not null default '',
  history_ar text not null default '', history_en text not null default '',
  official_website text not null default '' check (official_website = '' or official_website ~ '^https?://'),
  updated_at timestamptz not null default now()
);

create table public.origins (
  id text primary key,
  slug_ar text not null unique, slug_en text not null unique,
  name_ar text not null, name_en text not null,
  region_ar text not null default '', region_en text not null default '',
  species text not null default '',
  profile_ar text not null default '', profile_en text not null default '',
  smell_ar text not null default '', smell_en text not null default '',
  grading_ar text not null default '', grading_en text not null default '',
  uses_ar text not null default '', uses_en text not null default '',
  updated_at timestamptz not null default now()
);

create table public.notes (
  id text primary key,
  slug_ar text not null unique, slug_en text not null unique,
  name_ar text not null, name_en text not null,
  family text not null,
  description_ar text not null default '', description_en text not null default '',
  updated_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  slug_ar text not null unique, slug_en text not null unique,
  name_ar text not null, name_en text not null,
  house_id text not null references public.houses (id),
  category text not null,
  origins text[] not null default '{}',
  wild_status text not null default 'undocumented',
  notes_top text[] not null default '{}',     -- "note_id" or "note_id@origin"
  notes_heart text[] not null default '{}',
  notes_base text[] not null default '{}',
  description_ar text not null default '', description_en text not null default '',
  occasions text[] not null default '{}',
  seasons text[] not null default '{}',
  size_value numeric,
  size_unit text not null default '' check (size_unit in ('', 'tola', 'ml', 'g')),
  size_note_ar text not null default '', size_note_en text not null default '',
  official_url text not null default '' check (official_url = '' or official_url ~ '^https?://'),
  updated_at timestamptz not null default now()
);
create index products_house_idx on public.products (house_id);
create index products_category_idx on public.products (category);
create index products_origins_idx on public.products using gin (origins);

create table public.prices (
  id bigint generated always as identity primary key,
  product_id text not null references public.products (id) on delete cascade,
  price_min numeric not null check (price_min >= 0),
  price_max numeric not null check (price_max >= price_min),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  size_text_ar text not null default '', size_text_en text not null default '',
  observed_on date not null,
  citation_id text not null references public.citations (id),
  note_ar text not null default '', note_en text not null default ''
);

create table public.articles (
  id text primary key,
  kind text not null check (kind in ('culture', 'guide')),
  slug_ar text not null, slug_en text not null,
  title_ar text not null, title_en text not null,
  summary_ar text not null default '', summary_en text not null default '',
  body_ar text not null default '', body_en text not null default '',
  updated date not null default current_date,
  unique (kind, slug_ar), unique (kind, slug_en)
);

-- Per-field citations for every entity type.
create table public.entity_citations (
  entity_type text not null check (entity_type in ('product', 'house', 'origin', 'note', 'culture', 'guide')),
  entity_id text not null,
  field text not null,
  citation_id text not null references public.citations (id),
  primary key (entity_type, entity_id, field, citation_id)
);

-- Old slugs keep working (301) after a rename.
create table public.slug_history (
  entity_type text not null,
  locale text not null check (locale in ('ar', 'en')),
  old_slug text not null,
  entity_id text not null,
  changed_at timestamptz not null default now(),
  primary key (entity_type, locale, old_slug)
);

-- ---------------------------------------------------------------- media
create type public.media_license as enum ('own-work', 'cc-by', 'cc-by-sa', 'cc0', 'brand-permission');
create type public.moderation_status as enum ('pending', 'approved', 'rejected');

create table public.media (
  id bigint generated always as identity primary key,
  entity_type text not null default 'product',
  entity_id text not null,
  storage_path text not null unique,
  license public.media_license not null,
  credit text not null check (length(credit) > 1),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  alt_ar text not null default '', alt_en text not null default '',
  uploaded_by uuid references public.profiles (id) on delete set null,
  status public.moderation_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- wiki mechanics
create table public.revisions (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('product', 'house', 'origin', 'note', 'culture', 'guide')),
  entity_id text,                                    -- null for a proposed new entry
  op text not null default 'update' check (op in ('create', 'update', 'seed')),
  snapshot jsonb not null,                           -- full proposed version
  diff jsonb not null default '[]',                  -- [{field, before, after}] vs published version (trigger)
  citations jsonb not null default '[]',             -- [{field, url}]
  summary text not null default '',
  author_id uuid references public.profiles (id) on delete set null,
  status public.moderation_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index revisions_entity_idx on public.revisions (entity_type, entity_id, created_at desc);
create index revisions_pending_idx on public.revisions (status) where status = 'pending';

create table public.citation_flags (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id text not null,
  field text not null,
  reason text not null default '',
  user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- community
create table public.votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  strength smallint check (strength between 1 and 5),
  longevity smallint check (longevity between 1 and 5),
  sillage smallint check (sillage between 1 and 5),
  seasons text[] not null default '{}' check (seasons <@ array['summer', 'winter', 'spring', 'autumn']),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create view public.vote_summary with (security_invoker = false) as
select product_id,
       count(*)::int as votes,
       avg(strength)::float as strength,
       avg(longevity)::float as longevity,
       avg(sillage)::float as sillage,
       (select jsonb_object_agg(s, n) from (select unnest(v2.seasons) s, count(*) n from public.votes v2 where v2.product_id = v.product_id group by 1) x) as seasons
from public.votes v
group by product_id;

create table public.reviews (
  id bigint generated always as identity primary key,
  product_id text not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 10 and 4000),
  city text,
  climate text check (climate is null or climate in ('coastal-humid', 'inland-dry', 'temperate', 'cold')),
  status public.moderation_status not null default 'pending',
  created_at timestamptz not null default now()
);

create type public.shelf as enum ('owned', 'tried', 'wishlist');
create table public.collection_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  shelf public.shelf not null,
  note text,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
