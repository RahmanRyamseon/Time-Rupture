"use client";

import { useMemo, useState } from "react";
import { ProblemCard } from "@/components/ProblemCard";
import { PROBLEMS } from "@/data/problems";
import { CATEGORIES } from "@/data/categories";
import { searchProblems } from "@/lib/search";

export function BrowseClient() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = query.trim() ? searchProblems(PROBLEMS, query) : PROBLEMS;
    if (activeCategory) list = list.filter((p) => p.category === activeCategory);
    return list;
  }, [query, activeCategory]);

  return (
    <div className="flex flex-col gap-6">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search all problems…"
        className="w-full max-w-xl rounded-full border border-border bg-surface px-5 py-3 text-sm shadow-sm outline-none focus:border-brand"
      />
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            activeCategory === null
              ? "bg-brand text-white"
              : "bg-surface-muted text-foreground/70 hover:text-foreground"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            onClick={() => setActiveCategory(c.slug)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === c.slug
                ? "bg-brand text-white"
                : "bg-surface-muted text-foreground/70 hover:text-foreground"
            }`}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>
      <p className="text-sm text-foreground/50">
        {filtered.length} of {PROBLEMS.length} problems
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((entry) => (
          <ProblemCard key={entry.slug} entry={entry} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-foreground/60">
          Nothing matches that search yet. Try a shorter term, or clear the category filter.
        </p>
      )}
    </div>
  );
}
