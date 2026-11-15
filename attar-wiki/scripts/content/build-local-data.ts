/**
 * Compiles seed/*.csv into src/generated/local-data.json, validated with the same
 * schemas as the Supabase importer. The site serves this bundle whenever Supabase
 * is not configured, so a fresh deploy shows real, cited content.
 *
 *   npx tsx scripts/content/build-local-data.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { SCHEMAS, type EntityName } from "../import/schemas";

const dir = path.resolve("seed");
const out = path.resolve("src/generated/local-data.json");
const GENERATED_AT = process.env.SEED_DATE ?? "2026-11-15T00:00:00.000Z";

/** Deterministic UUID-shaped id from a key (stable across builds). */
function sid(key: string) {
  const h = createHash("sha1").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function load(entity: EntityName): Promise<Row[]> {
  const { file, schema } = SCHEMAS[entity];
  const full = path.join(dir, file);
  if (!existsSync(full)) return [];
  const rows = parse(await readFile(full, "utf-8"), { columns: true, skip_empty_lines: true, trim: true, bom: true }) as Record<string, string>[];
  return rows.map((r, i) => {
    const p = schema.safeParse(r);
    if (!p.success) throw new Error(`${file} line ${i + 2}: ${p.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
    return p.data as Row;
  });
}

async function main() {
  const base = { created_at: GENERATED_AT, updated_at: GENERATED_AT };
  const regions: Row[] = (await load("regions")).map((r) => ({ id: sid(`region:${r.slug}`), ...r, ...base }));
  const regionId = (s?: unknown) => (s ? regions.find((r) => r.slug === s)?.id ?? null : null);
  const houses: Row[] = (await load("houses")).map(({ region_slug, ...r }) => ({ id: sid(`house:${r.slug}`), ...r, region_id: regionId(region_slug), ...base }));
  const houseId = (s?: unknown) => (s ? houses.find((r) => r.slug === s)?.id ?? null : null);
  const notes: Row[] = (await load("notes")).map((r) => ({ id: sid(`note:${r.slug}`), ...r, ...base }));
  const attars: Row[] = (await load("attars")).map(({ house_slug, region_slug, ...r }) => ({
    id: sid(`attar:${r.slug}`),
    ...r,
    house_id: houseId(house_slug),
    region_id: regionId(region_slug),
    ...base,
  }));
  const attarId = (s: unknown) => attars.find((a) => a.slug === s)?.id;
  const noteId = (s: unknown) => notes.find((a) => a.slug === s)?.id;
  const attar_notes = (await load("attar_notes")).map((r, i) => {
    const a = attarId(r.attar_slug), n = noteId(r.note_slug);
    if (!a || !n) throw new Error(`attar_notes row ${i + 2}: unknown slug`);
    return { attar_id: a, note_id: n, position: r.position, sort_order: (r.sort_order as number | null) ?? i + 1 };
  });
  const attar_relations = (await load("attar_relations")).map((r, i) => ({
    id: sid(`rel:${i}:${r.attar_slug}`),
    attar_id: attarId(r.attar_slug)!,
    related_attar_id: r.related_attar_slug ? attarId(r.related_attar_slug) ?? null : null,
    external_name: r.external_name ?? null,
    relation: r.relation,
    note: r.note ?? null,
  }));
  const price_reports = (await load("price_reports")).map(({ attar_slug, ...r }, i) => ({ id: sid(`price:${i}`), attar_id: attarId(attar_slug)!, ...r }));
  const glossary: Row[] = (await load("glossary")).map((r) => ({ id: sid(`glossary:${r.slug}`), ...r, ...base }));
  const guides: Row[] = await Promise.all(
    (await load("guides")).map(async ({ body_file, ...r }) => ({
      id: sid(`guide:${r.slug}`),
      ...r,
      body: body_file ? await readFile(path.join(dir, "guides", body_file as string), "utf-8") : null,
      ...base,
    })),
  );
  const tables: Record<string, Row[]> = { attar: attars, house: houses, note: notes, region: regions, glossary, guide: guides };
  const citations = (await load("citations")).map(({ entity_slug, ...r }, i) => {
    const target = tables[r.entity_type as string].find((x) => x.slug === entity_slug);
    if (!target) throw new Error(`citations row ${i + 2}: unknown ${r.entity_type} "${entity_slug}"`);
    return { id: sid(`cite:${i}`), ...r, entity_id: target.id, sort_order: i };
  });

  const data = { generatedAt: GENERATED_AT, regions, houses, notes, attars, attar_notes, attar_relations, price_reports, glossary, guides, citations };
  await writeFile(out, JSON.stringify(data, null, 1) + "\n");
  console.log(`local data: ${attars.length} attars, ${notes.length} notes, ${houses.length} houses, ${regions.length} regions, ${glossary.length} glossary, ${guides.length} guides, ${citations.length} citations → ${path.relative(process.cwd(), out)}`);
}

main().catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exit(1);
});
