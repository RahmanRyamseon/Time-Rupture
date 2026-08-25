"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MemeCard from "./MemeCard";
import FilterSelect from "./FilterSelect";
import { EmptyState, GridSkeleton } from "./States";
import { memes } from "@/lib/data";
import { LANGUAGES, REGIONS, CATEGORIES, CONTENT_TYPES } from "@/lib/types";

const SORTS = ["Trending", "Newest", "Most Explained", "Most Shared"] as const;
type Sort = (typeof SORTS)[number];

const YEARS = Array.from(
  new Set(memes.map((m) => new Date(m.originDate).getFullYear()))
).sort((a, b) => b - a);

const POPULARITY_BUCKETS = [
  { value: "any", label: "Any popularity" },
  { value: "80", label: "80+ (viral)" },
  { value: "60", label: "60+ (trending)" },
  { value: "40", label: "40+ (rising)" },
];

function param(sp: URLSearchParams, key: string) {
  return sp.get(key) ?? "";
}

export default function ExploreClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(param(searchParams, "q"));
  const [language, setLanguage] = useState(param(searchParams, "language") || "all");
  const [region, setRegion] = useState(param(searchParams, "region") || "all");
  const [category, setCategory] = useState(param(searchParams, "category") || "all");
  const [contentType, setContentType] = useState(param(searchParams, "type") || "all");
  const [year, setYear] = useState(param(searchParams, "year") || "all");
  const [popularity, setPopularity] = useState(param(searchParams, "min") || "any");
  const [sort, setSort] = useState<Sort>((param(searchParams, "sort") as Sort) || "Trending");
  const [loading, setLoading] = useState(false);

  // Reflect current filters in the URL so results are shareable/bookmarkable.
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (language !== "all") params.set("language", language);
    if (region !== "all") params.set("region", region);
    if (category !== "all") params.set("category", category);
    if (contentType !== "all") params.set("type", contentType);
    if (year !== "all") params.set("year", year);
    if (popularity !== "any") params.set("min", popularity);
    if (sort !== "Trending") params.set("sort", sort);
    const qs = params.toString();
    router.replace(qs ? `/explore?${qs}` : "/explore", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, language, region, category, contentType, year, popularity, sort]);

  // Simulate a brief loading state so the UI demonstrates loading affordances.
  // `loading` is flipped to true by the filter handlers below (user-triggered),
  // this effect only clears it after a short delay once results settle.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(t);
  }, [q, language, region, category, contentType, year, popularity, sort]);

  function withLoading<T>(setter: (value: T) => void) {
    return (value: T) => {
      setLoading(true);
      setter(value);
    };
  }

  const handleQChange = withLoading(setQ);
  const handleLanguageChange = withLoading(setLanguage);
  const handleRegionChange = withLoading(setRegion);
  const handleCategoryChange = withLoading(setCategory);
  const handleContentTypeChange = withLoading(setContentType);
  const handleYearChange = withLoading(setYear);
  const handlePopularityChange = withLoading(setPopularity);
  const handleSortChange = withLoading(setSort);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = memes.filter((m) => {
      if (language !== "all" && m.language !== language) return false;
      if (region !== "all" && m.region !== region) return false;
      if (category !== "all" && m.category !== category) return false;
      if (contentType !== "all" && m.contentType !== contentType) return false;
      if (year !== "all" && String(new Date(m.originDate).getFullYear()) !== year) return false;
      if (popularity !== "any" && m.popularityScore < Number(popularity)) return false;
      if (query) {
        const haystack = [
          m.title,
          m.description,
          m.explanation,
          m.transliteration ?? "",
          m.translation ?? "",
          ...m.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "Newest":
          return new Date(b.originDate).getTime() - new Date(a.originDate).getTime();
        case "Most Explained":
          return b.explainViewCount - a.explainViewCount;
        case "Most Shared":
          return b.shareCount - a.shareCount;
        case "Trending":
        default:
          return b.growth24h - a.growth24h;
      }
    });

    return list;
  }, [q, language, region, category, contentType, year, popularity, sort]);

  function resetFilters() {
    setLoading(true);
    setQ("");
    setLanguage("all");
    setRegion("all");
    setCategory("all");
    setContentType("all");
    setYear("all");
    setPopularity("any");
    setSort("Trending");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-navy-900/8 bg-white p-4 shadow-card sm:p-5">
        <div className="flex items-center gap-2 rounded-full border-2 border-navy-900/12 bg-white py-1 pr-1.5 pl-4 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/15">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-navy-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <label htmlFor="explore-search" className="sr-only">
            Search a meme, dialogue, language or movie
          </label>
          <input
            id="explore-search"
            type="search"
            value={q}
            onChange={(e) => handleQChange(e.target.value)}
            placeholder="Search a meme, dialogue, language or movie"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-navy-900 outline-none placeholder:text-navy-400"
          />
          {q ? (
            <button
              type="button"
              onClick={() => handleQChange("")}
              className="shrink-0 rounded-full px-3 py-2 text-xs font-bold text-navy-500 hover:text-pink-600"
            >
              Clear
            </button>
          ) : null}
        </div>
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          role="group"
          aria-label="Filters"
        >
          <FilterSelect
            label="Language"
            value={language}
            onChange={handleLanguageChange}
            options={[{ value: "all", label: "All languages" }, ...LANGUAGES.map((l) => ({ value: l, label: l }))]}
          />
          <FilterSelect
            label="Region"
            value={region}
            onChange={handleRegionChange}
            options={[{ value: "all", label: "All regions" }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
          />
          <FilterSelect
            label="Category"
            value={category}
            onChange={handleCategoryChange}
            options={[{ value: "all", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <FilterSelect
            label="Content type"
            value={contentType}
            onChange={handleContentTypeChange}
            options={[{ value: "all", label: "All types" }, ...CONTENT_TYPES.map((c) => ({ value: c, label: c }))]}
          />
          <FilterSelect
            label="Year"
            value={year}
            onChange={handleYearChange}
            options={[{ value: "all", label: "All years" }, ...YEARS.map((y) => ({ value: String(y), label: String(y) }))]}
          />
          <FilterSelect
            label="Popularity"
            value={popularity}
            onChange={handlePopularityChange}
            options={POPULARITY_BUCKETS}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-900/8 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wide text-navy-500 uppercase">
              Sort by
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SORTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSortChange(s)}
                  aria-pressed={sort === s}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    sort === s
                      ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-[var(--shadow-glow-violet)]"
                      : "bg-navy-900/5 text-navy-700 hover:bg-navy-900/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-bold text-pink-600 hover:underline"
          >
            Reset filters
          </button>
        </div>
      </div>

      <p className="text-sm font-bold text-navy-500" aria-live="polite">
        {loading ? "Searching…" : `${results.length} ${results.length === 1 ? "result" : "results"}`}
      </p>

      {loading ? (
        <GridSkeleton />
      ) : results.length === 0 ? (
        <EmptyState
          title="No memes match those filters"
          description="Try a different language, region or category — or reset filters to see everything."
          actionLabel="Reset filters"
          onAction={resetFilters}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((meme) => (
            <MemeCard key={meme.id} meme={meme} />
          ))}
        </div>
      )}
    </div>
  );
}
