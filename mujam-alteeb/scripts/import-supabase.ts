/**
 * Imports data/csv/*.csv into Supabase (idempotent upserts) and records a "seed" revision
 * for every entity so the history page starts from the documented import.
 *
 *   npm run import:supabase            # upsert through the Supabase API (needs SUPABASE_SERVICE_ROLE_KEY)
 *   npm run import:supabase -- --sql   # print plain SQL instead (pipe into psql or the SQL editor)
 *
 * Validation runs first through build-content, so broken references never reach the database.
 */
import { execSync } from "node:child_process";
import { readCsv, list } from "./csv";
import { snapshotOf } from "../src/lib/snapshot";
import content from "../src/generated/content.json";
import type { Content, EntityType } from "../src/lib/types";

execSync("npx tsx scripts/build-content.ts", { stdio: ["ignore", process.stderr, "inherit"] });
const c = content as unknown as Content;
type Row = Record<string, unknown>;

const n = (v: string) => (v === "" ? null : Number(v));
const arr = (v: string) => list(v);

const tables: { table: string; key: string; rows: Row[] }[] = [
  { table: "citations", key: "id", rows: readCsv("citations.csv").map((r) => ({ id: r.id, url: r.url, title: r.title, publisher: r.publisher, accessed: r.accessed, quote: r.quote })) },
  { table: "taxonomy", key: "type,id", rows: readCsv("taxonomy.csv").map((r) => ({ type: r.type, id: r.id, name_ar: r.name_ar, name_en: r.name_en, sort_order: Number(r.order) || 0 })) },
  { table: "houses", key: "id", rows: readCsv("houses.csv").map(({ citations: _c, founded_year, ...r }) => ({ ...r, founded_year: n(founded_year) })) },
  { table: "origins", key: "id", rows: readCsv("origins.csv").map(({ citations: _c, ...r }) => r) },
  { table: "notes", key: "id", rows: readCsv("notes.csv").map(({ citations: _c, ...r }) => r) },
  { table: "products", key: "id", rows: readCsv("products.csv").map(({ citations: _c, ...r }) => ({ ...r, origins: arr(r.origins), notes_top: arr(r.notes_top), notes_heart: arr(r.notes_heart), notes_base: arr(r.notes_base), occasions: arr(r.occasions), seasons: arr(r.seasons), size_value: n(r.size_value), wild_status: r.wild_status || "undocumented" })) },
  { table: "articles", key: "id", rows: readCsv("articles.csv").map(({ citations: _c, ...r }) => r) },
];

const entityCitations: Row[] = [];
const addCites = (type: string, file: string) => {
  for (const r of readCsv(file)) for (const pair of list(r.citations)) {
    const [field, cid] = pair.split(":");
    entityCitations.push({ entity_type: type, entity_id: r.id, field, citation_id: cid });
  }
};
addCites("house", "houses.csv"); addCites("origin", "origins.csv"); addCites("note", "notes.csv"); addCites("product", "products.csv");
for (const a of c.articles) for (const cid of a.citations) entityCitations.push({ entity_type: a.kind, entity_id: a.id, field: "body", citation_id: cid });
tables.push({ table: "entity_citations", key: "entity_type,entity_id,field,citation_id", rows: entityCitations });

const prices = readCsv("prices.csv").map((r) => ({ product_id: r.product_id, price_min: Number(r.price_min), price_max: Number(r.price_max || r.price_min), currency: r.currency, size_text_ar: r.size_text_ar, size_text_en: r.size_text_en, observed_on: r.observed_on, citation_id: r.citation_id, note_ar: r.note_ar, note_en: r.note_en }));

const seeds: Row[] = [];
const seed = (type: EntityType, items: { id: string }[]) => {
  for (const e of items) seeds.push({ entity_type: type, entity_id: e.id, op: "seed", status: "approved", summary: "CSV import", snapshot: snapshotOf(type, e as never), citations: [] });
};
seed("product", c.products); seed("house", c.houses); seed("origin", c.origins); seed("note", c.notes);
seed("culture", c.articles.filter((a) => a.kind === "culture")); seed("guide", c.articles.filter((a) => a.kind === "guide"));

// ---------------------------------------------------------------- SQL mode
const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return `array[${v.map(lit).join(",")}]::text[]`;
  if (typeof v === "object") return `${lit(JSON.stringify(v))}::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
function insertSql(table: string, key: string, rows: Row[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const upd = cols.filter((k) => !key.split(",").includes(k)).map((k) => `${k} = excluded.${k}`).join(", ");
  return rows.map((r) => `insert into public.${table} (${cols.join(",")}) values (${cols.map((k) => lit(r[k])).join(",")}) on conflict (${key}) do ${upd ? `update set ${upd}` : "nothing"};`).join("\n");
}

async function main() {
  if (process.argv.includes("--sql")) {
    const out = ["begin;", ...tables.map((t) => insertSql(t.table, t.key, t.rows)),
      `delete from public.prices where product_id in (${[...new Set(prices.map((p) => lit(p.product_id)))].join(",") || "''"});`,
      insertSql("prices", "id", prices).replace(/ on conflict \(id\) do update set [^;]+;/g, ";"),
      "delete from public.revisions where op = 'seed';",
      seeds.map((s) => `insert into public.revisions (entity_type, entity_id, op, status, summary, snapshot, citations) values (${[s.entity_type, s.entity_id, s.op, s.status, s.summary].map(lit).join(",")}, ${lit(s.snapshot)}, '[]'::jsonb);`).join("\n"),
      "commit;"];
    process.stdout.write(out.join("\n") + "\n");
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use --sql."); process.exit(1); }
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  for (const t of tables) {
    for (let i = 0; i < t.rows.length; i += 500) {
      const { error } = await sb.from(t.table).upsert(t.rows.slice(i, i + 500), { onConflict: t.key });
      if (error) throw new Error(`${t.table}: ${error.message}`);
    }
    console.log(`✓ ${t.table}: ${t.rows.length}`);
  }
  await sb.from("prices").delete().in("product_id", [...new Set(prices.map((p) => p.product_id))]);
  const pr = await sb.from("prices").insert(prices);
  if (pr.error) throw new Error(`prices: ${pr.error.message}`);
  console.log(`✓ prices: ${prices.length}`);
  await sb.from("revisions").delete().eq("op", "seed");
  const rv = await sb.from("revisions").insert(seeds);
  if (rv.error) throw new Error(`revisions: ${rv.error.message}`);
  console.log(`✓ seed revisions: ${seeds.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
