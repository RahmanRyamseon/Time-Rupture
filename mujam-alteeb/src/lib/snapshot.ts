import type { Article, Content, EntityType, House, Note, NoteRef, Origin, Product } from "./types";

/** Editable fields per entity type, in display order. "long" fields render as textareas. */
export const FIELD_SPECS: Record<EntityType, { key: string; long?: boolean; dir?: "ltr" | "rtl" }[]> = {
  product: [
    { key: "name_ar", dir: "rtl" }, { key: "name_en", dir: "ltr" }, { key: "description_ar", long: true, dir: "rtl" }, { key: "description_en", long: true, dir: "ltr" },
    { key: "origins", dir: "ltr" }, { key: "wild_status", dir: "ltr" }, { key: "notes_top", dir: "ltr" }, { key: "notes_heart", dir: "ltr" }, { key: "notes_base", dir: "ltr" },
    { key: "occasions", dir: "ltr" }, { key: "seasons", dir: "ltr" }, { key: "size_value", dir: "ltr" }, { key: "size_unit", dir: "ltr" }, { key: "official_url", dir: "ltr" },
  ],
  house: [
    { key: "name_ar", dir: "rtl" }, { key: "name_en", dir: "ltr" }, { key: "history_ar", long: true, dir: "rtl" }, { key: "history_en", long: true, dir: "ltr" },
    { key: "country_ar", dir: "rtl" }, { key: "country_en", dir: "ltr" }, { key: "city_ar", dir: "rtl" }, { key: "city_en", dir: "ltr" },
    { key: "founded_year", dir: "ltr" }, { key: "founder_ar", dir: "rtl" }, { key: "founder_en", dir: "ltr" }, { key: "official_website", dir: "ltr" },
  ],
  origin: [
    { key: "name_ar", dir: "rtl" }, { key: "name_en", dir: "ltr" }, { key: "region_ar", dir: "rtl" }, { key: "region_en", dir: "ltr" }, { key: "species", dir: "ltr" },
    { key: "profile_ar", long: true, dir: "rtl" }, { key: "profile_en", long: true, dir: "ltr" }, { key: "smell_ar", long: true, dir: "rtl" }, { key: "smell_en", long: true, dir: "ltr" },
    { key: "grading_ar", long: true, dir: "rtl" }, { key: "grading_en", long: true, dir: "ltr" }, { key: "uses_ar", long: true, dir: "rtl" }, { key: "uses_en", long: true, dir: "ltr" },
  ],
  note: [{ key: "name_ar", dir: "rtl" }, { key: "name_en", dir: "ltr" }, { key: "family", dir: "ltr" }, { key: "description_ar", long: true, dir: "rtl" }, { key: "description_en", long: true, dir: "ltr" }],
  culture: [{ key: "title_ar", dir: "rtl" }, { key: "title_en", dir: "ltr" }, { key: "summary_ar", long: true, dir: "rtl" }, { key: "summary_en", long: true, dir: "ltr" }, { key: "body_ar", long: true, dir: "rtl" }, { key: "body_en", long: true, dir: "ltr" }],
  guide: [{ key: "title_ar", dir: "rtl" }, { key: "title_en", dir: "ltr" }, { key: "summary_ar", long: true, dir: "rtl" }, { key: "summary_en", long: true, dir: "ltr" }, { key: "body_ar", long: true, dir: "rtl" }, { key: "body_en", long: true, dir: "ltr" }],
};

const refs = (l: NoteRef[]) => l.map((r) => (r.origin ? `${r.note}@${r.origin}` : r.note)).join("|");

export function snapshotOf(type: EntityType, e: Product | House | Origin | Note | Article): Record<string, string> {
  switch (type) {
    case "product": { const p = e as Product; return { name_ar: p.name.ar, name_en: p.name.en, description_ar: p.description.ar, description_en: p.description.en, origins: p.origins.join("|"), wild_status: p.wildStatus, notes_top: refs(p.notes.top), notes_heart: refs(p.notes.heart), notes_base: refs(p.notes.base), occasions: p.occasions.join("|"), seasons: p.seasons.join("|"), size_value: p.size.value?.toString() ?? "", size_unit: p.size.unit, official_url: p.officialUrl }; }
    case "house": { const h = e as House; return { name_ar: h.name.ar, name_en: h.name.en, history_ar: h.history.ar, history_en: h.history.en, country_ar: h.country.ar, country_en: h.country.en, city_ar: h.city.ar, city_en: h.city.en, founded_year: h.foundedYear?.toString() ?? "", founder_ar: h.founder.ar, founder_en: h.founder.en, official_website: h.officialWebsite }; }
    case "origin": { const o = e as Origin; return { name_ar: o.name.ar, name_en: o.name.en, region_ar: o.region.ar, region_en: o.region.en, species: o.species, profile_ar: o.profile.ar, profile_en: o.profile.en, smell_ar: o.smell.ar, smell_en: o.smell.en, grading_ar: o.grading.ar, grading_en: o.grading.en, uses_ar: o.uses.ar, uses_en: o.uses.en }; }
    case "note": { const n = e as Note; return { name_ar: n.name.ar, name_en: n.name.en, family: n.family, description_ar: n.description.ar, description_en: n.description.en }; }
    default: { const a = e as Article; return { title_ar: a.title.ar, title_en: a.title.en, summary_ar: a.summary.ar, summary_en: a.summary.en, body_ar: a.body.ar, body_en: a.body.en }; }
  }
}

export function diffSnapshots(before: Record<string, string>, after: Record<string, string>): { field: string; before: string; after: string }[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => (before[k] ?? "") !== (after[k] ?? "")).map((k) => ({ field: k, before: before[k] ?? "", after: after[k] ?? "" }));
}

export function findEntity(c: Content, type: EntityType, slug: string) {
  const s = (() => { try { return decodeURIComponent(slug).normalize("NFC"); } catch { return slug; } })();
  const match = <T extends { slug: { ar: string; en: string } }>(l: T[]) => l.find((x) => x.slug.ar.normalize("NFC") === s || x.slug.en === s);
  switch (type) {
    case "product": return match(c.products);
    case "house": return match(c.houses);
    case "origin": return match(c.origins);
    case "note": return match(c.notes);
    default: return match(c.articles.filter((a) => a.kind === type));
  }
}
