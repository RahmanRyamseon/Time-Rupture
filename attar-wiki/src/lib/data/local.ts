import "server-only";
/**
 * Local (database-free) data source. Serves the compiled seed bundle
 * (src/generated/local-data.json) with the same shapes as the Supabase queries,
 * so the wiki shows real, cited content before a database is connected.
 * Community features (votes, reviews, edits) need Supabase and stay empty here.
 */
import raw from "@/generated/local-data.json";
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
  Note,
  NotePosition,
  PriceReport,
  Region,
  SearchHit,
} from "@/lib/types";
import type { AttarPageData, BrowseFilters, BrowseRow, EntityExtras, Facets } from "./wiki";

interface Bundle {
  generatedAt: string;
  regions: Region[];
  houses: House[];
  notes: Note[];
  attars: Attar[];
  attar_notes: { attar_id: string; note_id: string; position: NotePosition; sort_order: number }[];
  attar_relations: { id: string; attar_id: string; related_attar_id: string | null; external_name: string | null; relation: AttarRelationRef["relation"]; note: string | null }[];
  price_reports: (PriceReport & { attar_id: string })[];
  glossary: GlossaryEntry[];
  guides: (Guide & { aliases?: string[] })[];
  citations: Citation[];
}

const D = raw as unknown as Bundle;

/* ------------------------------------------------------------------------ */
/* Helpers                                                                    */
/* ------------------------------------------------------------------------ */

const TABLE: Record<EntityType, { id: string; slug: string }[]> = {
  attar: D.attars,
  house: D.houses,
  note: D.notes,
  region: D.regions,
  glossary: D.glossary,
  guide: D.guides,
};

// Same field list as public.citable_fields() in SQL.
const CITABLE: Record<EntityType, string[]> = {
  attar: ["attar_type", "base_oil", "description", "how_made", "region_id", "house_id", "launch_year"],
  house: ["city", "founded_year", "history", "website_url"],
  note: ["botanical_name", "smell", "botany", "grown_in"],
  region: ["history", "specialities"],
  glossary: ["short_definition", "body"],
  guide: ["body"],
};

function missingCitations(type: EntityType, row: Record<string, unknown>): string[] {
  const cited = new Set(D.citations.filter((c) => c.entity_type === type && c.entity_id === row.id).map((c) => c.field_name));
  const out = CITABLE[type].filter((f) => row[f] != null && row[f] !== "" && !cited.has(f));
  if (type === "attar" && D.attar_notes.some((n) => n.attar_id === row.id) && !cited.has("notes")) out.push("notes");
  return out;
}

function extras(type: EntityType, row: Record<string, unknown>): EntityExtras {
  return {
    citations: D.citations.filter((c) => c.entity_type === type && c.entity_id === row.id),
    media: [],
    missingCitations: missingCitations(type, row),
    revisionCount: 0,
  };
}

const houseById = (id: string | null) => (id ? D.houses.find((h) => h.id === id) ?? null : null);
const regionById = (id: string | null) => (id ? D.regions.find((r) => r.id === id) ?? null : null);

function card(a: Attar): AttarCard {
  const h = houseById(a.house_id);
  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    name_hi: a.name_hi,
    scent_family: a.scent_family,
    attar_type: a.attar_type,
    summary: a.summary,
    house: h ? { slug: h.slug, name: h.name } : null,
  };
}

const published = <T extends { published: boolean }>(rows: T[]) => rows.filter((r) => r.published);
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/* ------------------------------------------------------------------------ */
/* Entities                                                                   */
/* ------------------------------------------------------------------------ */

export function getAttar(slug: string): AttarPageData | null {
  const attar = D.attars.find((a) => a.slug === slug);
  if (!attar) return null;
  const h = houseById(attar.house_id);
  const r = regionById(attar.region_id);
  const notes: AttarNoteRef[] = D.attar_notes
    .filter((n) => n.attar_id === attar.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((n) => {
      const note = D.notes.find((x) => x.id === n.note_id)!;
      return { position: n.position, sort_order: n.sort_order, note: { id: note.id, slug: note.slug, name: note.name, name_hi: note.name_hi } };
    });
  const ref = (id: string | null) => {
    const a = id ? D.attars.find((x) => x.id === id) : null;
    return a ? { id: a.id, slug: a.slug, name: a.name, name_hi: a.name_hi } : null;
  };
  return {
    attar,
    house: h ? { id: h.id, slug: h.slug, name: h.name, name_hi: h.name_hi, website_url: h.website_url } : null,
    region: r ? { id: r.id, slug: r.slug, name: r.name, name_hi: r.name_hi } : null,
    notes,
    relations: D.attar_relations
      .filter((x) => x.attar_id === attar.id)
      .map((x) => ({ id: x.id, relation: x.relation, external_name: x.external_name, note: x.note, related: ref(x.related_attar_id) })),
    reverseRelations: D.attar_relations
      .filter((x) => x.related_attar_id === attar.id)
      .map((x) => ({ id: x.id, relation: x.relation, external_name: null, note: x.note, related: ref(x.attar_id) })),
    prices: D.price_reports.filter((p) => p.attar_id === attar.id).sort((a, b) => b.reported_on.localeCompare(a.reported_on)),
    stats: [],
    ...extras("attar", attar as unknown as Record<string, unknown>),
  };
}

export function getHouse(slug: string) {
  const house = D.houses.find((h) => h.slug === slug);
  if (!house) return null;
  const r = regionById(house.region_id);
  return {
    house,
    region: r ? { id: r.id, slug: r.slug, name: r.name, name_hi: r.name_hi } : null,
    attars: published(D.attars).filter((a) => a.house_id === house.id).sort(byName).map(card),
    ...extras("house", house as unknown as Record<string, unknown>),
  };
}

export function getNote(slug: string) {
  const note = D.notes.find((n) => n.slug === slug);
  if (!note) return null;
  const byPosition: Record<NotePosition, AttarCard[]> = { top: [], heart: [], base: [], listed: [] };
  for (const link of D.attar_notes.filter((n) => n.note_id === note.id)) {
    const a = D.attars.find((x) => x.id === link.attar_id && x.published);
    if (a && !byPosition[link.position].some((x) => x.id === a.id)) byPosition[link.position].push(card(a));
  }
  (Object.keys(byPosition) as NotePosition[]).forEach((k) => byPosition[k].sort(byName));
  return { note, byPosition, ...extras("note", note as unknown as Record<string, unknown>) };
}

export function getRegion(slug: string) {
  const region = D.regions.find((r) => r.slug === slug);
  if (!region) return null;
  return {
    region,
    houses: published(D.houses)
      .filter((h) => h.region_id === region.id)
      .sort(byName)
      .map((h) => ({ id: h.id, slug: h.slug, name: h.name, name_hi: h.name_hi, city: h.city, founded_year: h.founded_year })),
    attars: published(D.attars).filter((a) => a.region_id === region.id).sort(byName).map(card),
    ...extras("region", region as unknown as Record<string, unknown>),
  };
}

export function getGlossaryEntry(slug: string) {
  const entry = D.glossary.find((g) => g.slug === slug);
  return entry ? { entry, ...extras("glossary", entry as unknown as Record<string, unknown>) } : null;
}

export function getGuide(slug: string) {
  const guide = D.guides.find((g) => g.slug === slug);
  return guide ? { guide: guide as Guide, ...extras("guide", guide as unknown as Record<string, unknown>) } : null;
}

export function getEntityRow(section: Section, slug: string): Record<string, unknown> | null {
  const row = TABLE[SECTION_DEFS[section].type].find((r) => r.slug === slug);
  return (row as unknown as Record<string, unknown>) ?? null;
}

export function listSection(section: Section): Record<string, unknown>[] {
  switch (section) {
    case "attars":
      return published(D.attars).sort(byName).map((a) => card(a) as unknown as Record<string, unknown>);
    case "guides":
      return published(D.guides)
        .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
        .map((g) => g as unknown as Record<string, unknown>);
    case "glossary":
      return published(D.glossary).sort((a, b) => a.term.localeCompare(b.term)) as unknown as Record<string, unknown>[];
    default: {
      const rows = TABLE[SECTION_DEFS[section].type] as unknown as { name: string; published: boolean }[];
      return published(rows).sort(byName) as unknown as Record<string, unknown>[];
    }
  }
}

export function getAttarCards(slugs: string[]) {
  return published(D.attars).filter((a) => slugs.includes(a.slug)).map(card);
}

/* ------------------------------------------------------------------------ */
/* Browse & facets                                                            */
/* ------------------------------------------------------------------------ */

function latestPrice(attarId: string) {
  const p = D.price_reports.filter((x) => x.attar_id === attarId).sort((a, b) => b.reported_on.localeCompare(a.reported_on))[0];
  return p ? { min: Math.round((p.price_min_inr / p.volume_ml) * 10), max: Math.round((p.price_max_inr / p.volume_ml) * 10), on: p.reported_on, unit: p.unit ?? "ml" } : null;
}

export function browseAttars(f: BrowseFilters): { rows: BrowseRow[]; total: number } {
  // Weather and longevity filters need community votes, which live in Supabase.
  if (f.weather || f.longevity) return { rows: [], total: 0 };
  let rows = published(D.attars);
  const house = f.house ? D.houses.find((h) => h.slug === f.house) : null;
  const region = f.region ? D.regions.find((r) => r.slug === f.region) : null;
  const note = f.note ? D.notes.find((n) => n.slug === f.note) : null;
  if (f.family) rows = rows.filter((a) => a.scent_family?.toLowerCase() === f.family!.toLowerCase());
  if (f.type) rows = rows.filter((a) => a.attar_type === f.type);
  if (f.house) rows = rows.filter((a) => house && a.house_id === house.id);
  if (f.region) rows = rows.filter((a) => region && a.region_id === region.id);
  if (f.note) rows = rows.filter((a) => note && D.attar_notes.some((n) => n.attar_id === a.id && n.note_id === note.id));
  if (f.priceMin != null || f.priceMax != null) {
    rows = rows.filter((a) => {
      const p = latestPrice(a.id);
      return p && (f.priceMin == null || p.max >= f.priceMin) && (f.priceMax == null || p.min <= f.priceMax);
    });
  }
  rows = [...rows].sort(f.sort === "price" ? (a, b) => (latestPrice(a.id)?.min ?? Infinity) - (latestPrice(b.id)?.min ?? Infinity) : byName);
  const total = rows.length;
  const size = Math.min(f.pageSize ?? 24, 100);
  const page = Math.max(f.page ?? 1, 1);
  return {
    total,
    rows: rows.slice((page - 1) * size, page * size).map((a) => {
      const h = houseById(a.house_id);
      const p = latestPrice(a.id);
      return {
        id: a.id,
        slug: a.slug,
        name: a.name,
        name_hi: a.name_hi,
        scent_family: a.scent_family,
        attar_type: a.attar_type,
        summary: a.summary,
        house_slug: h?.slug ?? null,
        house_name: h?.name ?? null,
        per10_min: p?.min ?? null,
        per10_max: p?.max ?? null,
        price_unit: p?.unit ?? null,
        price_reported_on: p?.on ?? null,
        weather_avg: null,
        weather_count: 0,
        longevity_avg: null,
        longevity_count: 0,
        total_count: total,
      };
    }),
  };
}

export function getFacets(): Facets {
  const attars = published(D.attars);
  return {
    families: [...new Set(attars.map((a) => a.scent_family).filter((x): x is string => Boolean(x)))].sort(),
    houses: published(D.houses).sort(byName).map((h) => ({ slug: h.slug, name: h.name })),
    regions: published(D.regions).sort(byName).map((r) => ({ slug: r.slug, name: r.name })),
    notes: published(D.notes)
      .filter((n) => D.attar_notes.some((l) => l.note_id === n.id))
      .sort(byName)
      .map((n) => ({ slug: n.slug, name: n.name })),
  };
}

/* ------------------------------------------------------------------------ */
/* Search (mirrors normalize_search_text + trigram similarity in SQL)          */
/* ------------------------------------------------------------------------ */

const SYNONYMS: Record<string, string> = {
  itr: "attar", ittar: "attar", ittr: "attar", itar: "attar", atar: "attar", attars: "attar", itrs: "attar", ittars: "attar",
  attaar: "attar", itter: "attar", "इत्र": "attar", "अत्तर": "attar", "अतर": "attar", "इतर": "attar",
  oudh: "oud", ood: "oud", oodh: "oud", aoud: "oud", agarwood: "oud", "ऊद": "oud",
  rooh: "ruh", "रूह": "ruh",
  kevda: "kewda", kewra: "kewda", keora: "kewda", kevra: "kewda", "केवड़ा": "kewda", "केवडा": "kewda",
  khas: "khus", khuss: "khus", "खस": "khus",
  mitty: "mitti", "मिट्टी": "mitti", heena: "hina", henna: "hina", "हिना": "hina",
  gulaab: "gulab", "गुलाब": "gulab", "चंदन": "chandan", "चन्दन": "chandan",
  shamamah: "shamama", "शमामा": "shamama", majmooa: "majmua", majmuaa: "majmua", "मजमुआ": "majmua",
  kanauj: "kannauj", kannoj: "kannauj", "कन्नौज": "kannauj",
};

export function normalize(text: string | null | undefined): string {
  if (!text) return "";
  let t = text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  t = t.replace(/deg[\s-]?b?h?apka/g, "deg-bhapka");
  const tokens = t.replace(/[^\p{L}\p{N}ऀ-ॿ\s-]+/gu, " ").split(/\s+/).filter(Boolean);
  return tokens.flatMap((tok) => (SYNONYMS[tok] && SYNONYMS[tok] !== tok ? [SYNONYMS[tok], tok] : [tok])).join(" ");
}

function trigrams(s: string) {
  const g = new Set<string>();
  const p = `  ${s} `;
  for (let i = 0; i < p.length - 2; i++) g.add(p.slice(i, i + 3));
  return g;
}

function similarity(a: string, b: string) {
  const A = trigrams(a), B = trigrams(b);
  let inter = 0;
  A.forEach((x) => B.has(x) && inter++);
  return inter / (A.size + B.size - inter || 1);
}

interface Doc {
  type: EntityType;
  id: string;
  slug: string;
  title: string;
  title_hi: string | null;
  subtitle: string | null;
  hay: string[]; // normalized title/alias words
  body: string;
  boost: number;
}

let docs: Doc[] | null = null;
function index(): Doc[] {
  if (docs) return docs;
  const mk = (type: EntityType, id: string, slug: string, title: string, title_hi: string | null, subtitle: string | null, aliases: string[], body: string, boost = 0): Doc => ({
    type, id, slug, title, title_hi, subtitle, boost,
    hay: normalize([title, title_hi, ...aliases].filter(Boolean).join(" ")).split(" "),
    body: normalize(body),
  });
  docs = [
    ...published(D.attars).map((a) => {
      const h = houseById(a.house_id);
      const notes = D.attar_notes.filter((n) => n.attar_id === a.id).map((n) => D.notes.find((x) => x.id === n.note_id)!);
      return mk("attar", a.id, a.slug, a.name, a.name_hi, [h?.name, a.scent_family].filter(Boolean).join(" · ") || null, a.aliases,
        [a.summary, a.base_oil, a.scent_family, h?.name, ...notes.flatMap((n) => [n.name, n.name_hi, ...n.aliases]), ...a.occasions, a.description].join(" "),
        // traditional style pages (no house) answer generic queries best
        h ? 0 : 0.03);
    }),
    ...published(D.houses).map((h) => mk("house", h.id, h.slug, h.name, h.name_hi, h.city, h.aliases, [h.summary, h.city, h.history].join(" "))),
    ...published(D.notes).map((n) => mk("note", n.id, n.slug, n.name, n.name_hi, [n.botanical_name, n.category].filter(Boolean).join(" · ") || null, n.aliases, [n.summary, n.smell, n.grown_in].join(" "))),
    ...published(D.regions).map((r) => mk("region", r.id, r.slug, r.name, r.name_hi, [r.state, r.country].filter(Boolean).join(", "), r.aliases, [r.summary, r.history, r.specialities].join(" "))),
    ...published(D.glossary).map((g) => mk("glossary", g.id, g.slug, g.term, g.term_hi, g.short_definition?.slice(0, 160) ?? null, g.aliases, [g.short_definition, g.body].join(" "))),
    ...published(D.guides).map((g) => mk("guide", g.id, g.slug, g.title, g.title_hi, g.summary?.slice(0, 160) ?? null, [], [g.summary, g.body].join(" "))),
  ];
  return docs;
}

export function search(query: string, types?: EntityType[], limit = 20): SearchHit[] {
  const q = normalize(query).split(" ").filter(Boolean);
  if (!q.length) return [];
  const results: SearchHit[] = [];
  for (const d of index()) {
    if (types?.length && !types.includes(d.type)) continue;
    let score = 0;
    let matchedAll = true;
    for (const tok of q) {
      const exact = d.hay.some((w) => w.startsWith(tok));
      const fuzzy = Math.max(0, ...d.hay.map((w) => similarity(tok, w)));
      const inBody = tok.length > 2 && d.body.includes(tok);
      const s = exact ? 1 : fuzzy >= 0.4 ? fuzzy : inBody ? 0.3 : 0;
      if (s === 0) matchedAll = false;
      score += s;
    }
    if (!matchedAll && score < 0.6) continue;
    if (score > 0) results.push({ entity_type: d.type, entity_id: d.id, slug: d.slug, title: d.title, title_hi: d.title_hi, subtitle: d.subtitle, score: score / q.length + (d.type === "attar" ? 0.05 : 0) + d.boost });
  }
  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, Math.min(limit, 50));
}

/* ------------------------------------------------------------------------ */
/* Home, sitemap, matcher catalog                                             */
/* ------------------------------------------------------------------------ */

export function getHomeData() {
  return {
    recent: published(D.attars).sort(byName).slice(0, 9).map(card),
    guides: published(D.guides).map((g) => ({ id: g.id, slug: g.slug, title: g.title, title_hi: g.title_hi, summary: g.summary })),
    notes: published(D.notes).sort(byName).map((n) => ({ id: n.id, slug: n.slug, name: n.name, name_hi: n.name_hi })),
    regions: published(D.regions).sort(byName).map((r) => ({ id: r.id, slug: r.slug, name: r.name, name_hi: r.name_hi, state: r.state })),
    counts: { attars: published(D.attars).length, houses: published(D.houses).length, notes: published(D.notes).length, regions: published(D.regions).length },
  };
}

export function getSitemapEntries() {
  return index().map((d) => ({ entity_type: d.type, slug: d.slug, updated_at: D.generatedAt }));
}

export function matcherCatalog() {
  return published(D.attars).map((a) => {
    const p = latestPrice(a.id);
    return {
      id: a.id,
      slug: a.slug,
      name: a.name,
      house: houseById(a.house_id)?.name ?? null,
      attar_type: a.attar_type,
      scent_family: a.scent_family,
      base_oil: a.base_oil,
      occasions: a.occasions,
      notes: D.attar_notes
        .filter((n) => n.attar_id === a.id)
        .map((n) => D.notes.find((x) => x.id === n.note_id)!)
        .map((n) => `${n.name.toLowerCase()}|${n.slug}`),
      stats: {},
      per10_min: p?.min ?? null,
      per10_max: p?.max ?? null,
    };
  });
}

/** Traditional styles that have house versions, for the buyer's comparison index. */
export function comparisonIndex() {
  const out = new Map<string, { slug: string; name: string; name_hi: string | null; summary: string | null; versions: string[] }>();
  for (const r of D.attar_relations) {
    if (r.relation !== "example_of" || !r.related_attar_id) continue;
    const style = D.attars.find((a) => a.id === r.related_attar_id && a.published);
    const product = D.attars.find((a) => a.id === r.attar_id && a.published);
    if (!style || !product) continue;
    const row = out.get(style.slug) ?? { slug: style.slug, name: style.name, name_hi: style.name_hi, summary: style.summary, versions: [] };
    row.versions.push(product.slug);
    out.set(style.slug, row);
  }
  return [...out.values()];
}
