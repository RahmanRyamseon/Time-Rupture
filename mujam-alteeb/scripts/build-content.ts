/**
 * Compiles data/csv/*.csv into src/generated/content.json and public/search-index.json.
 * Fails the build on broken references (unknown citation, house, origin, note, taxonomy id).
 */
import fs from "node:fs";
import path from "node:path";
import fs_ from "node:fs";
import { readCsv, list } from "./csv";
import { NOTE_DICTIONARY } from "./collect/note-dictionary";
import type { Article, Bi, Citation, Content, FieldCitations, House, Note, NoteRef, Origin, Product, TaxItem } from "../src/lib/types";
import type { SearchDoc } from "../src/lib/search";
import { slugify, tokenize } from "../src/lib/normalize";
import { href, ENTITY_ROUTES } from "../src/lib/paths";

const errors: string[] = [];
/** Optional machine-collected files from scripts/collect (official store catalogues). */
const collected = (name: string) => fs_.existsSync(path.join(process.cwd(), "data", "csv", "collected", name)) ? readCsv(`collected/${name}`) : [];
const bi = (r: Record<string, string>, k: string): Bi => ({ ar: r[`${k}_ar`] ?? "", en: r[`${k}_en`] ?? "" });

const citations: Record<string, Citation> = {};
for (const r of [...readCsv("citations.csv"), ...collected("citations.csv")]) {
  if (!/^https?:\/\//.test(r.url)) errors.push(`citation ${r.id}: invalid url`);
  citations[r.id] = { id: r.id, url: r.url, title: r.title, publisher: r.publisher, accessed: r.accessed, quote: r.quote };
}

function fieldCitations(owner: string, v: string): FieldCitations {
  const out: FieldCitations = {};
  for (const pair of list(v)) {
    const [field, cid] = pair.split(":");
    if (!field || !cid) { errors.push(`${owner}: malformed citation "${pair}"`); continue; }
    if (!citations[cid]) errors.push(`${owner}: unknown citation "${cid}"`);
    (out[field] ??= []).push(cid);
  }
  return out;
}

const taxonomy: Record<string, TaxItem[]> = {};
for (const r of readCsv("taxonomy.csv")) {
  (taxonomy[r.type] ??= []).push({ id: r.id, name: bi(r, "name"), order: Number(r.order) || 0 });
}
for (const k of Object.keys(taxonomy)) taxonomy[k].sort((a, b) => a.order - b.order);
const tax = (type: string) => new Set((taxonomy[type] ?? []).map((t) => t.id));
function checkTax(owner: string, type: string, ids: string[]) {
  const known = tax(type);
  for (const id of ids) if (!known.has(id)) errors.push(`${owner}: unknown ${type} "${id}"`);
}

const houses: House[] = readCsv("houses.csv").map((r) => ({
  id: r.id, slug: bi(r, "slug"), name: bi(r, "name"), country: bi(r, "country"), city: bi(r, "city"),
  foundedYear: r.founded_year ? Number(r.founded_year) : null, founder: bi(r, "founder"), history: bi(r, "history"),
  officialWebsite: r.official_website, citations: fieldCitations(`house ${r.id}`, r.citations),
}));

const origins: Origin[] = readCsv("origins.csv").map((r) => ({
  id: r.id, slug: bi(r, "slug"), name: bi(r, "name"), region: bi(r, "region"), species: r.species,
  profile: bi(r, "profile"), smell: bi(r, "smell"), grading: bi(r, "grading"), uses: bi(r, "uses"),
  citations: fieldCitations(`origin ${r.id}`, r.citations),
}));

const dict = new Map(NOTE_DICTIONARY.map((d) => [d.id, d]));
const curatedNoteRows = readCsv("notes.csv");
const curatedNoteIds = new Set(curatedNoteRows.map((r) => r.id));
const notes: Note[] = [...curatedNoteRows, ...collected("notes.csv").filter((r) => !curatedNoteIds.has(r.id))].map((r) => ({
  id: r.id, slug: bi(r, "slug"), name: bi(r, "name"), family: r.family, edwards: r.edwards || dict.get(r.id)?.edwards || "",
  description: bi(r, "description"), citations: fieldCitations(`note ${r.id}`, r.citations),
}));
checkTax("notes", "character", [...new Set(notes.map((n) => n.family))]);
const noteIds = new Set(notes.map((n) => n.id));
const originIds = new Set(origins.map((o) => o.id));
const houseIds = new Set(houses.map((h) => h.id));

function noteRefs(owner: string, v: string): NoteRef[] {
  return list(v).map((s) => {
    const [note, origin] = s.split("@");
    if (!noteIds.has(note)) errors.push(`${owner}: unknown note "${note}"`);
    if (origin && !tax("origin_group").has(origin)) errors.push(`${owner}: unknown origin qualifier "${origin}"`);
    return origin ? { note, origin } : { note };
  });
}

const pricesBy: Record<string, Product["prices"]> = {};
const curatedRows = readCsv("products.csv");
const curatedKeys = new Set(curatedRows.map((r) => `${r.house_id}|${slugify(r.name_en)}`));
const collectedRows = collected("products.csv").filter((r) => !curatedKeys.has(`${r.house_id}|${slugify(r.name_en)}`) && !curatedRows.some((c) => c.id === r.id));
const keptIds = new Set([...curatedRows, ...collectedRows].map((r) => r.id));
for (const r of [...readCsv("prices.csv"), ...collected("prices.csv")].filter((x) => keptIds.has(x.product_id))) {
  if (!citations[r.citation_id]) errors.push(`price ${r.product_id}: unknown citation "${r.citation_id}"`);
  if (!r.observed_on) errors.push(`price ${r.product_id}: observed_on is required`);
  (pricesBy[r.product_id] ??= []).push({
    min: Number(r.price_min), max: Number(r.price_max || r.price_min), currency: r.currency,
    sizeText: bi(r, "size_text"), observedOn: r.observed_on, citationId: r.citation_id, note: bi(r, "note"),
  });
}

function edwardsFamily(refs: NoteRef[]): string {
  const ids = [...new Set(refs.map((x) => x.note))];
  if (ids.length < 3) return "";
  const score = new Map<string, number>();
  for (const id of ids) { const e = notes.find((n) => n.id === id)?.edwards; if (e) score.set(e, (score.get(e) ?? 0) + 1); }
  const order = (taxonomy.family ?? []).map((t) => t.id);
  return [...score.entries()].sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))[0]?.[0] ?? "";
}

const products: Product[] = [...curatedRows.map((r): Record<string, string> => ({ ...r, source: "curated" })), ...collectedRows].map((r) => {
  const owner = `product ${r.id}`;
  if (!houseIds.has(r.house_id)) errors.push(`${owner}: unknown house "${r.house_id}"`);
  checkTax(owner, "category", [r.category]);
  checkTax(owner, "origin_group", list(r.origins));
  checkTax(owner, "occasion", list(r.occasions));
  checkTax(owner, "season", list(r.seasons));
  if (r.wild_status) checkTax(owner, "wild_status", [r.wild_status]);
  if (r.size_unit) checkTax(owner, "unit", [r.size_unit]);
  if (r.concentration) checkTax(owner, "concentration", [r.concentration]);
  if (r.gender) checkTax(owner, "gender", [r.gender]);
  const nt = { top: noteRefs(owner, r.notes_top), heart: noteRefs(owner, r.notes_heart), base: noteRefs(owner, r.notes_base) };
  return {
    id: r.id, slug: bi(r, "slug"), name: bi(r, "name"), houseId: r.house_id, category: r.category,
    origins: list(r.origins), wildStatus: r.wild_status || "undocumented",
    notes: nt,
    description: bi(r, "description"), occasions: list(r.occasions), seasons: list(r.seasons),
    size: { value: r.size_value ? Number(r.size_value) : null, unit: r.size_unit, note: bi(r, "size_note") },
    officialUrl: r.official_url, prices: pricesBy[r.id] ?? [], citations: fieldCitations(owner, r.citations),
    concentration: r.concentration ?? "", gender: r.gender ?? "", family: edwardsFamily([...nt.top, ...nt.heart, ...nt.base]),
    source: (r.source === "collected" ? "collected" : "curated") as Product["source"],
  };
});

const articles: Article[] = readCsv("articles.csv").map((r) => {
  const cited = new Set<string>();
  for (const m of `${r.body_ar}\n${r.body_en}`.matchAll(/\{\{cite:([\w-]+)\}\}/g)) cited.add(m[1]);
  for (const c of cited) if (!citations[c]) errors.push(`article ${r.id}: unknown citation "${c}"`);
  if (r.kind !== "culture" && r.kind !== "guide") errors.push(`article ${r.id}: kind must be culture|guide`);
  return {
    id: r.id, kind: r.kind as Article["kind"], slug: bi(r, "slug"), title: bi(r, "title"), summary: bi(r, "summary"),
    body: bi(r, "body"), citations: [...cited], updated: r.updated,
  };
});

// Slugs must be unique per locale within a type, and must not contain "/".
function checkSlugs(kind: string, items: { id: string; slug: Bi }[]) {
  for (const loc of ["ar", "en"] as const) {
    const seen = new Set<string>();
    for (const it of items) {
      const s = it.slug[loc];
      if (!s || s.includes("/")) errors.push(`${kind} ${it.id}: invalid ${loc} slug`);
      if (seen.has(s)) errors.push(`${kind} ${it.id}: duplicate ${loc} slug "${s}"`);
      seen.add(s);
    }
  }
}
checkSlugs("house", houses); checkSlugs("origin", origins); checkSlugs("note", notes); checkSlugs("product", products); checkSlugs("article", articles);
void originIds;

if (errors.length) {
  console.error("Content validation failed:\n - " + errors.join("\n - "));
  process.exit(1);
}

const content: Content = { generatedAt: new Date().toISOString(), citations, taxonomy, houses, products, origins, notes, articles };
fs.mkdirSync(path.join(process.cwd(), "src", "generated"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "src", "generated", "content.json"), JSON.stringify(content));

// ---- search index -------------------------------------------------------
const taxName = (type: string, id: string) => taxonomy[type]?.find((t) => t.id === id)?.name ?? { ar: id, en: id };
const tk = (...parts: string[]) => [...new Set(parts.flatMap((p) => tokenize(p)))];
const bothHref = (route: (typeof ENTITY_ROUTES)[keyof typeof ENTITY_ROUTES], slug: Bi) => ({
  ar: href("ar", route, { slug: slug.ar }),
  en: href("en", route, { slug: slug.en }),
});
const docs: SearchDoc[] = [];
for (const p of products) {
  const h = houses.find((x) => x.id === p.houseId)!;
  const cat = taxName("category", p.category);
  const allNotes = [...p.notes.top, ...p.notes.heart, ...p.notes.base].map((n) => notes.find((x) => x.id === n.note)!.name);
  const orig = p.origins.map((o) => taxName("origin_group", o));
  docs.push({
    kind: "product", id: p.id, href: bothHref(ENTITY_ROUTES.product, p.slug), title: p.name,
    subtitle: { ar: `${h.name.ar} · ${cat.ar}`, en: `${h.name.en} · ${cat.en}` },
    n: tk(p.name.ar, p.name.en),
    m: tk(h.name.ar, h.name.en, cat.ar, cat.en, ...orig.flatMap((o) => [o.ar, o.en]), ...allNotes.flatMap((n) => [n.ar, n.en])),
    b: tk(p.description.ar, p.description.en),
  });
}
for (const h of houses) docs.push({ kind: "house", id: h.id, href: bothHref(ENTITY_ROUTES.house, h.slug), title: h.name, subtitle: h.country, n: tk(h.name.ar, h.name.en), m: tk(h.country.ar, h.country.en, h.city.ar, h.city.en), b: tk(h.history.ar, h.history.en) });
for (const o of origins) docs.push({ kind: "origin", id: o.id, href: bothHref(ENTITY_ROUTES.origin, o.slug), title: o.name, subtitle: o.region, n: tk(o.name.ar, o.name.en), m: tk(o.region.ar, o.region.en, o.species), b: tk(o.profile.ar, o.profile.en, o.smell.ar, o.smell.en) });
for (const n of notes) docs.push({ kind: "note", id: n.id, href: bothHref(ENTITY_ROUTES.note, n.slug), title: n.name, subtitle: taxName("character", n.family), n: tk(n.name.ar, n.name.en), m: [], b: tk(n.description.ar, n.description.en) });
for (const a of articles) docs.push({ kind: a.kind, id: a.id, href: bothHref(ENTITY_ROUTES[a.kind], a.slug), title: a.title, subtitle: a.summary, n: tk(a.title.ar, a.title.en), m: tk(a.summary.ar, a.summary.en), b: tk(a.body.ar.replace(/\{\{cite:[\w-]+\}\}/g, ""), a.body.en.replace(/\{\{cite:[\w-]+\}\}/g, "")) });
fs.mkdirSync(path.join(process.cwd(), "public"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "public", "search-index.json"), JSON.stringify(docs));

console.log(`content: ${products.length} products, ${houses.length} houses, ${origins.length} origins, ${notes.length} notes, ${articles.length} articles, ${Object.keys(citations).length} citations; ${docs.length} search docs`);
