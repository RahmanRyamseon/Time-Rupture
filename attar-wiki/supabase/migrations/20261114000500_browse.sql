-- Attar Wiki: browse/filter + catalog functions used by /attars, the API and the matcher.

-- Latest price report per attar, normalised to INR per 10 ml.
create or replace view public.attar_latest_price
with (security_invoker = true) as
select distinct on (p.attar_id)
  p.attar_id,
  round(p.price_min_inr / p.volume_ml * 10, 0) as per10_min,
  round(p.price_max_inr / p.volume_ml * 10, 0) as per10_max,
  p.reported_on,
  p.source_name
from public.price_reports p
order by p.attar_id, p.reported_on desc, p.created_at desc;

grant select on public.attar_latest_price to anon, authenticated;

create or replace function public.browse_attars(
  p_family text default null,
  p_type public.attar_type default null,
  p_note text default null,          -- note slug
  p_house text default null,         -- house slug
  p_region text default null,        -- region slug
  p_weather public.vote_metric default null, -- heat | humidity | winter
  p_weather_min numeric default 3.5,
  p_longevity_min numeric default null,
  p_price_min numeric default null,  -- INR per 10 ml
  p_price_max numeric default null,
  p_sort text default 'name',        -- name | updated | longevity | weather | price
  p_limit int default 24,
  p_offset int default 0
) returns table (
  id uuid, slug text, name text, name_hi text, scent_family text, attar_type public.attar_type, summary text,
  house_slug text, house_name text, per10_min numeric, per10_max numeric, price_reported_on date,
  weather_avg numeric, weather_count int, longevity_avg numeric, longevity_count int,
  updated_at timestamptz, total_count bigint
) language sql stable security invoker set search_path = public as $$
  with base as (
    select a.*, h.slug as h_slug, h.name as h_name,
           lp.per10_min, lp.per10_max, lp.reported_on as price_reported_on,
           w.vote_avg as w_avg, w.vote_count as w_count,
           l.vote_avg as l_avg, l.vote_count as l_count
      from public.attars a
      left join public.houses h on h.id = a.house_id
      left join public.regions r on r.id = a.region_id
      left join public.attar_latest_price lp on lp.attar_id = a.id
      left join public.attar_vote_stats w on w.attar_id = a.id and w.metric = p_weather
      left join public.attar_vote_stats l on l.attar_id = a.id and l.metric = 'longevity'
     where a.published
       and (p_family is null or lower(a.scent_family) = lower(p_family))
       and (p_type is null or a.attar_type = p_type)
       and (p_house is null or h.slug = p_house)
       and (p_region is null or r.slug = p_region)
       and (p_note is null or exists (
             select 1 from public.attar_notes an join public.notes n on n.id = an.note_id
              where an.attar_id = a.id and n.slug = p_note))
       and (p_weather is null or (w.vote_count > 0 and w.vote_avg >= coalesce(p_weather_min, 3.5)))
       and (p_longevity_min is null or (l.vote_count > 0 and l.vote_avg >= p_longevity_min))
       and (p_price_min is null or lp.per10_max >= p_price_min)
       and (p_price_max is null or lp.per10_min <= p_price_max)
  )
  select b.id, b.slug, b.name, b.name_hi, b.scent_family, b.attar_type, b.summary,
         b.h_slug, b.h_name, b.per10_min, b.per10_max, b.price_reported_on,
         b.w_avg, coalesce(b.w_count, 0), b.l_avg, coalesce(b.l_count, 0),
         b.updated_at, count(*) over ()
    from base b
   order by
     case when p_sort = 'updated' then extract(epoch from b.updated_at) end desc nulls last,
     case when p_sort = 'longevity' then b.l_avg end desc nulls last,
     case when p_sort = 'weather' then b.w_avg end desc nulls last,
     case when p_sort = 'price' then b.per10_min end asc nulls last,
     b.name asc
   limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;

grant execute on function public.browse_attars(text, public.attar_type, text, text, text, public.vote_metric, numeric, numeric,
  numeric, numeric, text, int, int) to anon, authenticated;

-- Distinct filter values.
create or replace function public.attar_facets()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'families', coalesce((select jsonb_agg(f order by f) from (
        select distinct scent_family f from public.attars where published and scent_family is not null) x), '[]'::jsonb),
    'houses', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'name', name) order by name)
        from public.houses where published), '[]'::jsonb),
    'regions', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'name', name) order by name)
        from public.regions where published), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('slug', n.slug, 'name', n.name) order by n.name)
        from public.notes n where n.published and exists (select 1 from public.attar_notes an where an.note_id = n.id)), '[]'::jsonb)
  )
$$;

grant execute on function public.attar_facets() to anon, authenticated;

-- Compact catalog for the matcher (published attars only).
create or replace function public.matcher_catalog()
returns table (
  id uuid, slug text, name text, house text, attar_type public.attar_type, scent_family text, base_oil text,
  occasions text[], notes text[], stats jsonb, per10_min numeric, per10_max numeric
) language sql stable security invoker set search_path = public as $$
  select a.id, a.slug, a.name, h.name, a.attar_type, a.scent_family, a.base_oil, a.occasions,
         coalesce((select array_agg(lower(n.name) || '|' || n.slug order by an.position, an.sort_order)
                     from public.attar_notes an join public.notes n on n.id = an.note_id where an.attar_id = a.id), '{}'),
         coalesce((select jsonb_object_agg(s.metric, jsonb_build_object('avg', s.vote_avg, 'n', s.vote_count))
                     from public.attar_vote_stats s where s.attar_id = a.id and s.vote_count > 0), '{}'::jsonb),
         lp.per10_min, lp.per10_max
    from public.attars a
    left join public.houses h on h.id = a.house_id
    left join public.attar_latest_price lp on lp.attar_id = a.id
   where a.published
$$;

grant execute on function public.matcher_catalog() to anon, authenticated;
