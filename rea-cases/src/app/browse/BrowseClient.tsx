"use client";

import { useMemo, useState } from "react";
import { CaseCard } from "@/components/CaseCard";
import { CASES } from "@/data/cases";
import { CATEGORIES } from "@/data/categories";
import { searchCasesDetailed } from "@/lib/search";
import { TAG_INFO, TAG_ORDER } from "@/lib/tags";
import type { EvidenceTag } from "@/lib/types";

/**
 * Honour /browse/?q=… so the site search action and shared links land on real
 * results. Read during the first client render rather than in an effect, which
 * would cause a cascading re-render; React applies user-editable input values
 * after hydration, so the prerendered empty input is not a mismatch.
 */
function initialQuery(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

export function BrowseClient() {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<EvidenceTag | null>(null);

  const matches = useMemo(() => {
    const all = query.trim()
      ? searchCasesDetailed(CASES, query)
      : CASES.map((entry) => ({ entry, score: 0, matchType: "exact" as const }));
    return all.filter(
      (m) =>
        (!activeCategory || m.entry.category === activeCategory) &&
        (!activeTag || m.entry.tag === activeTag),
    );
  }, [query, activeCategory, activeTag]);

  const isFuzzyOnly =
    query.trim().length > 0 && matches.length > 0 && matches.every((m) => m.matchType === "fuzzy");

  return (
    <div className="flex flex-col gap-6">
      <label htmlFor="rea-browse-search" className="sr-only">
        Search all cases
      </label>
      <input
        id="rea-browse-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search all cases — typos are okay…"
        className="w-full max-w-xl rounded-full border border-border bg-surface px-5 py-3 text-sm shadow-sm outline-none focus:border-brand"
      />

      <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          aria-pressed={activeCategory === null}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            activeCategory === null
              ? "bg-brand text-white"
              : "bg-surface-muted text-foreground/70 hover:text-foreground"
          }`}
        >
          All categories
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setActiveCategory(c.slug)}
            aria-pressed={activeCategory === c.slug}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === c.slug
                ? "bg-brand text-white"
                : "bg-surface-muted text-foreground/70 hover:text-foreground"
            }`}
          >
            <span aria-hidden="true">{c.icon}</span> {c.name}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Filter by evidence tag" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTag(null)}
          aria-pressed={activeTag === null}
          className={`rounded-full px-3 py-1.5 font-mono text-xs transition-colors ${
            activeTag === null
              ? "bg-brand text-white"
              : "bg-surface-muted text-foreground/70 hover:text-foreground"
          }`}
        >
          Any evidence
        </button>
        {TAG_ORDER.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveTag(tag)}
            aria-pressed={activeTag === tag}
            title={TAG_INFO[tag].meaning}
            className={`rounded-full px-3 py-1.5 font-mono text-xs transition-colors ${
              activeTag === tag
                ? "bg-brand text-white"
                : "bg-surface-muted text-foreground/70 hover:text-foreground"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="text-sm text-foreground/60">
        {matches.length} {matches.length === 1 ? "case" : "cases"}
        {isFuzzyOnly && <> — no exact match, showing the closest to “{query.trim()}”</>}
      </p>

      {matches.length === 0 ? (
        <p className="card-surface rounded-2xl p-6 text-sm text-foreground/70">
          Nothing matches that combination. Clear a filter, or try the app being replaced
          (“photoshop”, “quickbooks”) or a tool (“ghidra”, “jadx”).
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {matches.map(({ entry }) => (
            <CaseCard key={entry.slug} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
