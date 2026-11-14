-- Row-level security. Content is world-readable; writes go through revisions and moderation.
alter table public.profiles enable row level security;
alter table public.citations enable row level security;
alter table public.taxonomy enable row level security;
alter table public.houses enable row level security;
alter table public.origins enable row level security;
alter table public.notes enable row level security;
alter table public.products enable row level security;
alter table public.prices enable row level security;
alter table public.articles enable row level security;
alter table public.entity_citations enable row level security;
alter table public.slug_history enable row level security;
alter table public.media enable row level security;
alter table public.revisions enable row level security;
alter table public.citation_flags enable row level security;
alter table public.votes enable row level security;
alter table public.reviews enable row level security;
alter table public.collection_items enable row level security;
alter table public.search_synonyms enable row level security;

-- Public content: read for everyone; direct writes only for admins (editors use moderate_revision).
do $$
declare t text;
begin
  foreach t in array array['citations','taxonomy','houses','origins','notes','products','prices','articles','entity_citations','slug_history','search_synonyms'] loop
    execute format('create policy "%1$s read" on public.%1$I for select using (true)', t);
    execute format('create policy "%1$s admin write" on public.%1$I for all using (public.current_role_is(array[''admin'']::public.user_role[])) with check (public.current_role_is(array[''admin'']::public.user_role[]))', t);
  end loop;
end $$;

-- Profiles: public usernames; users edit their own (not their role).
create policy "profiles read" on public.profiles for select using (true);
create policy "profiles self update" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles p where p.id = auth.uid()));
create policy "profiles admin" on public.profiles for update using (public.current_role_is(array['admin']::public.user_role[]));

-- Revisions: anyone reads approved ones; authors see their own; contributors propose; editors see all.
create policy "revisions read" on public.revisions for select using (status = 'approved' or author_id = auth.uid() or public.current_role_is(array['editor','admin']::public.user_role[]));
create policy "revisions propose" on public.revisions for insert with check (auth.uid() is not null and author_id = auth.uid() and op in ('create','update') and public.current_role_is(array['contributor','editor','admin']::public.user_role[]));

-- Flags
create policy "flags insert" on public.citation_flags for insert with check (auth.uid() is not null and user_id = auth.uid());
create policy "flags editors" on public.citation_flags for select using (public.current_role_is(array['editor','admin']::public.user_role[]) or user_id = auth.uid());
create policy "flags resolve" on public.citation_flags for update using (public.current_role_is(array['editor','admin']::public.user_role[]));

-- Votes: own rows only; the vote_summary view exposes aggregates.
create policy "votes own" on public.votes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reviews: approved are public; authors see their own; editors moderate.
create policy "reviews read" on public.reviews for select using (status = 'approved' or user_id = auth.uid() or public.current_role_is(array['editor','admin']::public.user_role[]));
create policy "reviews insert" on public.reviews for insert with check (user_id = auth.uid() and status = 'pending');
create policy "reviews moderate" on public.reviews for update using (public.current_role_is(array['editor','admin']::public.user_role[]));

-- Collection: private to the owner.
create policy "collection own" on public.collection_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Media: approved are public; uploaders see their own; editors moderate (via moderate_media).
create policy "media read" on public.media for select using (status = 'approved' or uploaded_by = auth.uid() or public.current_role_is(array['editor','admin']::public.user_role[]));
create policy "media insert" on public.media for insert with check (uploaded_by = auth.uid() and status = 'pending');

grant select on public.vote_summary to anon, authenticated;
grant execute on function public.export_content() to anon, authenticated;
grant execute on function public.search_entities(text, int) to anon, authenticated;
revoke execute on function public.apply_snapshot(text, text, jsonb) from public, anon, authenticated;

-- Storage: a "media" bucket. Uploads land in pending/<uid>/…; public read only after approval moves them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;
create policy "media upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'pending' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "media editors manage" on storage.objects for all to authenticated
  using (bucket_id = 'media' and public.current_role_is(array['editor','admin']::public.user_role[]));
