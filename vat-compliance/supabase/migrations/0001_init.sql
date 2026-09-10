-- VAT Compliance Tool: schema + Row Level Security.
--
-- Every table here is owned, directly or transitively, by a row in
-- auth.users. Access control is enforced entirely by RLS policies below —
-- application code never bypasses them with a service-role client, so a bug
-- in a route handler can leak at most what Postgres itself would allow.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, carries the app-level role.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own row"
  on public.profiles for select
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- admin_allowlist: emails that get auto-promoted to 'admin' on signup.
-- No RLS policies are defined for it on purpose — with RLS enabled and zero
-- policies, Postgres denies all access to the anon/authenticated roles, so
-- this table is reachable only through a direct migration/SQL-editor
-- connection, never through the app's anon/publishable key.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_allowlist (
  email text primary key
);

alter table public.admin_allowlist enable row level security;

-- ---------------------------------------------------------------------------
-- is_admin(): security-definer helper so admin-aware policies below don't
-- recursively re-evaluate the profiles RLS policy on themselves.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profiles: admin can read all"
  on public.profiles for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- handle_new_user(): creates the profile row on signup, promoting to admin
-- only if the signup email is present in admin_allowlist.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case
      when exists (
        select 1 from public.admin_allowlist a
        where lower(a.email) = lower(new.email)
      ) then 'admin'
      else 'user'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- workpapers: one verification session (a period's AP/AR upload + results).
-- ---------------------------------------------------------------------------
create table if not exists public.workpapers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  period_label text not null,
  currency text not null default 'BHD',
  created_at timestamptz not null default now()
);

alter table public.workpapers enable row level security;

create policy "workpapers: owner or admin can select"
  on public.workpapers for select
  using (owner_id = auth.uid() or public.is_admin());

create policy "workpapers: owner can insert own"
  on public.workpapers for insert
  with check (owner_id = auth.uid());

create policy "workpapers: owner can update own"
  on public.workpapers for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "workpapers: owner can delete own"
  on public.workpapers for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- input_vat_lines (AP) / output_vat_lines (AR)
-- ---------------------------------------------------------------------------
create table if not exists public.input_vat_lines (
  id uuid primary key default gen_random_uuid(),
  workpaper_id uuid not null references public.workpapers (id) on delete cascade,
  inv text,
  line_date date,
  supplier text,
  trn text,
  description text,
  net numeric,
  vat numeric,
  gross numeric,
  nature text,
  status text,
  findings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.output_vat_lines (
  id uuid primary key default gen_random_uuid(),
  workpaper_id uuid not null references public.workpapers (id) on delete cascade,
  inv text,
  line_date date,
  customer text,
  trn text,
  description text,
  net numeric,
  vat numeric,
  gross numeric,
  nature text,
  status text,
  findings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.capital_assets (
  id uuid primary key default gen_random_uuid(),
  workpaper_id uuid not null references public.workpapers (id) on delete cascade,
  asset text not null,
  category text not null,
  input_vat numeric not null default 0,
  base_pct numeric not null default 100,
  cur_pct numeric not null default 100,
  first_use_year int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.return_boxes (
  workpaper_id uuid not null references public.workpapers (id) on delete cascade,
  box text not null,
  filed_vat numeric,
  primary key (workpaper_id, box)
);

alter table public.input_vat_lines enable row level security;
alter table public.output_vat_lines enable row level security;
alter table public.capital_assets enable row level security;
alter table public.return_boxes enable row level security;

-- Every child table shares the same ownership rule: reachable only through
-- a workpaper the caller owns (or any workpaper, if the caller is admin).
create policy "input_vat_lines: via owning workpaper"
  on public.input_vat_lines for all
  using (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and (w.owner_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and w.owner_id = auth.uid()
  ));

create policy "output_vat_lines: via owning workpaper"
  on public.output_vat_lines for all
  using (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and (w.owner_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and w.owner_id = auth.uid()
  ));

create policy "capital_assets: via owning workpaper"
  on public.capital_assets for all
  using (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and (w.owner_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and w.owner_id = auth.uid()
  ));

create policy "return_boxes: via owning workpaper"
  on public.return_boxes for all
  using (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and (w.owner_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and w.owner_id = auth.uid()
  ));

create index if not exists input_vat_lines_workpaper_id_idx on public.input_vat_lines (workpaper_id);
create index if not exists output_vat_lines_workpaper_id_idx on public.output_vat_lines (workpaper_id);
create index if not exists capital_assets_workpaper_id_idx on public.capital_assets (workpaper_id);
create index if not exists workpapers_owner_id_idx on public.workpapers (owner_id);
