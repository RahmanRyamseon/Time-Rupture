-- Arabic normalisation mirrored from src/lib/normalize.ts: removes diacritics/tatweel, folds
-- alef forms, taa marbuta, alif maqsura, hamza carriers and Arabic-Indic digits, then strips
-- clitics (ال، بال، وال…) so «البخور» and «بخور» meet, as stemToken() does.
create or replace function public.normalize_ar(input text) returns text
language sql immutable parallel safe as $$
  select trim(regexp_replace(
    ' ' || trim(regexp_replace(
      translate(
        regexp_replace(lower(coalesce(input, '')), '[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]', '', 'g'),
        'إأآٱةىؤئ٠١٢٣٤٥٦٧٨٩',
        'ااااهيوي0123456789'
      ),
      '[^[:alnum:]؀-ۿ]+', ' ', 'g')),
    ' (وال|بال|كال|فال|لل|ال)([^ ]{2,})', ' \2', 'g'))
$$;

-- array_to_string is only STABLE; this wrapper is safe for text[] and allows generated columns.
create or replace function public.join_tags(a text[]) returns text
language sql immutable parallel safe as $$ select coalesce(array_to_string(a, ' '), '') $$;

create table public.search_synonyms (
  term text primary key,     -- normalised
  canonical text not null    -- normalised Arabic canonical form
);
insert into public.search_synonyms (term, canonical) values
  ('oud','عود'),('oudh','عود'),('ood','عود'),('aoud','عود'),('oodh','عود'),('agarwood','عود'),
  ('dehn','دهن'),('dahn','دهن'),('dhn','دهن'),('dhan','دهن'),('dehnal','دهن'),
  ('bakhoor','بخور'),('bukhoor','بخور'),('bakhour','بخور'),('bakhur','بخور'),('bukhur','بخور'),
  ('mukhallat','مخلط'),('mukhalat','مخلط'),('musk','مسك'),('misk','مسك'),('rose','ورد'),('ward','ورد'),
  ('taif','طايف'),('cambodi','كمبودي'),('cambodian','كمبودي'),('combodi','كمبودي'),('hindi','هندي'),('indian','هندي'),
  ('malaysian','ماليزي'),('thai','تايلندي'),('indonesian','اندونيسي'),('kalimantan','اندونيسي'),
  ('amber','عنبر'),('saffron','زعفران'),('sandalwood','صندل'),('tola','توله'),('ateeq','عتيق')
on conflict do nothing;

create or replace function public.expand_query(q text) returns text
language sql stable as $$
  -- Each token becomes a prefix group of itself plus every synonym sharing its canonical form.
  select string_agg(grp, ' & ')
  from (
    select '(' || string_agg(distinct term || ':*', ' | ') || ')' as grp
    from (
      select t.n, t.tok as term from unnest(string_to_array(public.normalize_ar(q), ' ')) with ordinality as t(tok, n) where t.tok <> ''
      union
      select t.n, x.term from unnest(string_to_array(public.normalize_ar(q), ' ')) with ordinality as t(tok, n)
        join public.search_synonyms s on s.term = t.tok or s.canonical = t.tok
        join lateral (select s.canonical as term union select s2.term from public.search_synonyms s2 where s2.canonical = s.canonical) x on true
    ) terms
    group by n
  ) groups
$$;

alter table public.products add column search_text text generated always as
  (public.normalize_ar(name_ar || ' ' || name_en || ' ' || description_ar || ' ' || description_en || ' ' || public.join_tags(origins))) stored;
alter table public.houses add column search_text text generated always as
  (public.normalize_ar(name_ar || ' ' || name_en || ' ' || history_ar || ' ' || history_en || ' ' || country_ar || ' ' || country_en)) stored;
alter table public.origins add column search_text text generated always as
  (public.normalize_ar(name_ar || ' ' || name_en || ' ' || region_ar || ' ' || region_en || ' ' || smell_ar || ' ' || smell_en)) stored;
alter table public.notes add column search_text text generated always as
  (public.normalize_ar(name_ar || ' ' || name_en || ' ' || description_ar || ' ' || description_en)) stored;
alter table public.articles add column search_text text generated always as
  (public.normalize_ar(title_ar || ' ' || title_en || ' ' || summary_ar || ' ' || summary_en || ' ' || body_ar || ' ' || body_en)) stored;

create index products_search_trgm on public.products using gin (search_text gin_trgm_ops);
create index houses_search_trgm on public.houses using gin (search_text gin_trgm_ops);
create index origins_search_trgm on public.origins using gin (search_text gin_trgm_ops);
create index notes_search_trgm on public.notes using gin (search_text gin_trgm_ops);
create index articles_search_trgm on public.articles using gin (search_text gin_trgm_ops);
create index products_search_fts on public.products using gin (to_tsvector('simple', search_text));
create index articles_search_fts on public.articles using gin (to_tsvector('simple', search_text));

-- Full-text first (with synonyms and prefix matching), trigram similarity as the typo-tolerant fallback.
create or replace function public.search_entities(q text, max_results int default 30)
returns table (kind text, id text, title_ar text, title_en text, slug_ar text, slug_en text, score real)
language sql stable as $$
  with query as (
    select to_tsquery('simple', coalesce(public.expand_query(q), '')) as tsq,
           public.normalize_ar(q) as nq
  ),
  docs as (
    select 'product' kind, p.id, p.name_ar t_ar, p.name_en t_en, p.slug_ar, p.slug_en, p.search_text from public.products p
    union all select 'house', h.id, h.name_ar, h.name_en, h.slug_ar, h.slug_en, h.search_text from public.houses h
    union all select 'origin', o.id, o.name_ar, o.name_en, o.slug_ar, o.slug_en, o.search_text from public.origins o
    union all select 'note', n.id, n.name_ar, n.name_en, n.slug_ar, n.slug_en, n.search_text from public.notes n
    union all select a.kind, a.id, a.title_ar, a.title_en, a.slug_ar, a.slug_en, a.search_text from public.articles a
  )
  , fts as (
    select d.*, ts_rank(to_tsvector('simple', d.search_text), query.tsq)::real as score
    from docs d, query where to_tsvector('simple', d.search_text) @@ query.tsq
  ),
  fuzzy as (
    select d.*, word_similarity(query.nq, d.search_text)::real as score
    from docs d, query where not exists (select 1 from fts) and word_similarity(query.nq, d.search_text) > 0.45
  )
  select kind, id, t_ar, t_en, slug_ar, slug_en, score from (select * from fts union all select * from fuzzy) r
  order by score desc
  limit max_results
$$;
