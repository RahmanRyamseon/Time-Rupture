import type { ProblemEntry } from "@/lib/types";

export type SearchMatchType = "exact" | "fuzzy";

export type SearchResult = {
  entry: ProblemEntry;
  score: number;
  matchType: SearchMatchType;
};

/** A handful of common abbreviations/typos worth expanding before matching. */
const SYNONYMS: Record<string, string[]> = {
  pf: ["epf", "provident", "fund"],
  epf: ["pf", "provident", "fund"],
  epfo: ["pf", "epf"],
  acc: ["account"],
  rejected: ["reject", "rejection", "rejctd"],
  reject: ["rejected", "rejection"],
  withdraw: ["withdrawal", "widthdraw"],
  widthdraw: ["withdraw", "withdrawal"],
  activate: ["activation"],
  activasion: ["activation"],
  pension: ["eps"],
  eps: ["pension"],
  otp: ["one-time-password"],
  kyc: ["know-your-customer"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Weighted, tokenized fields — a title hit should outrank a hit buried in causes text. */
function scoringFields(entry: ProblemEntry): { text: string; words: string[]; weight: number }[] {
  const fields = [
    { text: entry.title, weight: 6 },
    { text: entry.tags.join(" "), weight: 5 },
    { text: entry.short, weight: 3 },
    { text: entry.category, weight: 3 },
    { text: [...entry.symptoms, ...entry.likelyCauses].join(" "), weight: 1.5 },
    { text: [...entry.fixSteps, ...entry.communitySolutions].join(" "), weight: 1 },
  ];
  return fields.map((f) => ({ text: f.text.toLowerCase(), words: tokenize(f.text), weight: f.weight }));
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
 * Scores every problem against a query, tolerating typos and abbreviations so a
 * near-miss still surfaces the right entry instead of an empty result screen.
 * Exact substring hits always outrank fuzzy ones; `matchType` on the aggregate
 * result set tells the UI whether it found real matches or just close guesses.
 */
export function searchProblemsDetailed(problems: ProblemEntry[], query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const rawTerms = q.split(/\s+/).filter(Boolean);
  if (rawTerms.length === 0) return [];

  const results: SearchResult[] = [];

  for (const entry of problems) {
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

/** Back-compat convenience wrapper — most callers just want the ranked entries. */
export function searchProblems(problems: ProblemEntry[], query: string): ProblemEntry[] {
  return searchProblemsDetailed(problems, query).map((r) => r.entry);
}
