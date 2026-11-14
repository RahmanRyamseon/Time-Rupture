import fs from "node:fs/promises";
import path from "node:path";
import { json } from "@/lib/api";
import { search, type SearchDoc, type SearchKind } from "@/lib/search";

let docs: SearchDoc[] | null = null;

/** GET /api/v1/search?q=…&kind=product,house — Arabic-normalised, transliteration-aware search. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").slice(0, 120);
  const kinds = (sp.get("kind") ?? "").split(",").filter(Boolean) as SearchKind[];
  docs ??= JSON.parse(await fs.readFile(path.join(process.cwd(), "public", "search-index.json"), "utf8")) as SearchDoc[];
  const { hits, fuzzy } = search(docs, q, kinds);
  return json({ q, fuzzy, results: hits.slice(0, 50).map((h) => ({ kind: h.doc.kind, id: h.doc.id, title: h.doc.title, subtitle: h.doc.subtitle, href: h.doc.href, score: h.score })) }, { cache: "public, max-age=60" });
}
