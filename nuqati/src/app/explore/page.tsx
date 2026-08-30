"use client";

import { useMemo, useState } from "react";
import { BAHRAIN_CARDS } from "@/data/cards";
import { COUNTRIES } from "@/data/countries";
import { BenefitDetailCard } from "@/components/BenefitDetailCard";
import { DataDisclaimer } from "@/components/DataDisclaimer";

export default function ExplorePage() {
  const [countryId, setCountryId] = useState("bahrain");
  const [bankFilter, setBankFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [islamicOnly, setIslamicOnly] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [query, setQuery] = useState("");

  const cardsInCountry = useMemo(() => (countryId === "bahrain" ? BAHRAIN_CARDS : []), [countryId]);

  const banksAvailable = useMemo(
    () => Array.from(new Set(cardsInCountry.map((c) => c.bank))).sort(),
    [cardsInCountry],
  );

  const bankScoped = useMemo(
    () => cardsInCountry.filter((c) => bankFilter === "all" || c.bank === bankFilter),
    [cardsInCountry, bankFilter],
  );

  const tiersAvailable = useMemo(
    () => Array.from(new Set(bankScoped.map((c) => c.tier))).sort(),
    [bankScoped],
  );

  const filtered = useMemo(() => {
    return bankScoped.filter((c) => {
      if (!showLegacy && !c.isActive) return false;
      if (tierFilter !== "all" && c.tier !== tierFilter) return false;
      if (islamicOnly && !c.isIslamic) return false;
      if (query && !`${c.bank} ${c.cardName}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [bankScoped, tierFilter, islamicOnly, query, showLegacy]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Explore Benefits</h1>
        <p className="mt-1 text-sm text-foreground/60">
          What does this bank actually offer? Pick a country, bank, and card type to see full benefits,
          earn rates, and exactly how the points can be used — no wallet needed.
        </p>
      </div>

      <div className="card-surface flex flex-col gap-3 rounded-2xl p-4">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-foreground/50">Country</p>
          <div className="flex flex-wrap gap-1.5">
            {COUNTRIES.map((c) => (
              <button
                key={c.id}
                disabled={!c.available}
                onClick={() => {
                  setCountryId(c.id);
                  setBankFilter("all");
                  setTierFilter("all");
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  countryId === c.id
                    ? "border-brand bg-brand-soft text-brand-strong"
                    : c.available
                      ? "border-border bg-background text-foreground/70 hover:border-brand/50"
                      : "cursor-not-allowed border-border bg-surface-muted text-foreground/30"
                }`}
                title={c.available ? undefined : "Coming soon"}
              >
                {c.flag} {c.name}
                {!c.available && " · soon"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bank or card name…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <select
            value={bankFilter}
            onChange={(e) => {
              setBankFilter(e.target.value);
              setTierFilter("all");
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="all">All banks ({banksAvailable.length})</option>
            {banksAvailable.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="all">All card types</option>
            {tiersAvailable.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 whitespace-nowrap text-sm">
            <input type="checkbox" checked={islamicOnly} onChange={(e) => setIslamicOnly(e.target.checked)} />
            Sharia-compliant only
          </label>
          <label className="flex items-center gap-2 whitespace-nowrap text-sm">
            <input type="checkbox" checked={showLegacy} onChange={(e) => setShowLegacy(e.target.checked)} />
            Show discontinued/legacy cards
          </label>
        </div>
      </div>

      {countryId !== "bahrain" ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-lg font-semibold">{COUNTRIES.find((c) => c.id === countryId)?.name} is coming soon</p>
          <p className="mt-1 text-sm text-foreground/60">
            Nuqati launched with Bahrain — the full GCC rollout follows the app&apos;s own roadmap.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          No cards match those filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((card) => (
            <BenefitDetailCard key={card.id} card={card} />
          ))}
        </div>
      )}

      <DataDisclaimer />
    </div>
  );
}
