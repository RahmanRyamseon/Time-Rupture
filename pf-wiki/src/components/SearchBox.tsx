"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PROBLEMS } from "@/data/problems";
import { searchProblems } from "@/lib/search";
import { categoryBySlug } from "@/data/categories";

export function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => searchProblems(PROBLEMS, query).slice(0, 8), [query]);
  const showDropdown = focused && query.trim().length > 0;

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
          🔍
        </span>
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search PF problems — e.g. “UAN not activating”, “claim rejected”, “TDS”…"
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
                        {category ? `${category.icon} ${category.name}` : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
