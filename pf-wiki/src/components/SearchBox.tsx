"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PROBLEMS } from "@/data/problems";
import { searchProblemsDetailed } from "@/lib/search";
import { categoryBySlug } from "@/data/categories";

export function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => searchProblemsDetailed(PROBLEMS, query).slice(0, 8), [query]);
  const results = matches.map((m) => m.entry);
  const hasExactMatch = matches.some((m) => m.matchType === "exact");
  const showDropdown = focused && query.trim().length > 0;

  return (
    <div role="search" className="relative w-full max-w-xl">
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
          🔍
        </span>
        <label htmlFor="pf-search-input" className="sr-only">
          Search PF Wiki
        </label>
        <input
          id="pf-search-input"
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search PF problems — try a typo, e.g. “UAN activasion”, “claim rejceted”…"
          className="w-full rounded-full border border-border bg-surface py-3 pl-11 pr-4 text-sm shadow-sm outline-none focus:border-brand"
        />
      </div>
      {showDropdown && (
        <div className="card-surface absolute z-30 mt-2 w-full overflow-hidden rounded-2xl shadow-lg">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-foreground/60">
              No matches yet. Try a shorter or more general term, or browse by category below.
            </p>
          ) : (
            <>
              {!hasExactMatch && (
                <p className="border-b border-border bg-surface-muted px-4 py-2 text-xs font-medium text-foreground/60">
                  No exact match — closest problems to “{query.trim()}”:
                </p>
              )}
              <ul className="divide-y divide-border">
                {results.map((r) => {
                  const category = categoryBySlug(r.category);
                  return (
                    <li key={r.slug}>
                      <Link
                        href={`/problem/${r.slug}`}
                        className="flex flex-col gap-0.5 px-4 py-3 hover:bg-surface-muted"
                      >
                        <span className="text-sm font-medium">{r.title}</span>
                        <span className="text-xs text-foreground/50">
                          {category ? (
                            <>
                              <span aria-hidden="true">{category.icon}</span> {category.name}
                            </>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
