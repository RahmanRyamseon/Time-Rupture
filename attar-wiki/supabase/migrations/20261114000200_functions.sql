-- Attar Wiki: helper functions, triggers, revisions, edit approval, community aggregates.

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','regions','houses','notes','attars','glossary','guides','reviews','votes'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_set_updated_at', t);
  end loop;
end $$;

-- Role helpers. SECURITY DEFINER so they can read profiles regardless of RLS.
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'reader'::public.user_role)
$$;

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('editor', 'admin')
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'admin'
$$;

-- Create a profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(left(new.raw_user_meta_data ->> 'full_name', 60), ''),
      nullif(left(split_part(coalesce(new.email, ''), '@', 1), 60), ''),
      'Contributor'
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins may change roles (service role bypasses: auth.uid() is null).
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change roles' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Map entity type -> table name
create or replace function public.entity_table(p_type public.entity_type)
returns text language sql immutable as $$
  select case p_type
    when 'attar' then 'attars'
    when 'house' then 'houses'
    when 'note' then 'notes'
    when 'region' then 'regions'
    when 'glossary' then 'glossary'
    when 'guide' then 'guides'
  end
$$;

-- ---------------------------------------------------------------------------
-- Snapshots and revisions
-- ---------------------------------------------------------------------------
create or replace function public.entity_snapshot(p_type public.entity_type, p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  snap jsonb;
begin
  execute format('select to_jsonb(t) from public.%I t where id = $1', public.entity_table(p_type))
    into snap using p_id;
  if snap is null then
    return null;
  end if;
  snap := snap - 'created_at' - 'updated_at';

  if p_type = 'attar' then
    snap := snap
      || jsonb_build_object('notes', coalesce((
          select jsonb_agg(jsonb_build_object('note', n.slug, 'position', an.position) order by an.position, an.sort_order, n.slug)
          from public.attar_notes an join public.notes n on n.id = an.note_id
          where an.attar_id = p_id), '[]'::jsonb))
      || jsonb_build_object('relations', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'relation', r.relation,
                   'attar', a2.slug,
                   'external_name', r.external_name,
                   'note', r.note) order by r.relation, coalesce(a2.slug, r.external_name))
          from public.attar_relations r left join public.attars a2 on a2.id = r.related_attar_id
          where r.attar_id = p_id), '[]'::jsonb))
      || jsonb_build_object('price_reports', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'price_min_inr', p.price_min_inr, 'price_max_inr', p.price_max_inr,
                   'volume_ml', p.volume_ml, 'reported_on', p.reported_on,
                   'source_name', p.source_name, 'source_url', p.source_url) order by p.reported_on desc)
          from public.price_reports p where p.attar_id = p_id), '[]'::jsonb));
  end if;

  snap := snap || jsonb_build_object('citations', coalesce((
      select jsonb_agg(jsonb_build_object('field', c.field_name, 'url', c.url, 'title', c.title,
                                          'publisher', c.publisher, 'accessed_at', c.accessed_at)
                       order by c.field_name, c.sort_order, c.url)
      from public.citations c where c.entity_type = p_type and c.entity_id = p_id), '[]'::jsonb));
  return snap;
end $$;

-- Writes one revision, skipping exact duplicates of the latest snapshot.
create or replace function public.write_revision(p_type public.entity_type, p_id uuid, p_summary text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  snap jsonb;
  last_snap jsonb;
  new_id bigint;
  v_summary text := coalesce(p_summary, nullif(current_setting('app.change_summary', true), ''));
  v_edit uuid := nullif(current_setting('app.edit_suggestion_id', true), '')::uuid;
  v_actor uuid := coalesce(nullif(current_setting('app.actor_id', true), '')::uuid, auth.uid());
begin
  snap := public.entity_snapshot(p_type, p_id);
  if snap is null then
    return null;
  end if;
  select r.snapshot into last_snap from public.revisions r
   where r.entity_type = p_type and r.entity_id = p_id order by r.id desc limit 1;
  if last_snap is not null and last_snap = snap then
    return null;
  end if;
  insert into public.revisions (entity_type, entity_id, snapshot, change_summary, changed_by, edit_suggestion_id)
  values (p_type, p_id, snap, v_summary, v_actor, v_edit)
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.revision_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.write_revision(tg_argv[0]::public.entity_type, new.id, null);
  return null;
end $$;

create trigger attars_revision after insert or update on public.attars
  for each row execute function public.revision_trigger('attar');
create trigger houses_revision after insert or update on public.houses
  for each row execute function public.revision_trigger('house');
create trigger notes_revision after insert or update on public.notes
  for each row execute function public.revision_trigger('note');
create trigger regions_revision after insert or update on public.regions
  for each row execute function public.revision_trigger('region');
create trigger glossary_revision after insert or update on public.glossary
  for each row execute function public.revision_trigger('glossary');
create trigger guides_revision after insert or update on public.guides
  for each row execute function public.revision_trigger('guide');

-- Explicit snapshot (used by the CSV importer after child rows change).
create or replace function public.snapshot_entity(p_type public.entity_type, p_id uuid, p_summary text)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_editor() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return public.write_revision(p_type, p_id, p_summary);
end $$;

-- ---------------------------------------------------------------------------
-- Edit suggestions: whitelisted columns + approval
-- ---------------------------------------------------------------------------
create or replace function public.editable_columns(p_type public.entity_type)
returns text[] language sql immutable as $$
  select case p_type
    when 'attar' then array['slug','name','name_hi','aliases','house_id','attar_type','base_oil','scent_family',
                            'summary','summary_hi','description','how_made','region_id','occasions','launch_year']
    when 'house' then array['slug','name','name_hi','aliases','city','region_id','founded_year','summary','summary_hi',
                            'history','website_url']
    when 'note' then array['slug','name','name_hi','aliases','botanical_name','category','summary','summary_hi',
                           'smell','botany','grown_in']
    when 'region' then array['slug','name','name_hi','aliases','state','country','summary','summary_hi','history',
                             'specialities','latitude','longitude']
    when 'glossary' then array['slug','term','term_hi','aliases','short_definition','short_definition_hi','body']
    when 'guide' then array['slug','title','title_hi','summary','summary_hi','body','author_name']
  end
$$;

-- proposed shape:
-- { "fields": { <column>: <value>, ... },
--   "notes": [ {"note_id": uuid, "position": "top"} ],          (attar only, replaces all)
--   "relations": [ {"related_attar_id": uuid|null, "external_name": text|null, "relation": "similar", "note": text} ],
--   "price_report": { price_min_inr, price_max_inr, volume_ml, reported_on, source_name, source_url, note },
--   "citations": [ {"field_name","url","title","publisher","accessed_at"} ]   (appended) }
create or replace function public.approve_edit_suggestion(p_id uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  s public.edit_suggestions;
  tbl text;
  cols text[];
  fields jsonb;
  filtered jsonb := '{}'::jsonb;
  k text;
  set_list text;
  col_list text;
  target uuid;
  item jsonb;
  pos int := 0;
begin
  if not public.is_editor() and auth.uid() is not null then
    raise exception 'Only editors can approve edits' using errcode = '42501';
  end if;

  select * into s from public.edit_suggestions where id = p_id for update;
  if not found then raise exception 'Edit suggestion not found'; end if;
  if s.status <> 'pending' then raise exception 'Edit suggestion is already %', s.status; end if;

  tbl := public.entity_table(s.entity_type);
  cols := public.editable_columns(s.entity_type);
  fields := coalesce(s.proposed -> 'fields', '{}'::jsonb);

  for k in select jsonb_object_keys(fields) loop
    if k = any(cols) then
      filtered := filtered || jsonb_build_object(k, fields -> k);
    end if;
  end loop;

  perform set_config('app.change_summary', left(s.summary, 500), true);
  perform set_config('app.edit_suggestion_id', s.id::text, true);
  perform set_config('app.actor_id', s.submitted_by::text, true);

  if s.entity_id is null then
    if not (filtered ? 'slug') then raise exception 'A new page needs a slug'; end if;
    select string_agg(format('%I', key), ', '), string_agg(format('r.%I', key), ', ')
      into col_list, set_list
      from jsonb_object_keys(filtered) as key;
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) r returning id',
                   tbl, col_list, set_list, tbl)
      into target using filtered;
  else
    target := s.entity_id;
    if filtered <> '{}'::jsonb then
      select string_agg(format('%I = r.%I', key, key), ', ') into set_list from jsonb_object_keys(filtered) as key;
      execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) r where t.id = $2',
                     tbl, set_list, tbl)
        using filtered, target;
    end if;
  end if;

  if s.entity_type = 'attar' and s.proposed ? 'notes' then
    delete from public.attar_notes where attar_id = target;
    for item in select * from jsonb_array_elements(s.proposed -> 'notes') loop
      pos := pos + 1;
      insert into public.attar_notes (attar_id, note_id, position, sort_order)
      values (target, (item ->> 'note_id')::uuid, (item ->> 'position')::public.note_position, pos)
      on conflict do nothing;
    end loop;
  end if;

  if s.entity_type = 'attar' and s.proposed ? 'relations' then
    delete from public.attar_relations where attar_id = target;
    for item in select * from jsonb_array_elements(s.proposed -> 'relations') loop
      insert into public.attar_relations (attar_id, related_attar_id, external_name, relation, note)
      values (target, nullif(item ->> 'related_attar_id', '')::uuid, nullif(item ->> 'external_name', ''),
              (item ->> 'relation')::public.relation_type, nullif(item ->> 'note', ''))
      on conflict do nothing;
    end loop;
  end if;

  if s.entity_type = 'attar' and jsonb_typeof(s.proposed -> 'price_report') = 'object' then
    item := s.proposed -> 'price_report';
    insert into public.price_reports (attar_id, price_min_inr, price_max_inr, volume_ml, reported_on, source_name, source_url, note)
    values (target, (item ->> 'price_min_inr')::numeric, (item ->> 'price_max_inr')::numeric, (item ->> 'volume_ml')::numeric,
            (item ->> 'reported_on')::date, item ->> 'source_name', nullif(item ->> 'source_url', ''), nullif(item ->> 'note', ''));
  end if;

  if jsonb_typeof(s.proposed -> 'citations') = 'array' then
    for item in select * from jsonb_array_elements(s.proposed -> 'citations') loop
      insert into public.citations (entity_type, entity_id, field_name, url, title, publisher, accessed_at, created_by)
      values (s.entity_type, target, item ->> 'field_name', item ->> 'url', item ->> 'title',
              nullif(item ->> 'publisher', ''), coalesce(nullif(item ->> 'accessed_at', '')::date, current_date), s.submitted_by)
      on conflict (entity_type, entity_id, field_name, url) do nothing;
    end loop;
  end if;

  -- One revision capturing child-row changes too (no-op if identical).
  perform public.write_revision(s.entity_type, target, s.summary);

  update public.edit_suggestions
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note,
         applied_entity_id = target
   where id = p_id;

  return target;
end $$;

create or replace function public.reject_edit_suggestion(p_id uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_editor() then
    raise exception 'Only editors can reject edits' using errcode = '42501';
  end if;
  update public.edit_suggestions
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
   where id = p_id and status = 'pending';
end $$;

-- ---------------------------------------------------------------------------
-- Votes -> aggregates
-- ---------------------------------------------------------------------------
create or replace function public.refresh_vote_stats(p_attar uuid, p_metric public.vote_metric)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.attar_vote_stats (attar_id, metric, vote_count, vote_avg, distribution, updated_at)
  select p_attar, p_metric, count(*), round(avg(value)::numeric, 2),
         array[count(*) filter (where value = 1), count(*) filter (where value = 2), count(*) filter (where value = 3),
               count(*) filter (where value = 4), count(*) filter (where value = 5)]::int[],
         now()
    from public.votes where attar_id = p_attar and metric = p_metric
  on conflict (attar_id, metric) do update
    set vote_count = excluded.vote_count, vote_avg = excluded.vote_avg,
        distribution = excluded.distribution, updated_at = now();
end $$;

create or replace function public.votes_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_vote_stats(new.attar_id, new.metric);
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    perform public.refresh_vote_stats(old.attar_id, old.metric);
  end if;
  return null;
end $$;

create trigger votes_stats after insert or update or delete on public.votes
  for each row execute function public.votes_after_change();

-- ---------------------------------------------------------------------------
-- Reviews moderation
-- ---------------------------------------------------------------------------
create or replace function public.reviews_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.report_count := 0;
    if public.is_editor() then
      null; -- editors may set status freely
    elsif new.body ~* '(https?://|www\.)' then
      new.status := 'pending';
    else
      new.status := 'published';
    end if;
  elsif tg_op = 'UPDATE' and pg_trigger_depth() = 1 and not public.is_editor() and auth.uid() is not null then
    -- authors may edit text, never status/counters; an edit re-checks links
    new.report_count := old.report_count;
    new.status := case
      when old.status = 'hidden' then 'hidden'::public.review_status
      when new.body ~* '(https?://|www\.)' then 'pending'::public.review_status
      else old.status end;
    new.user_id := old.user_id;
    new.attar_id := old.attar_id;
  end if;
  return new;
end $$;

create trigger reviews_guard before insert or update on public.reviews
  for each row execute function public.reviews_before_write();

create or replace function public.review_reports_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.review_reports where review_id = new.review_id and not resolved;
  update public.reviews
     set report_count = n,
         status = case when n >= 3 and status = 'published' then 'hidden'::public.review_status else status end
   where id = new.review_id;
  return null;
end $$;

create trigger review_reports_count after insert on public.review_reports
  for each row execute function public.review_reports_after_insert();

create or replace function public.moderate_review(p_id uuid, p_status public.review_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_editor() then
    raise exception 'Only editors can moderate reviews' using errcode = '42501';
  end if;
  update public.reviews set status = p_status, report_count = 0 where id = p_id;
  update public.review_reports set resolved = true where review_id = p_id;
end $$;

-- ---------------------------------------------------------------------------
-- Page views (anonymous, aggregated per day)
-- ---------------------------------------------------------------------------
create or replace function public.record_view(p_type public.entity_type, p_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.page_views (entity_type, entity_id, day, views)
  values (p_type, p_id, current_date, 1)
  on conflict (entity_type, entity_id, day) do update set views = public.page_views.views + 1;
$$;

-- ---------------------------------------------------------------------------
-- Citation gaps: documented fields with a value but no citation for that field
-- ---------------------------------------------------------------------------
create or replace function public.citable_fields(p_type public.entity_type)
returns text[] language sql immutable as $$
  select case p_type
    when 'attar' then array['attar_type','base_oil','description','how_made','region_id','house_id','launch_year']
    when 'house' then array['city','founded_year','history','website_url']
    when 'note' then array['botanical_name','smell','botany','grown_in']
    when 'region' then array['history','specialities']
    when 'glossary' then array['short_definition','body']
    when 'guide' then array['body']
  end
$$;

create or replace function public.missing_citations(p_type public.entity_type, p_id uuid)
returns text[] language plpgsql stable security definer set search_path = public as $$
declare
  row_json jsonb;
  f text;
  result text[] := '{}';
begin
  execute format('select to_jsonb(t) from public.%I t where id = $1', public.entity_table(p_type)) into row_json using p_id;
  if row_json is null then return result; end if;
  foreach f in array public.citable_fields(p_type) loop
    if row_json ? f and row_json -> f <> 'null'::jsonb and coalesce(row_json ->> f, '') <> ''
       and not exists (select 1 from public.citations c
                        where c.entity_type = p_type and c.entity_id = p_id and c.field_name = f) then
      result := result || f;
    end if;
  end loop;
  if p_type = 'attar' and exists (select 1 from public.attar_notes where attar_id = p_id)
     and not exists (select 1 from public.citations c where c.entity_type = 'attar' and c.entity_id = p_id and c.field_name = 'notes') then
    result := result || 'notes'::text;
  end if;
  return result;
end $$;

create or replace function public.citation_gaps(p_limit int default 200)
returns table (entity_type public.entity_type, entity_id uuid, slug text, title text, fields text[])
language sql stable security definer set search_path = public as $$
  select d.entity_type, d.entity_id, d.slug, d.title, public.missing_citations(d.entity_type, d.entity_id)
    from public.search_documents d
   where cardinality(public.missing_citations(d.entity_type, d.entity_id)) > 0
   order by d.updated_at desc
   limit p_limit
$$;

-- Most-viewed pages lacking data in the last N days.
create or replace function public.data_gaps(p_days int default 30, p_limit int default 50)
returns table (entity_type public.entity_type, entity_id uuid, slug text, title text, views bigint, missing text[])
language plpgsql stable security definer set search_path = public as $$
begin
  return query
  with v as (
    select pv.entity_type, pv.entity_id, sum(pv.views)::bigint as views
      from public.page_views pv
     where pv.day >= current_date - p_days
     group by 1, 2
  ), m as (
    select v.entity_type, v.entity_id, v.views, d.slug, d.title,
           (select coalesce(array_agg(key order by key), '{}')
              from jsonb_each(public.entity_snapshot(v.entity_type, v.entity_id)) e(key, value)
             where key = any(public.editable_columns(v.entity_type))
               and key not like '%\_hi'
               and (value = 'null'::jsonb or value = '""'::jsonb or value = '[]'::jsonb)) as missing
      from v join public.search_documents d on d.entity_type = v.entity_type and d.entity_id = v.entity_id
  )
  select m.entity_type, m.entity_id, m.slug, m.title, m.views,
         case when m.entity_type = 'attar'
                   and not exists (select 1 from public.attar_notes an where an.attar_id = m.entity_id)
              then m.missing || 'notes'::text else m.missing end
    from m
   where cardinality(m.missing) > 0
      or (m.entity_type = 'attar' and not exists (select 1 from public.attar_notes an where an.attar_id = m.entity_id))
   order by m.views desc
   limit p_limit;
end $$;
