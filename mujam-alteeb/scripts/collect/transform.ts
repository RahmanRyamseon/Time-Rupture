/**
 * data/raw/*.json (official store feeds) → data/csv/collected/*.csv
 *
 * Rules (see /about and /citation-policy):
 *  - Only fields the house itself publishes: name, listed notes, sizes, concentration, price, gender.
 *  - Notes are kept only on an exact dictionary match (scripts/collect/note-dictionary.ts).
 *  - Descriptions are composed from those fields; the store's marketing text is never copied.
 *  - Every product cites its official product page with the fetch date.
 *  - Images are not imported (image policy: licence or written permission required).
 */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { EDWARDS, matchNote, NOTE_DICTIONARY, type Edwards } from "./note-dictionary";
import { slugify } from "../../src/lib/normalize";

type Raw = { store: { key: string; houseId: string; host: string; region: string }; currency: string; fetchedAt: string; products: RawProduct[] };
type RawProduct = { id: number; title: string; handle: string; body_html: string | null; product_type: string; tags: string[] | string; variants: { title: string; price: string; available?: boolean }[] };

const RAW = path.join(process.cwd(), "data", "raw");
const OUT = path.join(process.cwd(), "data", "csv", "collected");
const HOUSES: Record<string, { ar: string; en: string }> = {
  "swiss-arabian": { ar: "سويس أرابيان", en: "Swiss Arabian" }, ajmal: { ar: "أجمل", en: "Ajmal" }, lattafa: { ar: "لطافة", en: "Lattafa" },
  afnan: { ar: "أفنان", en: "Afnan" }, khadlaj: { ar: "خدلج", en: "Khadlaj" }, "ibrahim-al-qurashi": { ar: "إبراهيم القرشي", en: "Ibrahim Al Qurashi" }, amouage: { ar: "أمواج", en: "Amouage" },
};

const EXCLUDE = /\b(body lotion|lotion|shower|gel|deodorant|deo\b|hair mist|hair perfume|air freshener|room spray|home fragrance|home spray|candle|gift|giftset|set of|\bset\b|discovery|travel|sample|tester|package protection|complimentary|bundle|kit\b|box\b|pouch|burner|mabkhara|mubkhar|accessor|diffuser|soap|cream|shampoo|car (perfume|freshener)|fabric|linen|wipes|hand wash|sanitizer|pack of|combo|collection of|duo|trio)\b/i;

function text(html: string | null): string {
  return (html ?? "").replace(/<(br|\/p|\/li|\/div|\/h\d)[^>]*>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;|&rsquo;/g, "'").replace(/&[a-z]+;/g, " ");
}

function classify(p: RawProduct, body: string): { category: string; concentration: string } | null {
  const tags = (Array.isArray(p.tags) ? p.tags.join(" ") : p.tags ?? "");
  const all = `${p.title} ${p.product_type} ${tags}`;
  if (EXCLUDE.test(all) || /complimentary|package protection/i.test(p.product_type)) return null;
  const lower = all.toLowerCase();
  const isOil = /\b(cpo|concentrated|perfume oil|oil perfume|attar|dehn|dahn|dhan|dehnal|oil\b|roll[- ]?on|essential oils)\b/i.test(all);
  if (/\b(bakhoor|bukhoor|dakhoon|dukhoon|incense|mamool|muattar|moattar)\b/i.test(all)) return { category: "bakhoor", concentration: "" };
  if (/\b(oud (chips|wood|pieces)|agarwood chips|oud sticks)\b/i.test(all)) return { category: "oud-wood", concentration: "" };
  if (isOil) {
    let category = "perfume-oil-other";
    if (/mukhall?at/i.test(lower)) category = "mukhallat";
    else if (/\b(dehn|dahn|dhan|dehnal|dahnal) ?(al|el)? ?(oud|oudh)|oud oil\b/i.test(all) || /DEHN AL OUDH/.test(p.product_type)) category = "dehn-al-oud";
    else if (/\bmusk\b/i.test(p.title)) category = "musk-oil";
    else if (/\b(rose|ward|taif)\b/i.test(p.title)) category = "rose-oil";
    return { category, concentration: "oil" };
  }
  let concentration = "";
  if (/extrait/i.test(all)) concentration = "extrait";
  else if (/\bparfum\b(?! de)|\bparfum$/i.test(p.title) && !/eau de/i.test(all)) concentration = "parfum";
  else if (/eau de parfum|\bedp\b/i.test(all) || /eau de parfum/i.test(body.slice(0, 400))) concentration = "edp";
  else if (/eau de toilette|\bedt\b/i.test(all)) concentration = "edt";
  else if (/cologne/i.test(all)) concentration = "cologne";
  if (concentration || /\b(perfume|spray|fragrance|unisex|men|women)\b/i.test(`${p.product_type} ${tags}`)) return { category: "perfume-spray", concentration };
  return null;
}

const ORIGIN_RE: [RegExp, string][] = [
  [/\b(cambodi|cambodian|combodi|kambodi|cambodia)\b/i, "cambodi"], [/\b(hindi|indian|assam|assami)\b/i, "hindi"],
  [/\b(malaysian|malaysia)\b/i, "malaysian"], [/\b(thai|trat|thailand)\b/i, "thai"],
  [/\b(indonesian|indonesia|kalimantan|merauke|borneo)\b/i, "indonesian"], [/\b(vietnamese|vietnam)\b/i, "vietnamese"],
  [/\b(laotian|lao|laos)\b/i, "laotian"], [/\b(sri lankan|sri lanka)\b/i, "sri-lankan"],
];

function parseNotes(body: string): { top: string[]; heart: string[]; base: string[]; raw: string } {
  const out = { top: [] as string[], heart: [] as string[], base: [] as string[], raw: "" };
  const re = /(top notes?|head notes?|opening notes?|heart notes?|middle notes?|base notes?)\s*[:：]\s*\n*\s*([^\n]{2,300})/gi;
  let m: RegExpExecArray | null;
  const lines: string[] = [];
  while ((m = re.exec(body))) {
    const tier = /top|head|opening/i.test(m[1]) ? "top" : /heart|middle/i.test(m[1]) ? "heart" : "base";
    lines.push(`${m[1]}: ${m[2].trim()}`);
    for (const piece of m[2].split(/,|،|;| and | & |\+|\/|•| – | - /)) {
      const t = piece.trim();
      const og = t.match(/^(cambodian|indian|hindi|indonesian|malaysian|thai|laotian|vietnamese)\s+(oud|agarwood)$/i);
      let ref: string | undefined;
      if (og) ref = `oud@${ORIGIN_RE.find(([r]) => r.test(og[1]))![1]}`;
      else ref = matchNote(t)?.id;
      if (ref && !out[tier].includes(ref)) out[tier].push(ref);
    }
  }
  out.raw = lines.join(" · ").slice(0, 280);
  return out;
}

function sizes(p: RawProduct): { value: number; unit: string; price: number; label: string }[] {
  const out: { value: number; unit: string; price: number; label: string }[] = [];
  for (const v of p.variants) {
    const src = `${v.title} ${p.title}`;
    const m = src.match(/(\d+(?:\.\d+)?)\s*(ml|mls|g|gm|gms|gram|grams|tola)\b/i);
    if (!m) continue;
    const unit = /^g|gram/i.test(m[2]) ? "g" : /tola/i.test(m[2]) ? "tola" : "ml";
    out.push({ value: Number(m[1]), unit, price: Number(v.price), label: `${m[1]} ${unit}` });
  }
  return out.filter((x, i, a) => a.findIndex((y) => y.value === x.value && y.unit === x.unit) === i);
}

const baseName = (title: string) => title
  .replace(/\b\d+(\.\d+)?\s*(ml|mls|g|gm|gms|gram|grams|tola)\b/gi, "")
  .replace(/\b(edp|edt|eau de parfum|eau de toilette|extrait de parfum|cpo|concentrated perfume oil|perfume oil|perfume|sa|for (men|women|unisex)|unisex|spray|by [a-z ]+|swiss arabian|lattafa|afnan|khadlaj|ajmal|amouage|ibraq|ibrahim al qurashi)\b/gi, "")
  .replace(/[|()\-–]+/g, " ").replace(/\s+/g, " ").trim();
/** Keep the house's own casing; only re-case names published in ALL CAPS (keeping roman numerals and AM/PM). */
const titleCase = (s: string) => /[a-z]/.test(s) ? s : s.toLowerCase()
  .replace(/(^|\s|-)([a-z])/g, (_m, a, b) => a + b.toUpperCase())
  .replace(/\b(Ii|Iii|Iv|Vi|Vii|Viii|Ix|Xi|Xii|Am|Pm|Edp|Edt|Uae|Usa)\b/g, (w) => w.toUpperCase());

function family(notes: string[]): Edwards | "" {
  const score = new Map<Edwards, number>();
  const ids = notes.map((n) => n.split("@")[0]);
  for (const id of ids) {
    const d = NOTE_DICTIONARY.find((x) => x.id === id);
    if (d) score.set(d.edwards, (score.get(d.edwards) ?? 0) + 1);
  }
  if (ids.length < 3) return "";
  return ([...score.entries()].sort((a, b) => b[1] - a[1] || EDWARDS.findIndex((e) => e.id === a[0]) - EDWARDS.findIndex((e) => e.id === b[0]))[0]?.[0]) ?? "";
}

const CAT = {
  "dehn-al-oud": ["دهن عود", "a dehn al oud"], mukhallat: ["مخلّط", "a mukhallat"], "musk-oil": ["دهن مسك", "a musk oil"], "rose-oil": ["دهن ورد", "a rose oil"],
  bakhoor: ["بخور", "a bakhoor"], "oud-wood": ["عود (خشب)", "oud wood"], "perfume-oil-other": ["دهن عطري مركّز", "a concentrated perfume oil"], "perfume-spray": ["عطر بخّاخ", "a spray perfume"],
} as const;
const CONC: Record<string, [string, string]> = { extrait: ["خلاصة عطر (إكستريه)", "extrait de parfum"], parfum: ["بارفان", "parfum"], edp: ["أو دو بارفان", "eau de parfum"], edt: ["أو دو تواليت", "eau de toilette"], cologne: ["كولونيا", "cologne"], oil: ["دهن مركّز", "concentrated oil"] };

function main() {
  const dictName = new Map(NOTE_DICTIONARY.map((d) => [d.id, d]));
  const products = new Map<string, Record<string, string>>();
  const prices: Record<string, string>[] = [];
  const citations: Record<string, string>[] = [];
  const stats: Record<string, number> = {};
  const files = fs.readdirSync(RAW).filter((f) => f.endsWith(".json")).sort((a, b) => (a.includes("uae") ? -1 : b.includes("uae") ? 1 : a.localeCompare(b)));
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(RAW, f), "utf8")) as Raw;
    const house = HOUSES[raw.store.houseId];
    for (const p of raw.products) {
      const body = text(p.body_html);
      const cls = classify(p, body);
      if (!cls) { stats.excluded = (stats.excluded ?? 0) + 1; continue; }
      const name = titleCase(baseName(p.title)) || p.title;
      const id = `${raw.store.houseId}-${slugify(name)}`.slice(0, 90);
      const url = `https://${raw.store.host}/products/${p.handle}`;
      const cid = `src-${raw.store.key}-${p.id}`;
      const notes = parseNotes(body);
      const sz = sizes(p);
      const tags = Array.isArray(p.tags) ? p.tags : String(p.tags ?? "").split(",");
      const arName = tags.map((t) => t.trim()).find((t) => /^[؀-ۿ\s&\-0-9]+$/.test(t) && t.length > 2 && !/^(عطور|عطر|خصم|عرض)/.test(t)) ?? "";
      const gender = /\bwomen\b|\bfemme\b|\bher\b/i.test(`${p.product_type} ${tags.join(" ")}`) ? "women" : /\bmen\b|\bhomme\b|\bhim\b/i.test(`${p.product_type} ${tags.join(" ")}`) ? "men" : /unisex/i.test(`${p.title} ${p.product_type} ${tags.join(" ")}`) ? "unisex" : "";
      const origins = [...new Set([...ORIGIN_RE.filter(([r]) => r.test(p.title)).map(([, o]) => o), ...[...notes.top, ...notes.heart, ...notes.base].filter((x) => x.includes("@")).map((x) => x.split("@")[1])])];
      citations.push({ id: cid, url, title: p.title, publisher: `${house.en} (official ${raw.store.region} store)`, accessed: raw.fetchedAt, quote: notes.raw || p.title });
      for (const s of sz) if (s.price > 0) prices.push({ product_id: id, price_min: String(s.price), price_max: String(s.price), currency: raw.currency, size_text_ar: s.label.replace("ml", "مل").replace(" g", " غرام").replace("tola", "تولة"), size_text_en: s.label, observed_on: raw.fetchedAt, citation_id: cid, note_ar: `السعر المعروض على المتجر الرسمي (${raw.store.region})`, note_en: `Price shown on the official ${raw.store.region} store` });
      const existing = products.get(id);
      if (existing) { // same product in a second store: keep first, add its citation to name/size
        existing.citations += `|size:${cid}`;
        stats.merged = (stats.merged ?? 0) + 1;
        continue;
      }
      const allNotes = [...notes.top, ...notes.heart, ...notes.base];
      const fam = family(allNotes);
      const [catAr, catEn] = CAT[cls.category as keyof typeof CAT];
      const conc = CONC[cls.concentration];
      const sizeAr = sz.map((s) => s.label.replace("ml", "مل").replace(" g", " غرام").replace("tola", "تولة")).join(" و");
      const sizeEn = sz.map((s) => s.label).join(", ");
      const noteNames = (loc: "ar" | "en") => [...new Set(allNotes.map((r) => r.split("@")[0]))].slice(0, 6).map((r) => { const d = dictName.get(r.split("@")[0]); return loc === "ar" ? d?.ar : d?.en.toLowerCase(); }).filter(Boolean).join(loc === "ar" ? "، " : ", ");
      const descAr = `${catAr} من ${house.ar}${conc && cls.concentration !== "oil" ? ` بتركيز ${conc[0]}` : ""}${sizeAr ? `، يتوفر بحجم ${sizeAr}` : ""}.${allNotes.length ? ` تذكر الدار من نفحاته: ${noteNames("ar")}.` : ""}`;
      const descEn = `${catEn[0].toUpperCase() + catEn.slice(1)} by ${house.en}${conc && cls.concentration !== "oil" ? ` (${conc[1]})` : ""}${sizeEn ? `, available in ${sizeEn}` : ""}.${allNotes.length ? ` Notes listed by the house include ${noteNames("en")}.` : ""}`;
      const cites = [`name:${cid}`, `description:${cid}`];
      if (allNotes.length) cites.push(`notes:${cid}`);
      if (sz.length) cites.push(`size:${cid}`);
      if (origins.length) cites.push(`origins:${cid}`);
      if (gender) cites.push(`gender:${cid}`);
      if (cls.concentration) cites.push(`concentration:${cid}`);
      products.set(id, {
        id, slug_ar: arName ? slugify(arName) + "-" + slugify(name).slice(0, 30) : slugify(name), slug_en: slugify(name), name_ar: arName || name, name_en: name,
        house_id: raw.store.houseId, category: cls.category, origins: origins.join("|"), wild_status: "undocumented",
        notes_top: notes.top.join("|"), notes_heart: notes.heart.join("|"), notes_base: notes.base.join("|"),
        description_ar: descAr, description_en: descEn, occasions: "", seasons: "",
        size_value: sz[0] ? String(sz[0].value) : "", size_unit: sz[0]?.unit ?? "", size_note_ar: sz.length > 1 ? sizeAr : "", size_note_en: sz.length > 1 ? sizeEn : "",
        official_url: url, citations: cites.join("|"), concentration: cls.concentration, gender, family: fam, source: "collected",
      });
      stats[cls.category] = (stats[cls.category] ?? 0) + 1;
    }
  }
  // Unique slugs per locale
  for (const loc of ["slug_ar", "slug_en"] as const) {
    const seen = new Map<string, number>();
    for (const p of products.values()) { const n = seen.get(p[loc]) ?? 0; seen.set(p[loc], n + 1); if (n) p[loc] = `${p[loc]}-${p.house_id}${n > 1 ? n : ""}`; }
  }
  fs.mkdirSync(OUT, { recursive: true });
  const write = (name: string, rows: Record<string, string>[]) => fs.writeFileSync(path.join(OUT, name), Papa.unparse(rows, { newline: "\n" }) + "\n");
  write("products.csv", [...products.values()]);
  const ids = new Set(products.keys());
  write("prices.csv", prices.filter((p) => ids.has(p.product_id)));
  write("citations.csv", citations.filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i));
  const used = new Set([...products.values()].flatMap((p) => [p.notes_top, p.notes_heart, p.notes_base].join("|").split("|").filter(Boolean).map((x) => x.split("@")[0])));
  write("notes.csv", NOTE_DICTIONARY.filter((d) => used.has(d.id)).map((d) => ({ id: d.id, slug_ar: slugify(d.ar), slug_en: d.id, name_ar: d.ar, name_en: d.en, family: d.character, description_ar: "", description_en: "", citations: "", edwards: d.edwards })));
  console.log("products", products.size, stats, "prices", prices.length, "notes used", used.size);
}
main();
