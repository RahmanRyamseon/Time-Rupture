"use client";

import { useMemo, useState } from "react";
import { BAHRAIN_CARDS, BANKS, cardById } from "@/data/cards";
import { CardTile } from "@/components/CardTile";
import { DataDisclaimer } from "@/components/DataDisclaimer";
import { useAppState } from "@/lib/store";
import { fmtFils } from "@/lib/format";
import { estimateMonthlyValueFils } from "@/lib/rewards";

export default function WalletPage() {
  const { cardIds, addCard, removeCard, hasCard, hydrated } = useAppState();
  const [query, setQuery] = useState("");
  const [bankFilter, setBankFilter] = useState<string>("all");
  const [islamicOnly, setIslamicOnly] = useState(false);
  const [showOnlyWallet, setShowOnlyWallet] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);

  const filtered = useMemo(() => {
    return BAHRAIN_CARDS.filter((c) => {
      if (!showLegacy && !c.isActive && !cardIds.includes(c.id)) return false;
      if (showOnlyWallet && !cardIds.includes(c.id)) return false;
      if (bankFilter !== "all" && c.bank !== bankFilter) return false;
      if (islamicOnly && !c.isIslamic) return false;
      if (query && !`${c.bank} ${c.cardName}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [cardIds, bankFilter, islamicOnly, query, showOnlyWallet, showLegacy]);

  const walletCards = useMemo(() => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c), [cardIds]);
  const totalMonthlyValue = walletCards.reduce((sum, c) => sum + estimateMonthlyValueFils(c, true), 0);
  const totalFees = walletCards.reduce((sum, c) => sum + c.annualFeeBhd, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Wallet</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Add the cards you actually carry from Bahrain&apos;s major banks — no login, no bank data shared.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile label="Cards in wallet" value={String(walletCards.length)} />
        <SummaryTile label="Est. cashback value / month*" value={fmtFils(totalMonthlyValue)} />
        <SummaryTile label="Combined annual fees" value={`BD ${totalFees.toFixed(2)}`} />
      </div>

      <div className="card-surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bank or card name…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <select
          value={bankFilter}
          onChange={(e) => setBankFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="all">All banks ({BANKS.length})</option>
          {BANKS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm">
          <input type="checkbox" checked={islamicOnly} onChange={(e) => setIslamicOnly(e.target.checked)} />
          Sharia-compliant only
        </label>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm">
          <input type="checkbox" checked={showOnlyWallet} onChange={(e) => setShowOnlyWallet(e.target.checked)} />
          My wallet only
        </label>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm">
          <input type="checkbox" checked={showLegacy} onChange={(e) => setShowLegacy(e.target.checked)} />
          Show discontinued/legacy cards
        </label>
      </div>

      {hydrated && filtered.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/60">
          No cards match those filters.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((card) => (
          <CardTile
            key={card.id}
            card={card}
            inWallet={hasCard(card.id)}
            onToggle={(id) => (hasCard(id) ? removeCard(id) : addCard(id))}
          />
        ))}
      </div>

      <DataDisclaimer />
      <p className="text-xs text-foreground/40">
        *Estimated value assumes an illustrative BHD 500/month household spend profile and conservative
        cashback-equivalent redemption. Your real earnings depend on your actual spending — see Smart Swipe.
      </p>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface rounded-2xl p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-strong">{value}</p>
    </div>
  );
}
