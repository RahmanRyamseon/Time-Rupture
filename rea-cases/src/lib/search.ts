import type { CaseEntry } from "@/lib/types";

export type SearchMatchType = "exact" | "fuzzy";

export type SearchResult = {
  entry: CaseEntry;
  score: number;
  matchType: SearchMatchType;
};

/**
 * Abbreviations worth expanding before matching. People search for the app
 * they want replaced ("photoshop"), the tool ("ghidra"), or the thing they
 * are holding ("apk", "exe"), so the table maps those onto each other.
 */
const SYNONYMS: Record<string, string[]> = {
  rea: ["reverse", "engineer"],
  re: ["reverse", "engineering"],
  decompile: ["decompilation", "disassembly", "reconstruction"],
  decompiler: ["decompilation", "ghidra", "ida"],
  reimplementation: ["rewrite", "reconstruction", "clean-room"],
  rewrite: ["reimplementation", "port", "rebuild"],
  clone: ["rebuild", "rewrite", "reimplementation"],
  exe: ["binary", "windows"],
  apk: ["android"],
  dll: ["binary", "windows"],
  elf: ["binary", "linux"],
  photoshop: ["photocraft", "image editor"],
  word: ["wordcraft", "word processor"],
  excel: ["gridcraft", "spreadsheet"],
  figma: ["figcraft", "ui design"],
  obs: ["rec-rs", "screen recorder"],
  terminal: ["ghostty", "adamterm"],
  game: ["games", "gaming"],
  games: ["game", "gaming"],
  driver: ["kernel", "hardware"],
  sandbox: ["container", "docker", "containment"],
  defence: ["defense", "hardening"],
  defense: ["defence", "hardening"],
  benchmark: ["evaluation", "study", "evidence"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter(Boolean);
}

/** Weighted fields — a name or title hit should outrank one buried in notes. */
function scoringFields(entry: CaseEntry): { text: string; words: string[]; weight: number }[] {
  const fields = [
    { text: `${entry.title} ${entry.name}`, weight: 6 },
    { text: (entry.replaces ?? []).join(" "), weight: 5.5 },
    { text: entry.tags.join(" "), weight: 5 },
    { text: entry.summary, weight: 3 },
    { text: `${entry.category} ${entry.tag} ${entry.tagSource ?? ""}`, weight: 2.5 },
    { text: `${entry.license ?? ""} ${entry.status ?? ""}`, weight: 1.5 },
    { text: [...(entry.notes ?? []), entry.verification?.verdict ?? ""].join(" "), weight: 1 },
  ];
  return fields.map((f) => ({
    text: f.text.toLowerCase(),
    words: tokenize(f.text),
    weight: f.weight,
  }));
}

/** Classic Levenshtein edit distance, small-input-only (search terms and single words). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** How many typos to tolerate before a word no longer counts as "close enough". */
function typoBudget(termLength: number): number {
  if (termLength <= 3) return 0;
  if (termLength <= 5) return 1;
  if (termLength <= 8) return 2;
  return 3;
}

/** 0 for no match, up to 1 for an exact word match, tapering off with edit distance. */
function fuzzyWordScore(term: string, word: string): number {
  if (term === word) return 1;
  if (word.length >= 3 && word.includes(term)) return 0.85;
  const budget = typoBudget(term.length);
  if (budget === 0) return 0;
  const dist = levenshtein(term, word);
  if (dist > budget) return 0;
  return 0.6 * (1 - dist / (term.length + 1));
}

function expandTerm(term: string): string[] {
  return [term, ...(SYNONYMS[term] ?? [])];
}

/**
 * Scores every case against a query, tolerating typos and abbreviations so a
 * near-miss ("ghidrra", "photshop") still surfaces the right entry instead of
 * an empty screen. Exact substring hits always outrank fuzzy ones, and
 * `matchType` lets the UI say so rather than presenting guesses as hits.
 */
export function searchCasesDetailed(cases: CaseEntry[], query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const rawTerms = q.split(/\s+/).filter(Boolean);
  if (rawTerms.length === 0) return [];

  const results: SearchResult[] = [];

  for (const entry of cases) {
    const fields = scoringFields(entry);
    let exactScore = 0;
    let fuzzyScore = 0;

    for (const rawTerm of rawTerms) {
      const candidates = expandTerm(rawTerm);
      let bestExact = 0;
      let bestFuzzy = 0;

      for (const field of fields) {
        for (const candidate of candidates) {
          if (candidate.length < 2) continue;
          if (field.text.includes(candidate)) {
            bestExact = Math.max(bestExact, field.weight);
            continue;
          }
          for (const word of field.words) {
            const s = fuzzyWordScore(candidate, word);
            if (s > 0) bestFuzzy = Math.max(bestFuzzy, s * field.weight);
          }
        }
      }

      exactScore += bestExact;
      fuzzyScore += bestFuzzy;
    }

    const total = exactScore + fuzzyScore * 0.5;
    if (total > 0) {
      results.push({ entry, score: total, matchType: exactScore > 0 ? "exact" : "fuzzy" });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/** Convenience wrapper — most callers just want the ranked entries. */
export function searchCases(cases: CaseEntry[], query: string): CaseEntry[] {
  return searchCasesDetailed(cases, query).map((r) => r.entry);
}
