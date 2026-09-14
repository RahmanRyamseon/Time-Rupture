import type { ProblemEntry } from "@/lib/types";

function haystack(entry: ProblemEntry): string {
  return [
    entry.title,
    entry.short,
    entry.category,
    ...entry.tags,
    ...entry.symptoms,
    ...entry.likelyCauses,
  ]
    .join(" ")
    .toLowerCase();
}

export function searchProblems(problems: ProblemEntry[], query: string): ProblemEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  return problems
    .map((entry) => {
      const hay = haystack(entry);
      const score = terms.reduce((acc, term) => (hay.includes(term) ? acc + 1 : acc), 0);
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.entry);
}
