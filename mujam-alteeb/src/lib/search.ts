import { expandToken, levenshtein, tokenize } from "./normalize";

export type SearchKind = "product" | "house" | "origin" | "note" | "culture" | "guide";

export interface SearchDoc {
  kind: SearchKind;
  id: string;
  href: { ar: string; en: string };
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  /** pre-tokenised name fields (both languages) */
  n: string[];
  /** pre-tokenised secondary fields: house, category, origins, notes */
  m: string[];
  /** pre-tokenised body text */
  b: string[];
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
}

const WEIGHT = { n: 10, m: 4, b: 1 } as const;

function scoreField(tokens: string[], variants: string[], fuzzy: boolean): number {
  let best = 0;
  for (const t of tokens) {
    for (const v of variants) {
      if (t === v) return 1;
      if (v.length >= 2 && t.startsWith(v)) best = Math.max(best, 0.7);
      else if (fuzzy && v.length >= 4 && Math.abs(t.length - v.length) <= 1 && levenshtein(t, v) <= 1) best = Math.max(best, 0.4);
    }
  }
  return best;
}

function run(docs: SearchDoc[], query: string, fuzzy: boolean): SearchHit[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    let total = 0;
    let all = true;
    for (const qt of qTokens) {
      const variants = expandToken(qt);
      const s =
        scoreField(doc.n, variants, fuzzy) * WEIGHT.n +
        scoreField(doc.m, variants, fuzzy) * WEIGHT.m +
        scoreField(doc.b, variants, fuzzy) * WEIGHT.b;
      if (s === 0) {
        all = false;
        break;
      }
      total += s;
    }
    if (all) hits.push({ doc, score: total });
  }
  return hits.sort((a, b) => b.score - a.score || a.doc.title.en.localeCompare(b.doc.title.en));
}

/** AND-search with prefix matching; falls back to typo-tolerant matching when nothing is found. */
export function search(docs: SearchDoc[], query: string, kinds?: SearchKind[]): { hits: SearchHit[]; fuzzy: boolean } {
  const pool = kinds?.length ? docs.filter((d) => kinds.includes(d.kind)) : docs;
  const exact = run(pool, query, false);
  if (exact.length) return { hits: exact, fuzzy: false };
  return { hits: run(pool, query, true), fuzzy: true };
}
