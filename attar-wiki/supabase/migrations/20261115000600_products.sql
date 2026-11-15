-- Attar Wiki: house products support.
--  * relation 'example_of'  : a house's product made in a traditional style (e.g. a house's Mitti Attar -> Mitti Attar)
--  * note position 'listed' : the brand lists the note without saying top/heart/base (never guessed)
--  * price unit             : attars are often sold by weight (g) rather than volume (ml)

alter type public.relation_type add value if not exists 'example_of';
alter type public.note_position add value if not exists 'listed';

alter table public.price_reports
  add column if not exists unit text not null default 'ml' check (unit in ('ml', 'g'));

-- Keep volume_ml as the quantity column name for compatibility; it holds ml or g per `unit`.
comment on column public.price_reports.volume_ml is 'Quantity in the unit given by price_reports.unit (ml or g)';

create or replace view public.attar_latest_price
with (security_invoker = true) as
select distinct on (p.attar_id)
  p.attar_id,
  round(p.price_min_inr / p.volume_ml * 10, 0) as per10_min,
  round(p.price_max_inr / p.volume_ml * 10, 0) as per10_max,
  p.reported_on,
  p.source_name,
  p.unit
from public.price_reports p
order by p.attar_id, p.reported_on desc, p.created_at desc;

-- Snapshots include the unit.
create or replace function public.price_reports_snapshot(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'price_min_inr', p.price_min_inr, 'price_max_inr', p.price_max_inr,
           'volume', p.volume_ml, 'unit', p.unit, 'reported_on', p.reported_on,
           'source_name', p.source_name, 'source_url', p.source_url) order by p.reported_on desc, p.volume_ml), '[]'::jsonb)
    from public.price_reports p where p.attar_id = p_id
$$;

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
          select jsonb_agg(jsonb_build_object('relation', r.relation, 'attar', a2.slug, 'external_name', r.external_name, 'note', r.note)
                           order by r.relation, coalesce(a2.slug, r.external_name))
          from public.attar_relations r left join public.attars a2 on a2.id = r.related_attar_id
          where r.attar_id = p_id), '[]'::jsonb))
      || jsonb_build_object('price_reports', public.price_reports_snapshot(p_id));
  end if;
  snap := snap || jsonb_build_object('citations', coalesce((
      select jsonb_agg(jsonb_build_object('field', c.field_name, 'url', c.url, 'title', c.title,
                                          'publisher', c.publisher, 'accessed_at', c.accessed_at)
                       order by c.field_name, c.sort_order, c.url)
      from public.citations c where c.entity_type = p_type and c.entity_id = p_id), '[]'::jsonb));
  return snap;
end $$;

-- browse_attars gains price_unit (return type change requires drop + create).
drop function if exists public.browse_attars(text, public.attar_type, text, text, text, public.vote_metric, numeric, numeric,
  numeric, numeric, text, int, int);

create function public.browse_attars(
  p_family text default null,
  p_type public.attar_type default null,
  p_note text default null,
  p_house text default null,
  p_region text default null,
  p_weather public.vote_metric default null,
  p_weather_min numeric default 3.5,
  p_longevity_min numeric default null,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_sort text default 'name',
  p_limit int default 24,
  p_offset int default 0
) returns table (
  id uuid, slug text, name text, name_hi text, scent_family text, attar_type public.attar_type, summary text,
  house_slug text, house_name text, per10_min numeric, per10_max numeric, price_unit text, price_reported_on date,
  weather_avg numeric, weather_count int, longevity_avg numeric, longevity_count int,
  updated_at timestamptz, total_count bigint
) language sql stable security invoker set search_path = public as $$
  with base as (
    select a.*, h.slug as h_slug, h.name as h_name,
           lp.per10_min, lp.per10_max, lp.unit as p_unit, lp.reported_on as price_reported_on,
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
         b.h_slug, b.h_name, b.per10_min, b.per10_max, b.p_unit, b.price_reported_on,
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

-- Edit approvals: accept an optional price unit.
create or replace function public.apply_price_report(p_attar uuid, item jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.price_reports (attar_id, price_min_inr, price_max_inr, volume_ml, unit, reported_on, source_name, source_url, note)
  values (p_attar, (item ->> 'price_min_inr')::numeric, (item ->> 'price_max_inr')::numeric, (item ->> 'volume_ml')::numeric,
          coalesce(nullif(item ->> 'unit', ''), 'ml'),
          (item ->> 'reported_on')::date, item ->> 'source_name', nullif(item ->> 'source_url', ''), nullif(item ->> 'note', ''));
$$;
revoke execute on function public.apply_price_report(uuid, jsonb) from public, anon, authenticated;
