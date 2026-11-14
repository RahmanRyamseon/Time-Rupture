/**
 * CSV importer for Attar Wiki.
 *
 *   npm run import -- <entity|all> [--dir seed] [--dry-run]
 *
 * entity: regions | houses | notes | attars | attar_notes | attar_relations |
 *         price_reports | glossary | guides | citations | media
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-side only;
 * never expose the service key to the browser). Upserts are idempotent (keyed on
 * slug or natural keys), so re-running an import updates rows instead of duplicating.
 * Every content change writes a revision via database triggers.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SCHEMAS, ENTITY_ORDER, type EntityName } from "./schemas";

const args = process.argv.slice(2);
const target = (args.find((a) => !a.startsWith("--")) ?? "all") as EntityName | "all";
const dryRun = args.includes("--dry-run");
const dirIdx = args.indexOf("--dir");
const dir = path.resolve(dirIdx >= 0 ? args[dirIdx + 1] : "seed");

class ImportError extends Error {}

async function readCsv(file: string): Promise<Record<string, string>[]> {
  const full = path.join(dir, file);
  if (!existsSync(full)) return [];
  const text = await readFile(full, "utf-8");
  return parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: false });
}

function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ImportError("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** slug -> id lookup with caching per table. */
const idCache = new Map<string, Map<string, string>>();
async function idMap(supabase: SupabaseClient | null, table: string): Promise<Map<string, string>> {
  if (idCache.has(table)) return idCache.get(table)!;
  const map = new Map<string, string>();
  if (supabase) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select("id, slug").range(from, from + 999);
      if (error) throw new ImportError(`${table}: ${error.message}`);
      data.forEach((r) => map.set(r.slug as string, r.id as string));
      if (data.length < 1000) break;
    }
  }
  idCache.set(table, map);
  return map;
}

/** In dry-run mode, slugs defined in earlier CSVs count as resolvable. */
const pendingSlugs = new Map<string, Set<string>>();
function rememberSlugs(table: string, rows: { slug?: string }[]) {
  const set = pendingSlugs.get(table) ?? new Set();
  rows.forEach((r) => r.slug && set.add(r.slug));
  pendingSlugs.set(table, set);
}

async function resolve(supabase: SupabaseClient | null, table: string, slug: string | null | undefined, ctx: string) {
  if (!slug) return null;
  const map = await idMap(supabase, table);
  const id = map.get(slug);
  if (id) return id;
  if (dryRun && pendingSlugs.get(table)?.has(slug)) return `dry-run:${slug}`;
  throw new ImportError(`${ctx}: unknown ${table} slug "${slug}"`);
}

function validate<T extends z.ZodType>(entity: EntityName, rows: Record<string, string>[], schema: T): z.infer<T>[] {
  const out: z.infer<T>[] = [];
  const errors: string[] = [];
  const allowed = new Set(Object.keys((schema as unknown as z.ZodObject).shape ?? {}));
  const unknown = Object.keys(rows[0] ?? {}).filter((k) => !allowed.has(k));
  if (unknown.length) throw new ImportError(`${entity}.csv has unknown column(s): ${unknown.join(", ")}. Expected: ${[...allowed].join(", ")}`);
  rows.forEach((row, i) => {
    const parsed = schema.safeParse(row);
    if (parsed.success) out.push(parsed.data);
    else {
      const issues = parsed.error.issues.map((iss) => `${iss.path.join(".") || "(row)"}: ${iss.message}`).join("; ");
      errors.push(`  line ${i + 2}: ${issues}`); // +2 = header + 1-based
    }
  });
  if (errors.length) throw new ImportError(`${entity}.csv has ${errors.length} invalid row(s):\n${errors.slice(0, 50).join("\n")}`);
  return out;
}

function chunk<T>(arr: T[], size = 500): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

async function upsert(supabase: SupabaseClient | null, table: string, rows: Record<string, unknown>[], onConflict: string) {
  if (dryRun || !supabase || rows.length === 0) return;
  for (const part of chunk(rows)) {
    const { error } = await supabase.from(table).upsert(part, { onConflict });
    if (error) throw new ImportError(`${table}: ${error.message}`);
  }
  idCache.delete(table);
}

const touchedAttars = new Set<string>();

async function importEntity(supabase: SupabaseClient | null, entity: EntityName) {
  const def = SCHEMAS[entity];
  const raw = await readCsv(def.file);
  if (raw.length === 0) {
    console.log(`- ${entity}: no rows in ${def.file}, skipped`);
    return;
  }
  const rows = validate(entity, raw, def.schema) as Record<string, unknown>[];
  const ctx = (i: number) => `${def.file} line ${i + 2}`;

  switch (entity) {
    case "regions":
    case "notes":
    case "glossary": {
      rememberSlugs(entity, rows as { slug: string }[]);
      await upsert(supabase, entity, rows, "slug");
      break;
    }
    case "houses": {
      const out = [];
      for (const [i, r] of rows.entries()) {
        const { region_slug, ...rest } = r as { region_slug?: string };
        out.push({ ...rest, region_id: await resolve(supabase, "regions", region_slug, ctx(i)) });
      }
      rememberSlugs("houses", rows as { slug: string }[]);
      await upsert(supabase, "houses", out, "slug");
      break;
    }
    case "attars": {
      const out = [];
      for (const [i, r] of rows.entries()) {
        const { house_slug, region_slug, ...rest } = r as { house_slug?: string; region_slug?: string };
        out.push({
          ...rest,
          house_id: await resolve(supabase, "houses", house_slug, ctx(i)),
          region_id: await resolve(supabase, "regions", region_slug, ctx(i)),
        });
      }
      rememberSlugs("attars", rows as { slug: string }[]);
      await upsert(supabase, "attars", out, "slug");
      break;
    }
    case "attar_notes": {
      const byAttar = new Map<string, Record<string, unknown>[]>();
      for (const [i, r] of rows.entries()) {
        const x = r as { attar_slug: string; note_slug: string; position: string; sort_order?: number };
        const attarId = await resolve(supabase, "attars", x.attar_slug, ctx(i));
        const noteId = await resolve(supabase, "notes", x.note_slug, ctx(i));
        const list = byAttar.get(attarId!) ?? [];
        list.push({ attar_id: attarId, note_id: noteId, position: x.position, sort_order: x.sort_order ?? list.length + 1 });
        byAttar.set(attarId!, list);
      }
      if (!dryRun && supabase) {
        // Each attar listed in the file gets exactly the notes in the file.
        for (const [attarId, list] of byAttar) {
          const del = await supabase.from("attar_notes").delete().eq("attar_id", attarId);
          if (del.error) throw new ImportError(`attar_notes: ${del.error.message}`);
          const ins = await supabase.from("attar_notes").insert(list);
          if (ins.error) throw new ImportError(`attar_notes: ${ins.error.message}`);
          touchedAttars.add(attarId);
        }
      }
      break;
    }
    case "attar_relations": {
      const byAttar = new Map<string, Record<string, unknown>[]>();
      for (const [i, r] of rows.entries()) {
        const x = r as { attar_slug: string; relation: string; related_attar_slug?: string; external_name?: string; note?: string };
        const attarId = await resolve(supabase, "attars", x.attar_slug, ctx(i));
        const relatedId = await resolve(supabase, "attars", x.related_attar_slug, ctx(i));
        const list = byAttar.get(attarId!) ?? [];
        list.push({ attar_id: attarId, related_attar_id: relatedId, external_name: x.external_name ?? null, relation: x.relation, note: x.note ?? null });
        byAttar.set(attarId!, list);
      }
      if (!dryRun && supabase) {
        for (const [attarId, list] of byAttar) {
          await supabase.from("attar_relations").delete().eq("attar_id", attarId);
          const ins = await supabase.from("attar_relations").insert(list);
          if (ins.error) throw new ImportError(`attar_relations: ${ins.error.message}`);
          touchedAttars.add(attarId);
        }
      }
      break;
    }
    case "price_reports": {
      const out: Record<string, unknown>[] = [];
      for (const [i, r] of rows.entries()) {
        const { attar_slug, ...rest } = r as { attar_slug: string };
        const attarId = await resolve(supabase, "attars", attar_slug, ctx(i));
        out.push({ ...rest, attar_id: attarId });
        if (attarId) touchedAttars.add(attarId);
      }
      if (!dryRun && supabase) {
        // Skip exact duplicates already present (same attar, date, source, range).
        for (const p of out) {
          const { data } = await supabase
            .from("price_reports")
            .select("id")
            .eq("attar_id", p.attar_id as string)
            .eq("reported_on", p.reported_on as string)
            .eq("source_name", p.source_name as string)
            .eq("price_min_inr", p.price_min_inr as number)
            .eq("price_max_inr", p.price_max_inr as number)
            .limit(1);
          if (data?.length) continue;
          const ins = await supabase.from("price_reports").insert(p);
          if (ins.error) throw new ImportError(`price_reports: ${ins.error.message}`);
        }
      }
      break;
    }
    case "guides": {
      const out = [];
      for (const [i, r] of rows.entries()) {
        const { body_file, ...rest } = r as { body_file?: string };
        let body: string | null = null;
        if (body_file) {
          const p = path.join(dir, "guides", body_file);
          if (!existsSync(p)) throw new ImportError(`${ctx(i)}: body_file not found: guides/${body_file}`);
          body = await readFile(p, "utf-8");
        }
        out.push({ ...rest, body });
      }
      rememberSlugs("guides", rows as { slug: string }[]);
      await upsert(supabase, "guides", out, "slug");
      break;
    }
    case "citations": {
      const tableFor: Record<string, string> = { attar: "attars", house: "houses", note: "notes", region: "regions", glossary: "glossary", guide: "guides" };
      const out = [];
      for (const [i, r] of rows.entries()) {
        const { entity_slug, ...rest } = r as { entity_type: string; entity_slug: string };
        const id = await resolve(supabase, tableFor[rest.entity_type], entity_slug, ctx(i));
        out.push({ ...rest, entity_id: id });
        if (rest.entity_type === "attar" && id) touchedAttars.add(id);
      }
      await upsert(supabase, "citations", out, "entity_type,entity_id,field_name,url");
      break;
    }
    case "media": {
      const tableFor: Record<string, string> = { attar: "attars", house: "houses", note: "notes", region: "regions", glossary: "glossary", guide: "guides" };
      const mime: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };
      for (const [i, r] of rows.entries()) {
        const x = r as Record<string, string | boolean | null> & { entity_type: string; entity_slug: string; file: string };
        const id = await resolve(supabase, tableFor[x.entity_type], x.entity_slug, ctx(i));
        const filePath = path.join(dir, "media", x.file);
        if (!existsSync(filePath)) throw new ImportError(`${ctx(i)}: file not found: media/${x.file}`);
        const ext = path.extname(filePath).toLowerCase();
        if (!mime[ext]) throw new ImportError(`${ctx(i)}: unsupported image type ${ext}`);
        if (dryRun || !supabase) continue;
        const storagePath = `seed/${x.entity_type}/${x.entity_slug}/${path.basename(x.file)}`;
        const buf = await readFile(filePath);
        const up = await supabase.storage.from("media").upload(storagePath, buf, { contentType: mime[ext], upsert: true });
        if (up.error) throw new ImportError(`${ctx(i)}: upload failed: ${up.error.message}`);
        const { error } = await supabase.from("media").upsert(
          {
            entity_type: x.entity_type,
            entity_id: id,
            storage_path: storagePath,
            alt: x.alt,
            license: x.license,
            credit: x.credit,
            source_url: x.source_url ?? null,
            permission_note: x.permission_note ?? null,
            is_primary: Boolean(x.is_primary),
            status: "approved", // imported by an operator from a vetted CSV
          },
          { onConflict: "storage_path" },
        );
        if (error) throw new ImportError(`${ctx(i)}: ${error.message}`);
      }
      break;
    }
  }
  console.log(`✓ ${entity}: ${rows.length} row(s) ${dryRun ? "validated" : "imported"}`);
}

async function main() {
  const entities = target === "all" ? ENTITY_ORDER : [target];
  for (const e of entities) if (!SCHEMAS[e as EntityName]) throw new ImportError(`Unknown entity "${e}". Use one of: ${ENTITY_ORDER.join(", ")}, all`);
  const supabase = dryRun && !process.env.SUPABASE_SERVICE_ROLE_KEY ? null : db();
  console.log(`${dryRun ? "Validating" : "Importing"} from ${dir}${supabase ? "" : " (offline dry run: references resolved against the CSVs only)"}`);
  for (const e of entities) await importEntity(supabase, e as EntityName);

  // One clean revision for attars whose child rows (notes, relations, prices, citations) changed.
  if (!dryRun && supabase && touchedAttars.size) {
    for (const id of touchedAttars) {
      const { error } = await supabase.rpc("snapshot_entity", { p_type: "attar", p_id: id, p_summary: "Data import" });
      if (error) throw new ImportError(`snapshot: ${error.message}`);
    }
    console.log(`✓ revisions written for ${touchedAttars.size} attar(s)`);
  }
}

main().catch((err) => {
  console.error(err instanceof ImportError ? `✗ ${err.message}` : err);
  process.exit(1);
});
