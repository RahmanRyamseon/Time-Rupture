-- Hardening follow-up: is_admin() and handle_new_user() were created as
-- SECURITY DEFINER functions in the public schema, which PostgREST exposes
-- as public RPC endpoints (/rest/v1/rpc/is_admin, /rest/v1/rpc/handle_new_user)
-- — flagged by Supabase's security advisor. Neither was ever meant to be
-- called directly: is_admin() exists only for RLS policies to call, and
-- handle_new_user() only runs as the on_auth_user_created trigger. Moving
-- both into a `private` schema removes them from PostgREST's exposed API
-- surface entirely, while RLS policies and triggers can still call them by
-- schema-qualified name — that's internal SQL execution, not a REST call.

create schema if not exists private;

create or replace function private.is_admin()
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

create or replace function private.handle_new_user()
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
  for each row execute function private.handle_new_user();

-- Re-point every policy that referenced public.is_admin() at private.is_admin().
drop policy if exists "profiles: admin can read all" on public.profiles;
create policy "profiles: admin can read all"
  on public.profiles for select
  using (private.is_admin());

drop policy if exists "workpapers: owner or admin can select" on public.workpapers;
create policy "workpapers: owner or admin can select"
  on public.workpapers for select
  using (owner_id = auth.uid() or private.is_admin());

drop policy if exists "input_vat_lines: via owning workpaper" on public.input_vat_lines;
create policy "input_vat_lines: via owning workpaper"
  on public.input_vat_lines for all
  using (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and (w.owner_id = auth.uid() or private.is_admin())
  ))
  with check (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and w.owner_id = auth.uid()
  ));

drop policy if exists "output_vat_lines: via owning workpaper" on public.output_vat_lines;
create policy "output_vat_lines: via owning workpaper"
  on public.output_vat_lines for all
  using (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and (w.owner_id = auth.uid() or private.is_admin())
  ))
  with check (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and w.owner_id = auth.uid()
  ));

drop policy if exists "capital_assets: via owning workpaper" on public.capital_assets;
create policy "capital_assets: via owning workpaper"
  on public.capital_assets for all
  using (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and (w.owner_id = auth.uid() or private.is_admin())
  ))
  with check (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and w.owner_id = auth.uid()
  ));

drop policy if exists "return_boxes: via owning workpaper" on public.return_boxes;
create policy "return_boxes: via owning workpaper"
  on public.return_boxes for all
  using (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and (w.owner_id = auth.uid() or private.is_admin())
  ))
  with check (exists (
    select 1 from public.workpapers w
    where w.id = workpaper_id and w.owner_id = auth.uid()
  ));

-- Drop the old public-schema versions now that nothing references them —
-- this is what actually removes the public RPC endpoints.
drop function if exists public.is_admin();
drop function if exists public.handle_new_user();
