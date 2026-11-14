-- Revision mechanics: snapshot of the published version, diff trigger, moderation RPCs, content export.

-- Published snapshot of an entity as a flat jsonb (same keys as src/lib/snapshot.ts).
create or replace function public.entity_snapshot(etype text, eid text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  case etype
    when 'product' then select jsonb_build_object(
        'name_ar', name_ar, 'name_en', name_en, 'description_ar', description_ar, 'description_en', description_en,
        'origins', array_to_string(origins, '|'), 'wild_status', wild_status,
        'notes_top', array_to_string(notes_top, '|'), 'notes_heart', array_to_string(notes_heart, '|'), 'notes_base', array_to_string(notes_base, '|'),
        'occasions', array_to_string(occasions, '|'), 'seasons', array_to_string(seasons, '|'),
        'size_value', coalesce(size_value::text, ''), 'size_unit', size_unit, 'official_url', official_url) into r from products where id = eid;
    when 'house' then select jsonb_build_object(
        'name_ar', name_ar, 'name_en', name_en, 'history_ar', history_ar, 'history_en', history_en, 'country_ar', country_ar, 'country_en', country_en,
        'city_ar', city_ar, 'city_en', city_en, 'founded_year', coalesce(founded_year::text, ''), 'founder_ar', founder_ar, 'founder_en', founder_en,
        'official_website', official_website) into r from houses where id = eid;
    when 'origin' then select jsonb_build_object(
        'name_ar', name_ar, 'name_en', name_en, 'region_ar', region_ar, 'region_en', region_en, 'species', species,
        'profile_ar', profile_ar, 'profile_en', profile_en, 'smell_ar', smell_ar, 'smell_en', smell_en,
        'grading_ar', grading_ar, 'grading_en', grading_en, 'uses_ar', uses_ar, 'uses_en', uses_en) into r from origins where id = eid;
    when 'note' then select jsonb_build_object('name_ar', name_ar, 'name_en', name_en, 'family', family, 'description_ar', description_ar, 'description_en', description_en) into r from notes where id = eid;
    else select jsonb_build_object('title_ar', title_ar, 'title_en', title_en, 'summary_ar', summary_ar, 'summary_en', summary_en, 'body_ar', body_ar, 'body_en', body_en) into r from articles where id = eid and kind = etype;
  end case;
  return coalesce(r, '{}'::jsonb);
end $$;

-- Compute the field-level diff on insert; never trust a client-supplied diff.
create or replace function public.revisions_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare before jsonb;
begin
  new.author_id := coalesce(new.author_id, auth.uid());
  if new.op <> 'seed' then
    new.status := 'pending';
    new.reviewed_by := null; new.reviewed_at := null;
  end if;
  before := case when new.entity_id is null then '{}'::jsonb else public.entity_snapshot(new.entity_type, new.entity_id) end;
  select coalesce(jsonb_agg(jsonb_build_object('field', k, 'before', coalesce(before ->> k, ''), 'after', coalesce(new.snapshot ->> k, ''))), '[]'::jsonb)
    into new.diff
  from (select jsonb_object_keys(before || new.snapshot) k) keys
  where coalesce(before ->> k, '') is distinct from coalesce(new.snapshot ->> k, '');
  return new;
end $$;
create trigger revisions_diff before insert on public.revisions for each row execute function public.revisions_before_insert();

-- Apply an approved snapshot to its entity table.
create or replace function public.apply_snapshot(etype text, eid text, s jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare arr text[]; old_ar text; old_en text;
begin
  case etype
    when 'product' then
      select slug_ar, slug_en into old_ar, old_en from products where id = eid;
      update products set
        name_ar = coalesce(s->>'name_ar', name_ar), name_en = coalesce(s->>'name_en', name_en),
        description_ar = coalesce(s->>'description_ar', description_ar), description_en = coalesce(s->>'description_en', description_en),
        origins = coalesce(string_to_array(nullif(s->>'origins', ''), '|'), case when s ? 'origins' then '{}' else origins end),
        wild_status = coalesce(nullif(s->>'wild_status', ''), wild_status),
        notes_top = coalesce(string_to_array(nullif(s->>'notes_top', ''), '|'), case when s ? 'notes_top' then '{}' else notes_top end),
        notes_heart = coalesce(string_to_array(nullif(s->>'notes_heart', ''), '|'), case when s ? 'notes_heart' then '{}' else notes_heart end),
        notes_base = coalesce(string_to_array(nullif(s->>'notes_base', ''), '|'), case when s ? 'notes_base' then '{}' else notes_base end),
        occasions = coalesce(string_to_array(nullif(s->>'occasions', ''), '|'), case when s ? 'occasions' then '{}' else occasions end),
        seasons = coalesce(string_to_array(nullif(s->>'seasons', ''), '|'), case when s ? 'seasons' then '{}' else seasons end),
        size_value = case when s ? 'size_value' then nullif(s->>'size_value', '')::numeric else size_value end,
        size_unit = coalesce(s->>'size_unit', size_unit), official_url = coalesce(s->>'official_url', official_url),
        updated_at = now()
      where id = eid;
    when 'house' then
      update houses set
        name_ar = coalesce(s->>'name_ar', name_ar), name_en = coalesce(s->>'name_en', name_en),
        history_ar = coalesce(s->>'history_ar', history_ar), history_en = coalesce(s->>'history_en', history_en),
        country_ar = coalesce(s->>'country_ar', country_ar), country_en = coalesce(s->>'country_en', country_en),
        city_ar = coalesce(s->>'city_ar', city_ar), city_en = coalesce(s->>'city_en', city_en),
        founded_year = case when s ? 'founded_year' then nullif(s->>'founded_year', '')::int else founded_year end,
        founder_ar = coalesce(s->>'founder_ar', founder_ar), founder_en = coalesce(s->>'founder_en', founder_en),
        official_website = coalesce(s->>'official_website', official_website), updated_at = now()
      where id = eid;
    when 'origin' then
      update origins set
        name_ar = coalesce(s->>'name_ar', name_ar), name_en = coalesce(s->>'name_en', name_en),
        region_ar = coalesce(s->>'region_ar', region_ar), region_en = coalesce(s->>'region_en', region_en), species = coalesce(s->>'species', species),
        profile_ar = coalesce(s->>'profile_ar', profile_ar), profile_en = coalesce(s->>'profile_en', profile_en),
        smell_ar = coalesce(s->>'smell_ar', smell_ar), smell_en = coalesce(s->>'smell_en', smell_en),
        grading_ar = coalesce(s->>'grading_ar', grading_ar), grading_en = coalesce(s->>'grading_en', grading_en),
        uses_ar = coalesce(s->>'uses_ar', uses_ar), uses_en = coalesce(s->>'uses_en', uses_en), updated_at = now()
      where id = eid;
    when 'note' then
      update notes set name_ar = coalesce(s->>'name_ar', name_ar), name_en = coalesce(s->>'name_en', name_en), family = coalesce(s->>'family', family),
        description_ar = coalesce(s->>'description_ar', description_ar), description_en = coalesce(s->>'description_en', description_en), updated_at = now()
      where id = eid;
    else
      update articles set title_ar = coalesce(s->>'title_ar', title_ar), title_en = coalesce(s->>'title_en', title_en),
        summary_ar = coalesce(s->>'summary_ar', summary_ar), summary_en = coalesce(s->>'summary_en', summary_en),
        body_ar = coalesce(s->>'body_ar', body_ar), body_en = coalesce(s->>'body_en', body_en), updated = current_date
      where id = eid and kind = etype;
  end case;
end $$;

-- Editors/admins approve or reject. Approval applies the snapshot and stores each new citation URL.
create or replace function public.moderate_revision(rev_id bigint, approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r public.revisions; c jsonb; cid text;
begin
  if not public.current_role_is(array['editor', 'admin']::public.user_role[]) then raise exception 'forbidden'; end if;
  select * into r from public.revisions where id = rev_id and status = 'pending' for update;
  if not found then raise exception 'revision not pending'; end if;
  if approve then
    if r.entity_id is null then raise exception 'new entries must be created by an editor from the proposal'; end if;
    perform public.apply_snapshot(r.entity_type, r.entity_id, r.snapshot);
    for c in select * from jsonb_array_elements(r.citations) loop
      cid := 'rev-' || r.id || '-' || (c->>'field');
      insert into public.citations (id, url, title, publisher, accessed) values (cid, c->>'url', c->>'url', '', current_date) on conflict do nothing;
      delete from public.entity_citations where entity_type = r.entity_type and entity_id = r.entity_id and field = c->>'field';
      insert into public.entity_citations values (r.entity_type, r.entity_id, c->>'field', cid) on conflict do nothing;
    end loop;
  end if;
  update public.revisions set status = case when approve then 'approved'::public.moderation_status else 'rejected'::public.moderation_status end,
    reviewed_by = auth.uid(), reviewed_at = now() where id = rev_id;
end $$;

create or replace function public.moderate_media(media_id bigint, approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.current_role_is(array['editor', 'admin']::public.user_role[]) then raise exception 'forbidden'; end if;
  update public.media set status = case when approve then 'approved'::public.moderation_status else 'rejected'::public.moderation_status end, reviewed_by = auth.uid() where id = media_id;
end $$;

-- Keep old slugs for redirects whenever a slug changes.
create or replace function public.track_slug_change() returns trigger language plpgsql as $$
begin
  if new.slug_ar is distinct from old.slug_ar then insert into public.slug_history values (tg_argv[0], 'ar', old.slug_ar, old.id, now()) on conflict do nothing; end if;
  if new.slug_en is distinct from old.slug_en then insert into public.slug_history values (tg_argv[0], 'en', old.slug_en, old.id, now()) on conflict do nothing; end if;
  return new;
end $$;
create trigger products_slugs after update on public.products for each row execute function public.track_slug_change('product');
create trigger houses_slugs after update on public.houses for each row execute function public.track_slug_change('house');
create trigger origins_slugs after update on public.origins for each row execute function public.track_slug_change('origin');
create trigger notes_slugs after update on public.notes for each row execute function public.track_slug_change('note');

-- Export approved content in the exact shape of src/generated/content.json (CONTENT_SOURCE=supabase).
create or replace function public.export_content() returns jsonb
language sql stable security definer set search_path = public as $$
  with fc as (
    select entity_type, entity_id, jsonb_object_agg(field, ids) cites from (
      select entity_type, entity_id, field, jsonb_agg(citation_id order by citation_id) ids from entity_citations group by 1, 2, 3) x group by 1, 2
  ),
  refs as (select r, case when position('@' in r) > 0 then jsonb_build_object('note', split_part(r, '@', 1), 'origin', split_part(r, '@', 2)) else jsonb_build_object('note', r) end j from (select distinct unnest(notes_top || notes_heart || notes_base) r from products) z)
  select jsonb_build_object(
    'generatedAt', now(),
    'citations', (select coalesce(jsonb_object_agg(id, to_jsonb(c)), '{}') from citations c),
    'taxonomy', (select coalesce(jsonb_object_agg(type, items), '{}') from (select type, jsonb_agg(jsonb_build_object('id', id, 'name', jsonb_build_object('ar', name_ar, 'en', name_en), 'order', sort_order) order by sort_order) items from taxonomy group by type) t),
    'houses', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'slug', jsonb_build_object('ar', slug_ar, 'en', slug_en), 'name', jsonb_build_object('ar', name_ar, 'en', name_en),
        'country', jsonb_build_object('ar', country_ar, 'en', country_en), 'city', jsonb_build_object('ar', city_ar, 'en', city_en), 'foundedYear', founded_year,
        'founder', jsonb_build_object('ar', founder_ar, 'en', founder_en), 'history', jsonb_build_object('ar', history_ar, 'en', history_en), 'officialWebsite', official_website,
        'citations', coalesce(fc.cites, '{}')) order by h.id), '[]') from houses h left join fc on fc.entity_type = 'house' and fc.entity_id = h.id),
    'origins', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'slug', jsonb_build_object('ar', slug_ar, 'en', slug_en), 'name', jsonb_build_object('ar', name_ar, 'en', name_en),
        'region', jsonb_build_object('ar', region_ar, 'en', region_en), 'species', species, 'profile', jsonb_build_object('ar', profile_ar, 'en', profile_en),
        'smell', jsonb_build_object('ar', smell_ar, 'en', smell_en), 'grading', jsonb_build_object('ar', grading_ar, 'en', grading_en), 'uses', jsonb_build_object('ar', uses_ar, 'en', uses_en),
        'citations', coalesce(fc.cites, '{}')) order by o.id), '[]') from origins o left join fc on fc.entity_type = 'origin' and fc.entity_id = o.id),
    'notes', (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'slug', jsonb_build_object('ar', slug_ar, 'en', slug_en), 'name', jsonb_build_object('ar', name_ar, 'en', name_en),
        'family', family, 'description', jsonb_build_object('ar', description_ar, 'en', description_en), 'citations', coalesce(fc.cites, '{}')) order by n.id), '[]') from notes n left join fc on fc.entity_type = 'note' and fc.entity_id = n.id),
    'products', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'slug', jsonb_build_object('ar', slug_ar, 'en', slug_en), 'name', jsonb_build_object('ar', name_ar, 'en', name_en),
        'houseId', house_id, 'category', category, 'origins', to_jsonb(origins), 'wildStatus', wild_status,
        'notes', jsonb_build_object(
          'top', (select coalesce(jsonb_agg(refs.j), '[]') from unnest(p.notes_top) u join refs on refs.r = u),
          'heart', (select coalesce(jsonb_agg(refs.j), '[]') from unnest(p.notes_heart) u join refs on refs.r = u),
          'base', (select coalesce(jsonb_agg(refs.j), '[]') from unnest(p.notes_base) u join refs on refs.r = u)),
        'description', jsonb_build_object('ar', description_ar, 'en', description_en), 'occasions', to_jsonb(occasions), 'seasons', to_jsonb(seasons),
        'size', jsonb_build_object('value', size_value, 'unit', size_unit, 'note', jsonb_build_object('ar', size_note_ar, 'en', size_note_en)), 'officialUrl', official_url,
        'prices', (select coalesce(jsonb_agg(jsonb_build_object('min', price_min, 'max', price_max, 'currency', currency, 'sizeText', jsonb_build_object('ar', size_text_ar, 'en', size_text_en),
            'observedOn', observed_on, 'citationId', citation_id, 'note', jsonb_build_object('ar', note_ar, 'en', note_en)) order by observed_on desc), '[]') from prices pr where pr.product_id = p.id),
        'citations', coalesce(fc.cites, '{}')) order by p.id), '[]') from products p left join fc on fc.entity_type = 'product' and fc.entity_id = p.id),
    'articles', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'kind', kind, 'slug', jsonb_build_object('ar', slug_ar, 'en', slug_en), 'title', jsonb_build_object('ar', title_ar, 'en', title_en),
        'summary', jsonb_build_object('ar', summary_ar, 'en', summary_en), 'body', jsonb_build_object('ar', body_ar, 'en', body_en),
        'citations', (select coalesce(jsonb_agg(distinct m[1]), '[]') from regexp_matches(a.body_ar || a.body_en, '\{\{cite:([\w-]+)\}\}', 'g') m), 'updated', updated) order by a.id), '[]') from articles a)
  )
$$;
