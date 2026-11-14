import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { SECTION_DEFS, type Section } from "@/lib/sections";
import type {
  Attar,
  AttarCard,
  AttarNoteRef,
  AttarRelationRef,
  Citation,
  EntityType,
  GlossaryEntry,
  Guide,
  House,
  MediaItem,
  Note,
  PriceReport,
  Region,
  Revision,
  SearchHit,
  VoteStat,
} from "@/lib/types";

const CARD_SELECT = "id, slug, name, name_hi, scent_family, attar_type, summary, house:houses(slug, name)";

function db() {
  return createPublicClient();
}

/* ------------------------------------------------------------------------ */
/* Shared entity extras                                                      */
/* ------------------------------------------------------------------------ */

export interface EntityExtras {
  citations: Citation[];
  media: MediaItem[];
  missingCitations: string[];
  revisionCount: number;
}

async function getExtras(type: EntityType, id: string): Promise<EntityExtras> {
  const supabase = db();
  if (!supabase) return { citations: [], media: [], missingCitations: [], revisionCount: 0 };
  const [cit, med, miss, revs] = await Promise.all([
    supabase
      .from("citations")
      .select("id, entity_type, entity_id, field_name, url, title, publisher, accessed_at, sort_order")
      .eq("entity_type", type)
      .eq("entity_id", id)
      .order("field_name")
      .order("sort_order"),
    supabase
      .from("media")
      .select("id, storage_path, alt, license, credit, source_url, width, height, is_primary")
      .eq("entity_type", type)
      .eq("entity_id", id)
      .eq("status", "approved")
      .order("is_primary", { ascending: false }),
    supabase.rpc("missing_citations", { p_type: type, p_id: id }),
    supabase.from("revisions").select("id", { count: "exact", head: true }).eq("entity_type", type).eq("entity_id", id),
  ]);
  return {
    citations: (cit.data as Citation[]) ?? [],
    media: (med.data as MediaItem[]) ?? [],
    missingCitations: (miss.data as string[]) ?? [],
    revisionCount: revs.count ?? 0,
  };
}

/* ------------------------------------------------------------------------ */
/* Attars                                                                    */
/* ------------------------------------------------------------------------ */

export interface AttarPageData extends EntityExtras {
  attar: Attar;
  house: Pick<House, "id" | "slug" | "name" | "name_hi" | "website_url"> | null;
  region: Pick<Region, "id" | "slug" | "name" | "name_hi"> | null;
  notes: AttarNoteRef[];
  relations: AttarRelationRef[];
  reverseRelations: AttarRelationRef[];
  prices: PriceReport[];
  stats: VoteStat[];
}

export async function getAttar(slug: string): Promise<AttarPageData | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data: attar } = await supabase.from("attars").select("*").eq("slug", slug).maybeSingle<Attar>();
  if (!attar) return null;

  const [house, region, notes, rel, rev, prices, stats, extras] = await Promise.all([
    attar.house_id
      ? supabase.from("houses").select("id, slug, name, name_hi, website_url").eq("id", attar.house_id).maybeSingle()
      : Promise.resolve({ data: null }),
    attar.region_id
      ? supabase.from("regions").select("id, slug, name, name_hi").eq("id", attar.region_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("attar_notes")
      .select("position, sort_order, note:notes(id, slug, name, name_hi)")
      .eq("attar_id", attar.id)
      .order("sort_order"),
    supabase
      .from("attar_relations")
      .select("id, relation, external_name, note, related:attars!attar_relations_related_attar_id_fkey(id, slug, name, name_hi)")
      .eq("attar_id", attar.id),
    supabase
      .from("attar_relations")
      .select("id, relation, external_name, note, related:attars!attar_relations_attar_id_fkey(id, slug, name, name_hi)")
      .eq("related_attar_id", attar.id),
    supabase
      .from("price_reports")
      .select("id, price_min_inr, price_max_inr, volume_ml, reported_on, source_name, source_url, note")
      .eq("attar_id", attar.id)
      .order("reported_on", { ascending: false }),
    supabase.from("attar_vote_stats").select("metric, vote_count, vote_avg, distribution").eq("attar_id", attar.id),
    getExtras("attar", attar.id),
  ]);

  return {
    attar,
    house: (house.data as AttarPageData["house"]) ?? null,
    region: (region.data as AttarPageData["region"]) ?? null,
    notes: ((notes.data as unknown as AttarNoteRef[]) ?? []).filter((n) => n.note),
    relations: (rel.data as unknown as AttarRelationRef[]) ?? [],
    reverseRelations: ((rev.data as unknown as AttarRelationRef[]) ?? []).filter((r) => r.related),
    prices: (prices.data as PriceReport[]) ?? [],
    stats: (stats.data as VoteStat[]) ?? [],
    ...extras,
  };
}

export interface BrowseFilters {
  family?: string;
  type?: string;
  note?: string;
  house?: string;
  region?: string;
  weather?: "heat" | "humidity" | "winter";
  longevity?: number;
  priceMin?: number;
  priceMax?: number;
  sort?: "name" | "updated" | "longevity" | "weather" | "price";
  page?: number;
  pageSize?: number;
}

export interface BrowseRow {
  id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  scent_family: string | null;
  attar_type: string | null;
  summary: string | null;
  house_slug: string | null;
  house_name: string | null;
  per10_min: number | null;
  per10_max: number | null;
  price_reported_on: string | null;
  weather_avg: number | null;
  weather_count: number;
  longevity_avg: number | null;
  longevity_count: number;
  total_count: number;
}

export async function browseAttars(f: BrowseFilters): Promise<{ rows: BrowseRow[]; total: number }> {
  const supabase = db();
  if (!supabase) return { rows: [], total: 0 };
  const pageSize = Math.min(f.pageSize ?? 24, 100);
  const page = Math.max(f.page ?? 1, 1);
  const { data, error } = await supabase.rpc("browse_attars", {
    p_family: f.family || null,
    p_type: f.type || null,
    p_note: f.note || null,
    p_house: f.house || null,
    p_region: f.region || null,
    p_weather: f.weather || null,
    p_weather_min: 3.5,
    p_longevity_min: f.longevity ?? null,
    p_price_min: f.priceMin ?? null,
    p_price_max: f.priceMax ?? null,
    p_sort: f.sort || "name",
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error || !data) return { rows: [], total: 0 };
  const rows = data as BrowseRow[];
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export interface Facets {
  families: string[];
  houses: { slug: string; name: string }[];
  regions: { slug: string; name: string }[];
  notes: { slug: string; name: string }[];
}

export async function getFacets(): Promise<Facets> {
  const empty: Facets = { families: [], houses: [], regions: [], notes: [] };
  const supabase = db();
  if (!supabase) return empty;
  const { data } = await supabase.rpc("attar_facets");
  return (data as Facets) ?? empty;
}

/* ------------------------------------------------------------------------ */
/* Other entities                                                            */
/* ------------------------------------------------------------------------ */

export async function getHouse(slug: string) {
  const supabase = db();
  if (!supabase) return null;
  const { data: house } = await supabase.from("houses").select("*").eq("slug", slug).maybeSingle<House>();
  if (!house) return null;
  const [region, attars, extras] = await Promise.all([
    house.region_id
      ? supabase.from("regions").select("id, slug, name, name_hi").eq("id", house.region_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("attars").select(CARD_SELECT).eq("house_id", house.id).eq("published", true).order("name"),
    getExtras("house", house.id),
  ]);
  return {
    house,
    region: region.data as Pick<Region, "id" | "slug" | "name" | "name_hi"> | null,
    attars: (attars.data as unknown as AttarCard[]) ?? [],
    ...extras,
  };
}

export async function getNote(slug: string) {
  const supabase = db();
  if (!supabase) return null;
  const { data: note } = await supabase.from("notes").select("*").eq("slug", slug).maybeSingle<Note>();
  if (!note) return null;
  const [links, extras] = await Promise.all([
    supabase
      .from("attar_notes")
      .select(`position, attar:attars!inner(${CARD_SELECT})`)
      .eq("note_id", note.id)
      .eq("attar.published", true),
    getExtras("note", note.id),
  ]);
  const byPosition: Record<"top" | "heart" | "base", AttarCard[]> = { top: [], heart: [], base: [] };
  for (const row of (links.data as unknown as { position: "top" | "heart" | "base"; attar: AttarCard }[]) ?? []) {
    byPosition[row.position].push(row.attar);
  }
  for (const k of Object.keys(byPosition) as (keyof typeof byPosition)[]) {
    byPosition[k].sort((a, b) => a.name.localeCompare(b.name));
  }
  return { note, byPosition, ...extras };
}

export async function getRegion(slug: string) {
  const supabase = db();
  if (!supabase) return null;
  const { data: region } = await supabase.from("regions").select("*").eq("slug", slug).maybeSingle<Region>();
  if (!region) return null;
  const [houses, attars, extras] = await Promise.all([
    supabase.from("houses").select("id, slug, name, name_hi, city, founded_year").eq("region_id", region.id).eq("published", true).order("name"),
    supabase.from("attars").select(CARD_SELECT).eq("region_id", region.id).eq("published", true).order("name"),
    getExtras("region", region.id),
  ]);
  return {
    region,
    houses: (houses.data as Pick<House, "id" | "slug" | "name" | "name_hi" | "city" | "founded_year">[]) ?? [],
    attars: (attars.data as unknown as AttarCard[]) ?? [],
    ...extras,
  };
}

export async function getGlossaryEntry(slug: string) {
  const supabase = db();
  if (!supabase) return null;
  const { data: entry } = await supabase.from("glossary").select("*").eq("slug", slug).maybeSingle<GlossaryEntry>();
  if (!entry) return null;
  return { entry, ...(await getExtras("glossary", entry.id)) };
}

export async function getGuide(slug: string) {
  const supabase = db();
  if (!supabase) return null;
  const { data: guide } = await supabase.from("guides").select("*").eq("slug", slug).maybeSingle<Guide>();
  if (!guide) return null;
  return { guide, ...(await getExtras("guide", guide.id)) };
}

/** Minimal row lookup used by history/edit pages for any section. */
export async function getEntityRow(section: Section, slug: string): Promise<Record<string, unknown> | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data } = await supabase.from(SECTION_DEFS[section].table).select("*").eq("slug", slug).maybeSingle();
  return (data as Record<string, unknown>) ?? null;
}

export async function listSection(section: Section, limit = 500) {
  const supabase = db();
  if (!supabase) return [];
  const def = SECTION_DEFS[section];
  const cols: Record<Section, string> = {
    attars: CARD_SELECT,
    houses: "id, slug, name, name_hi, city, founded_year, summary",
    notes: "id, slug, name, name_hi, botanical_name, category, summary",
    regions: "id, slug, name, name_hi, state, summary",
    glossary: "id, slug, term, term_hi, short_definition",
    guides: "id, slug, title, title_hi, summary, author_name, published_at, updated_at",
  };
  const q = supabase.from(def.table).select(cols[section]).eq("published", true).limit(limit);
  const { data } = section === "guides" ? await q.order("published_at", { ascending: false }) : await q.order(def.titleField);
  return (data as unknown as Record<string, unknown>[]) ?? [];
}

export async function getAttarCards(slugs: string[]) {
  const supabase = db();
  if (!supabase || slugs.length === 0) return [];
  const { data } = await supabase.from("attars").select(CARD_SELECT).in("slug", slugs).eq("published", true);
  return (data as unknown as AttarCard[]) ?? [];
}

/* ------------------------------------------------------------------------ */
/* Revisions                                                                 */
/* ------------------------------------------------------------------------ */

export async function getRevisions(type: EntityType, id: string, limit = 100): Promise<Revision[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("revisions")
    .select("id, entity_type, entity_id, change_summary, changed_by, created_at, snapshot")
    .eq("entity_type", type)
    .eq("entity_id", id)
    .order("id", { ascending: false })
    .limit(limit);
  const revisions = (data as Revision[]) ?? [];
  const authorIds = [...new Set(revisions.map((r) => r.changed_by).filter(Boolean))] as string[];
  if (authorIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", authorIds);
    const map = new Map((profiles ?? []).map((p) => [p.id as string, { display_name: p.display_name as string }]));
    revisions.forEach((r) => (r.author = r.changed_by ? (map.get(r.changed_by) ?? null) : null));
  }
  return revisions;
}

export async function getRevisionPair(type: EntityType, id: string, revisionId: number) {
  const supabase = db();
  if (!supabase) return null;
  const { data: current } = await supabase
    .from("revisions")
    .select("*")
    .eq("id", revisionId)
    .eq("entity_type", type)
    .eq("entity_id", id)
    .maybeSingle<Revision>();
  if (!current) return null;
  const { data: previous } = await supabase
    .from("revisions")
    .select("*")
    .eq("entity_type", type)
    .eq("entity_id", id)
    .lt("id", revisionId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<Revision>();
  let author: string | null = null;
  if (current.changed_by) {
    const { data: p } = await supabase.from("profiles").select("display_name").eq("id", current.changed_by).maybeSingle();
    author = (p?.display_name as string) ?? null;
  }
  return { current, previous: previous ?? null, author };
}

/* ------------------------------------------------------------------------ */
/* Search & home                                                             */
/* ------------------------------------------------------------------------ */

export async function search(query: string, types?: EntityType[], limit = 20): Promise<SearchHit[]> {
  const supabase = db();
  const q = query.trim().slice(0, 100);
  if (!supabase || !q) return [];
  const { data } = await supabase.rpc("search_all", { p_query: q, p_types: types?.length ? types : null, p_limit: limit });
  return (data as SearchHit[]) ?? [];
}

export async function getHomeData() {
  const supabase = db();
  if (!supabase) return { recent: [], guides: [], notes: [], regions: [], counts: {} as Record<string, number> };
  const countOf = (table: string) =>
    supabase.from(table).select("id", { count: "exact", head: true }).eq("published", true);
  const [recent, guides, notes, regions, ca, ch, cn, cr] = await Promise.all([
    supabase.from("attars").select(CARD_SELECT).eq("published", true).order("updated_at", { ascending: false }).limit(8),
    supabase.from("guides").select("id, slug, title, title_hi, summary").eq("published", true).order("published_at", { ascending: false }).limit(3),
    supabase.from("notes").select("id, slug, name, name_hi").eq("published", true).order("name").limit(24),
    supabase.from("regions").select("id, slug, name, name_hi, state").eq("published", true).order("name").limit(12),
    countOf("attars"),
    countOf("houses"),
    countOf("notes"),
    countOf("regions"),
  ]);
  return {
    recent: (recent.data as unknown as AttarCard[]) ?? [],
    guides: (guides.data as Pick<Guide, "id" | "slug" | "title" | "title_hi" | "summary">[]) ?? [],
    notes: (notes.data as Pick<Note, "id" | "slug" | "name" | "name_hi">[]) ?? [],
    regions: (regions.data as Pick<Region, "id" | "slug" | "name" | "name_hi" | "state">[]) ?? [],
    counts: { attars: ca.count ?? 0, houses: ch.count ?? 0, notes: cn.count ?? 0, regions: cr.count ?? 0 },
  };
}

export async function getSitemapEntries() {
  const supabase = db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("search_documents")
    .select("entity_type, slug, updated_at")
    .eq("published", true)
    .limit(45000);
  return (data as { entity_type: EntityType; slug: string; updated_at: string }[]) ?? [];
}

export async function getPublishedReviews(attarId: string, limit = 30) {
  const supabase = db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select("id, attar_id, user_id, body, skin_type, climate, city, status, report_count, created_at, updated_at")
    .eq("attar_id", attarId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  const reviews = (data as import("@/lib/types").Review[]) ?? [];
  const ids = [...new Set(reviews.map((r) => r.user_id))];
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.id as string, { display_name: p.display_name as string }]));
    reviews.forEach((r) => (r.author = map.get(r.user_id) ?? null));
  }
  return reviews;
}

/** Full rows for the compare table. */
export async function getCompareData(slugs: string[]) {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))].slice(0, 4);
  const results = await Promise.all(unique.map((s) => getAttar(s)));
  return results.filter((r): r is AttarPageData => Boolean(r && r.attar.published));
}
