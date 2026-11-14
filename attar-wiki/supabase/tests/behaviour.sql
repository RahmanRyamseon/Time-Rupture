-- Behavioural tests for the migrations. Run against a throwaway database:
--   psql -v ON_ERROR_STOP=1 -f supabase_stub.sql -f ../migrations/*.sql -f behaviour.sql
-- Uses fictional test fixtures (names prefixed "Test") that never reach production.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'contrib@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'other@example.test'),
  ('00000000-0000-0000-0000-00000000000d', 'third@example.test');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';

do $$ begin
  assert (select count(*) from public.profiles) = 4, 'profiles auto-created';
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 'contributor', 'default role';
end $$;

-- Fixtures (as service/owner)
insert into public.notes (id, slug, name, aliases) values
  ('10000000-0000-0000-0000-000000000001', 'test-vetiver', 'Test Vetiver', '{khus,खस}'),
  ('10000000-0000-0000-0000-000000000002', 'test-rose', 'Test Rose', '{gulab}');
insert into public.houses (id, slug, name) values ('20000000-0000-0000-0000-000000000001', 'test-house', 'Test House');
insert into public.attars (id, slug, name, house_id, scent_family, how_made) values
  ('30000000-0000-0000-0000-000000000001', 'test-khus-attar', 'Test Khus Attar', '20000000-0000-0000-0000-000000000001', 'earthy', 'Test method text');
insert into public.attar_notes values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'base', 1);

do $$ begin
  assert (select count(*) from public.revisions where entity_type = 'attar') = 1, 'insert revision';
  assert exists (select 1 from public.search_all('ittar khus')), 'synonym + alias search';
  assert exists (select 1 from public.search_all('tset khus')), 'typo tolerant search';
  assert exists (select 1 from public.search_all('खस')), 'hindi alias search';
  assert exists (select 1 from public.search_all('gulab', array['note']::public.entity_type[])), 'note alias search';
  assert 'how_made' = any(public.missing_citations('attar', '30000000-0000-0000-0000-000000000001')), 'needs citation flag';
  assert 'notes' = any(public.missing_citations('attar', '30000000-0000-0000-0000-000000000001')), 'notes need citation';
end $$;

-- ---- act as contributor B
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);

-- cannot write content directly
do $$ begin
  begin
    update public.attars set name = 'Hacked' where slug = 'test-khus-attar';
    assert (select name from public.attars where slug = 'test-khus-attar') <> 'Hacked', 'RLS blocks contributor update';
  end;
  begin
    insert into public.attars (slug, name) values ('x-x', 'X');
    raise exception 'should have failed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'should have failed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- votes
insert into public.votes (user_id, attar_id, metric, value) values
  (auth.uid(), '30000000-0000-0000-0000-000000000001', 'heat', 4),
  (auth.uid(), '30000000-0000-0000-0000-000000000001', 'longevity', 5);
update public.votes set value = 2 where user_id = auth.uid() and metric = 'heat';

-- suggestion
insert into public.edit_suggestions (id, entity_type, entity_id, proposed, summary, submitted_by) values (
  '40000000-0000-0000-0000-000000000001', 'attar', '30000000-0000-0000-0000-000000000001',
  jsonb_build_object(
    'fields', jsonb_build_object('summary', 'A test summary', 'published', false, 'base_oil', 'Test oil'),
    'notes', jsonb_build_array(
      jsonb_build_object('note_id', '10000000-0000-0000-0000-000000000001', 'position', 'base'),
      jsonb_build_object('note_id', '10000000-0000-0000-0000-000000000002', 'position', 'top')),
    'citations', jsonb_build_array(jsonb_build_object('field_name', 'how_made', 'url', 'https://example.org/a', 'title', 'Ref A')),
    'price_report', jsonb_build_object('price_min_inr', 100, 'price_max_inr', 200, 'volume_ml', 10,
                                       'reported_on', '2026-10-01', 'source_name', 'Test source')
  ),
  'Add summary and notes', auth.uid());

-- contributor cannot approve
do $$ begin
  begin
    perform public.approve_edit_suggestion('40000000-0000-0000-0000-000000000001', null);
    raise exception 'should have failed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- review with a link is held
insert into public.reviews (attar_id, user_id, body, status) values
  ('30000000-0000-0000-0000-000000000001', auth.uid(), 'Lovely and earthy, see www.example.com for more', 'published');
do $$ begin
  assert (select status from public.reviews where user_id = auth.uid()) = 'pending', 'link review held';
end $$;
update public.reviews set body = 'Lovely and earthy, lasted well through a humid afternoon.' where user_id = auth.uid();
do $$ begin
  assert (select status from public.reviews where user_id = auth.uid()) = 'pending', 'author cannot self-publish';
end $$;

-- shelf
insert into public.shelf_items (user_id, attar_id, status) values (auth.uid(), '30000000-0000-0000-0000-000000000001', 'own');

-- ---- act as other user C: cannot see B's votes / shelf
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$ begin
  assert (select count(*) from public.votes) = 0, 'votes private';
  assert (select count(*) from public.shelf_items) = 0, 'shelf private';
  assert (select count(*) from public.edit_suggestions) = 0, 'edits private';
  assert (select vote_avg from public.attar_vote_stats where metric = 'heat') = 2, 'vote aggregate public + updated';
  assert (select vote_count from public.attar_vote_stats where metric = 'longevity') = 1, 'vote count';
end $$;

-- ---- act as admin A
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
update public.reviews set status = 'published';
select public.approve_edit_suggestion('40000000-0000-0000-0000-000000000001', 'Looks good');
do $$ begin
  assert (select summary from public.attars where slug = 'test-khus-attar') = 'A test summary', 'field applied';
  assert (select published from public.attars where slug = 'test-khus-attar'), 'non-whitelisted field ignored';
  assert (select count(*) from public.attar_notes where attar_id = '30000000-0000-0000-0000-000000000001') = 2, 'notes applied';
  assert (select count(*) from public.price_reports) = 1, 'price applied';
  assert not ('how_made' = any(public.missing_citations('attar', '30000000-0000-0000-0000-000000000001'))), 'citation clears flag';
  assert (select changed_by from public.revisions order by id desc limit 1) = '00000000-0000-0000-0000-00000000000b', 'revision credited to contributor';
  assert (select snapshot -> 'notes' from public.revisions order by id desc limit 1) @> '[{"note":"test-rose","position":"top"}]', 'snapshot has notes';
  assert (select status from public.edit_suggestions where id = '40000000-0000-0000-0000-000000000001') = 'approved', 'status approved';
  assert exists (select 1 from public.search_all('rose khus attar')), 'search refreshed with new note';
end $$;

-- new page proposal
insert into public.edit_suggestions (id, entity_type, proposed, summary, submitted_by) values (
  '40000000-0000-0000-0000-000000000002', 'glossary',
  '{"fields": {"slug": "test-term", "term": "Test term", "short_definition": "Def"}}', 'New glossary term', auth.uid());
select public.approve_edit_suggestion('40000000-0000-0000-0000-000000000002', null);
do $$ begin
  assert exists (select 1 from public.glossary where slug = 'test-term'), 'new page created';
  assert (select applied_entity_id from public.edit_suggestions where id = '40000000-0000-0000-0000-000000000002') is not null, 'applied id';
end $$;

-- reports auto-hide at 3 (each reporter files their own report)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
insert into public.review_reports (review_id, reporter_id, reason) select id, auth.uid(), 'spam' from public.reviews;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
insert into public.review_reports (review_id, reporter_id, reason) select id, auth.uid(), 'spam' from public.reviews;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true);
insert into public.review_reports (review_id, reporter_id, reason) select id, auth.uid(), 'abuse' from public.reviews;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
do $$
declare rid uuid := (select id from public.reviews limit 1);
begin
  assert (select status from public.reviews where id = rid) = 'hidden', 'auto hidden';
  perform public.moderate_review(rid, 'published');
  assert (select status from public.reviews where id = rid) = 'published', 'restored';
end $$;

select public.record_view('attar', '30000000-0000-0000-0000-000000000001');
do $$ begin
  assert exists (select 1 from public.data_gaps(30, 10)), 'data gaps';
  assert exists (select 1 from public.citation_gaps(10)), 'citation gaps';
end $$;

-- ---- anonymous
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  assert (select count(*) from public.revisions) > 0, 'anon reads history';
  assert (select count(*) from public.reviews) = 1, 'anon reads published reviews';
  assert (select count(*) from public.page_views) = 0, 'anon cannot read views';
end $$;

reset role;
rollback;
\echo ALL BEHAVIOUR TESTS PASSED
