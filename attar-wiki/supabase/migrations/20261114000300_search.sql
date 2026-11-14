-- Attar Wiki: search (full-text + trigram) across all content types.

-- Spelling variants of the generic word "attar" and of common transliterations.
-- These are search plumbing only (no content claims).
insert into public.search_synonyms (variant, canonical) values
  ('itr', 'attar'), ('ittar', 'attar'), ('ittr', 'attar'), ('itar', 'attar'), ('atar', 'attar'),
  ('attars', 'attar'), ('itrs', 'attar'), ('ittars', 'attar'), ('attaar', 'attar'), ('itter', 'attar'),
  ('इत्र', 'attar'), ('अत्तर', 'attar'), ('अतर', 'attar'), ('इतर', 'attar'),
  ('oudh', 'oud'), ('ood', 'oud'), ('oodh', 'oud'), ('aoud', 'oud'), ('agarwood', 'oud'), ('ऊद', 'oud'),
  ('ruh', 'ruh'), ('rooh', 'ruh'), ('रूह', 'ruh'),
  ('kevda', 'kewda'), ('kewra', 'kewda'), ('keora', 'kewda'), ('kevra', 'kewda'), ('केवड़ा', 'kewda'), ('केवडा', 'kewda'),
  ('khas', 'khus'), ('khuss', 'khus'), ('खस', 'khus'),
  ('mitti', 'mitti'), ('mitty', 'mitti'), ('मिट्टी', 'mitti'),
  ('heena', 'hina'), ('henna', 'hina'), ('हिना', 'hina'),
  ('gulaab', 'gulab'), ('गुलाब', 'gulab'),
  ('chandan', 'chandan'), ('चंदन', 'chandan'), ('चन्दन', 'chandan'),
  ('shamama', 'shamama'), ('shamamah', 'shamama'), ('शमामा', 'shamama'),
  ('majmua', 'majmua'), ('majmooa', 'majmua'), ('majmuaa', 'majmua'), ('मजमुआ', 'majmua'),
  ('kannauj', 'kannauj'), ('kanauj', 'kannauj'), ('kannoj', 'kannauj'), ('कन्नौज', 'kannauj'),
  ('deg bhapka', 'deg-bhapka'), ('degbhapka', 'deg-bhapka'), ('deg-bapka', 'deg-bhapka'), ('डेग भपका', 'deg-bhapka')
on conflict (variant) do nothing;

-- Lower-case, strip accents and punctuation, and map known variants token by token.
create or replace function public.normalize_search_text(p text)
returns text language plpgsql stable set search_path = public, extensions as $$
declare
  t text;
  token text;
  mapped text;
  out_tokens text[] := '{}';
begin
  if p is null then return ''; end if;
  t := lower(extensions.unaccent(p));
  -- multi-word variants first
  for token, mapped in select s.variant, s.canonical from public.search_synonyms s where s.variant like '% %' loop
    t := replace(t, token, mapped);
  end loop;
  t := regexp_replace(t, '[^[:alnum:]ऀ-ॿ\s-]+', ' ', 'g');
  foreach token in array regexp_split_to_array(btrim(t), '\s+') loop
    if token = '' then continue; end if;
    select s.canonical into mapped from public.search_synonyms s where s.variant = token;
    out_tokens := out_tokens || coalesce(mapped, token);
    if mapped is not null and mapped <> token then
      out_tokens := out_tokens || token; -- keep original token too
    end if;
  end loop;
  return array_to_string(out_tokens, ' ');
end $$;

-- Upsert one search document.
create or replace function public.upsert_search_document(
  p_type public.entity_type, p_id uuid, p_slug text, p_title text, p_title_hi text,
  p_subtitle text, p_aliases text[], p_body text, p_published boolean
) returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  hay text;
begin
  hay := public.normalize_search_text(concat_ws(' ', p_title, p_title_hi, array_to_string(p_aliases, ' ')));
  insert into public.search_documents (entity_type, entity_id, slug, title, title_hi, subtitle, haystack, doc, published, updated_at)
  values (
    p_type, p_id, p_slug, p_title, p_title_hi, p_subtitle, hay,
    setweight(to_tsvector('simple', hay), 'A')
      || setweight(to_tsvector('simple', public.normalize_search_text(coalesce(p_subtitle, ''))), 'B')
      || setweight(to_tsvector('simple', public.normalize_search_text(left(coalesce(p_body, ''), 20000))), 'C'),
    p_published, now()
  )
  on conflict (entity_type, entity_id) do update
    set slug = excluded.slug, title = excluded.title, title_hi = excluded.title_hi, subtitle = excluded.subtitle,
        haystack = excluded.haystack, doc = excluded.doc, published = excluded.published, updated_at = now();
end $$;

create or replace function public.search_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_type public.entity_type := tg_argv[0]::public.entity_type;
  house_name text;
  region_name text;
  note_names text;
begin
  if tg_op = 'DELETE' then
    delete from public.search_documents where entity_type = v_type and entity_id = old.id;
    return null;
  end if;

  if v_type = 'attar' then
    select h.name into house_name from public.houses h where h.id = new.house_id;
    select string_agg(n.name || ' ' || coalesce(n.name_hi, '') || ' ' || array_to_string(n.aliases, ' '), ' ')
      into note_names
      from public.attar_notes an join public.notes n on n.id = an.note_id where an.attar_id = new.id;
    perform public.upsert_search_document('attar', new.id, new.slug, new.name, new.name_hi,
      concat_ws(' · ', house_name, new.scent_family),
      new.aliases, concat_ws(' ', new.summary, new.base_oil, new.scent_family, house_name, note_names,
                             array_to_string(new.occasions, ' '), new.description), new.published);
  elsif v_type = 'house' then
    select r.name into region_name from public.regions r where r.id = new.region_id;
    perform public.upsert_search_document('house', new.id, new.slug, new.name, new.name_hi,
      concat_ws(' · ', new.city, region_name), new.aliases, concat_ws(' ', new.summary, new.city, region_name, new.history), new.published);
  elsif v_type = 'note' then
    perform public.upsert_search_document('note', new.id, new.slug, new.name, new.name_hi,
      concat_ws(' · ', new.botanical_name, new.category), new.aliases,
      concat_ws(' ', new.summary, new.smell, new.botanical_name, new.category, new.grown_in), new.published);
  elsif v_type = 'region' then
    perform public.upsert_search_document('region', new.id, new.slug, new.name, new.name_hi,
      concat_ws(', ', new.state, new.country), new.aliases, concat_ws(' ', new.summary, new.history, new.specialities), new.published);
  elsif v_type = 'glossary' then
    perform public.upsert_search_document('glossary', new.id, new.slug, new.term, new.term_hi,
      left(new.short_definition, 160), new.aliases, concat_ws(' ', new.short_definition, new.body), new.published);
  elsif v_type = 'guide' then
    perform public.upsert_search_document('guide', new.id, new.slug, new.title, new.title_hi,
      left(new.summary, 160), '{}', concat_ws(' ', new.summary, new.body), new.published);
  end if;
  return null;
end $$;

create trigger attars_search after insert or update or delete on public.attars
  for each row execute function public.search_sync('attar');
create trigger houses_search after insert or update or delete on public.houses
  for each row execute function public.search_sync('house');
create trigger notes_search after insert or update or delete on public.notes
  for each row execute function public.search_sync('note');
create trigger regions_search after insert or update or delete on public.regions
  for each row execute function public.search_sync('region');
create trigger glossary_search after insert or update or delete on public.glossary
  for each row execute function public.search_sync('glossary');
create trigger guides_search after insert or update or delete on public.guides
  for each row execute function public.search_sync('guide');

-- When an attar's notes change, refresh its search document (touch without new revision).
create or replace function public.attar_notes_search_refresh()
returns trigger language plpgsql security definer set search_path = public as $$
declare a public.attars;
begin
  select * into a from public.attars where id = coalesce(new.attar_id, old.attar_id);
  if found then
    -- re-run search sync logic directly
    perform public.upsert_search_document('attar', a.id, a.slug, a.name, a.name_hi,
      concat_ws(' · ', (select h.name from public.houses h where h.id = a.house_id), a.scent_family),
      a.aliases,
      concat_ws(' ', a.summary, a.base_oil, a.scent_family,
        (select h.name from public.houses h where h.id = a.house_id),
        (select string_agg(n.name || ' ' || coalesce(n.name_hi, '') || ' ' || array_to_string(n.aliases, ' '), ' ')
           from public.attar_notes an join public.notes n on n.id = an.note_id where an.attar_id = a.id),
        array_to_string(a.occasions, ' '), a.description),
      a.published);
  end if;
  return null;
end $$;

create trigger attar_notes_search after insert or delete on public.attar_notes
  for each row execute function public.attar_notes_search_refresh();

create index search_documents_doc_idx on public.search_documents using gin (doc);
create index search_documents_trgm_idx on public.search_documents using gin (haystack extensions.gin_trgm_ops);

-- Main search entry point. Typo tolerant via trigram word similarity.
create or replace function public.search_all(p_query text, p_types public.entity_type[] default null, p_limit int default 20)
returns table (
  entity_type public.entity_type, entity_id uuid, slug text, title text, title_hi text, subtitle text, score real
) language plpgsql stable security definer set search_path = public, extensions as $$
declare
  q text := public.normalize_search_text(p_query);
  tsq tsquery;
begin
  if q is null or btrim(q) = '' then
    return;
  end if;
  -- prefix match each token: "kew" finds "kewda"
  select to_tsquery('simple', string_agg(quote_literal(tok) || ':*', ' & '))
    into tsq
    from unnest(regexp_split_to_array(btrim(q), '\s+')) tok where tok <> '';

  perform set_config('pg_trgm.word_similarity_threshold', '0.4', true);

  return query
  select d.entity_type, d.entity_id, d.slug, d.title, d.title_hi, d.subtitle,
         (greatest(ts_rank_cd(d.doc, tsq) * 2, extensions.word_similarity(q, d.haystack))
           + case when d.haystack = q then 1 else 0 end
           + case when d.entity_type = 'attar' then 0.05 else 0 end)::real as score
    from public.search_documents d
   where d.published
     and (p_types is null or d.entity_type = any(p_types))
     and (d.doc @@ tsq or q operator(extensions.<%) d.haystack)
   order by score desc, d.title
   limit least(greatest(p_limit, 1), 50);
end $$;
