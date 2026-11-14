-- Attar Wiki: row-level security on every table + storage bucket.

-- Enable RLS everywhere
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','regions','houses','notes','attars','attar_notes','attar_relations','price_reports',
    'glossary','guides','citations','media','revisions','edit_suggestions','votes','attar_vote_stats',
    'reviews','review_reports','shelf_items','page_views','search_synonyms','search_documents'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles: public display names; users edit their own (role guarded by trigger)
-- ---------------------------------------------------------------------------
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Content: anyone reads published rows; editors read everything and write.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['regions','houses','notes','attars','glossary','guides'] loop
    execute format('create policy %I on public.%I for select using (published or public.is_editor())', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (public.is_editor())', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (public.is_editor()) with check (public.is_editor())', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (public.is_admin())', t || '_delete', t);
  end loop;

  foreach t in array array['attar_notes','attar_relations','price_reports','citations'] loop
    execute format('create policy %I on public.%I for select using (true)', t || '_read', t);
    execute format('create policy %I on public.%I for insert with check (public.is_editor())', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (public.is_editor()) with check (public.is_editor())', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (public.is_editor())', t || '_delete', t);
  end loop;
end $$;

-- Media: approved images are public; uploaders see their own; editors see all.
create policy media_read on public.media for select
  using (status = 'approved' or uploaded_by = auth.uid() or public.is_editor());
create policy media_insert on public.media for insert to authenticated
  with check (uploaded_by = auth.uid() and status = 'pending');
create policy media_update on public.media for update using (public.is_editor()) with check (public.is_editor());
create policy media_delete on public.media for delete using (public.is_editor() or (uploaded_by = auth.uid() and status = 'pending'));

-- Revisions: public history; written only by SECURITY DEFINER functions.
create policy revisions_read on public.revisions for select using (true);

-- Edit suggestions
create policy edits_read on public.edit_suggestions for select
  using (submitted_by = auth.uid() or public.is_editor());
create policy edits_insert on public.edit_suggestions for insert to authenticated
  with check (submitted_by = auth.uid() and status = 'pending' and reviewed_by is null);
create policy edits_withdraw on public.edit_suggestions for update to authenticated
  using (submitted_by = auth.uid() and status = 'pending')
  with check (submitted_by = auth.uid() and status in ('pending', 'withdrawn') and reviewed_by is null);

-- Votes: users see and manage only their own; aggregates are public.
create policy votes_read_own on public.votes for select using (user_id = auth.uid());
create policy votes_insert_own on public.votes for insert to authenticated with check (user_id = auth.uid());
create policy votes_update_own on public.votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy votes_delete_own on public.votes for delete to authenticated using (user_id = auth.uid());

create policy vote_stats_read on public.attar_vote_stats for select using (true);

-- Reviews
create policy reviews_read on public.reviews for select
  using (status = 'published' or user_id = auth.uid() or public.is_editor());
create policy reviews_insert_own on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy reviews_update_own on public.reviews for update to authenticated
  using (user_id = auth.uid() or public.is_editor()) with check (user_id = auth.uid() or public.is_editor());
create policy reviews_delete_own on public.reviews for delete to authenticated
  using (user_id = auth.uid() or public.is_editor());

create policy review_reports_insert on public.review_reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy review_reports_read on public.review_reports for select
  using (reporter_id = auth.uid() or public.is_editor());
create policy review_reports_update on public.review_reports for update
  using (public.is_editor()) with check (public.is_editor());

-- Shelf: private to owner
create policy shelf_all_own on public.shelf_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Page views: editors read; writes only through record_view()
create policy page_views_read on public.page_views for select using (public.is_editor());

-- Search tables: public read
create policy search_synonyms_read on public.search_synonyms for select using (true);
create policy search_synonyms_write on public.search_synonyms for all using (public.is_admin()) with check (public.is_admin());
create policy search_documents_read on public.search_documents for select using (published or public.is_editor());

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.approve_edit_suggestion(uuid, text) from public, anon;
revoke execute on function public.reject_edit_suggestion(uuid, text) from public, anon;
revoke execute on function public.moderate_review(uuid, public.review_status) from public, anon;
revoke execute on function public.snapshot_entity(public.entity_type, uuid, text) from public, anon;
revoke execute on function public.write_revision(public.entity_type, uuid, text) from public, anon, authenticated;
revoke execute on function public.refresh_vote_stats(uuid, public.vote_metric) from public, anon, authenticated;
revoke execute on function public.upsert_search_document(public.entity_type, uuid, text, text, text, text, text[], text, boolean)
  from public, anon, authenticated;
revoke execute on function public.citation_gaps(int) from public, anon;
revoke execute on function public.data_gaps(int, int) from public, anon;

grant execute on function public.search_all(text, public.entity_type[], int) to anon, authenticated;
grant execute on function public.record_view(public.entity_type, uuid) to anon, authenticated;
grant execute on function public.missing_citations(public.entity_type, uuid) to anon, authenticated;
grant execute on function public.normalize_search_text(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public "media" bucket; users upload under uploads/<uid>/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy media_objects_read on storage.objects for select using (bucket_id = 'media');
create policy media_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'uploads'
              and (storage.foldername(name))[2] = auth.uid()::text);
create policy media_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (public.is_editor() or (storage.foldername(name))[2] = auth.uid()::text));

-- Signed-in users may call these; the functions themselves check is_editor().
grant execute on function public.approve_edit_suggestion(uuid, text) to authenticated;
grant execute on function public.reject_edit_suggestion(uuid, text) to authenticated;
grant execute on function public.moderate_review(uuid, public.review_status) to authenticated;
grant execute on function public.snapshot_entity(public.entity_type, uuid, text) to authenticated;
grant execute on function public.citation_gaps(int) to authenticated;
grant execute on function public.data_gaps(int, int) to authenticated;
