"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cardById } from "@/data/cards";
import { useAppState, type StatementSummaryRecord } from "@/lib/store";
import { cardDisplayName, fmtBhd, fmtFils, fmtDate } from "@/lib/format";
import type { Card } from "@/lib/types";

interface CardRollup {
  card: Card;
  records: StatementSummaryRecord[];
  totalSpendBhd: number;
  totalEarnedValueFils: number;
  txnCount: number;
  periodStart: Date;
  periodEnd: Date;
  daysCovered: number;
  annualizedEarnedFils: number;
  annualFeeFils: number;
  netFils: number;
  verdict: "Keep" | "Consider downgrading" | "Consider cancelling";
}

function rollup(card: Card, records: StatementSummaryRecord[]): CardRollup {
  const totalSpendBhd = records.reduce((s, r) => s + r.totalSpendBhd, 0);
  const totalEarnedValueFils = records.reduce((s, r) => s + r.totalEarnedValueFils, 0);
  const txnCount = records.reduce((s, r) => s + r.txnCount, 0);
  const periodStart = new Date(Math.min(...records.map((r) => new Date(r.periodStart).getTime())));
  const periodEnd = new Date(Math.max(...records.map((r) => new Date(r.periodEnd).getTime())));
  const daysCovered = Math.max(1, (periodEnd.getTime() - periodStart.getTime()) / 86_400_000);
  const annualizedEarnedFils = totalEarnedValueFils * (365 / daysCovered);
  const annualFeeFils = card.annualFeeBhd * 1000;

  const netFils = annualizedEarnedFils - annualFeeFils;
  let verdict: CardRollup["verdict"] = "Keep";
  if (annualFeeFils > 0) {
    if (annualizedEarnedFils < annualFeeFils * 0.5) verdict = "Consider cancelling";
    else if (annualizedEarnedFils < annualFeeFils) verdict = "Consider downgrading";
  }

  return { card, records, totalSpendBhd, totalEarnedValueFils, txnCount, periodStart, periodEnd, daysCovered, annualizedEarnedFils, annualFeeFils, netFils, verdict };
}

const VERDICT_STYLE: Record<CardRollup["verdict"], string> = {
  Keep: "bg-brand-soft text-brand-strong",
  "Consider downgrading": "bg-accent-soft text-accent",
  "Consider cancelling": "bg-danger-soft text-danger",
};

export default function FeeRoiPage() {
  const { cardIds, statementSummaries, removeStatementSummary } = useAppState();

  const walletCards = useMemo(
    () => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c),
    [cardIds],
  );

  const rollups = useMemo(() => {
    const byCard = new Map<string, StatementSummaryRecord[]>();
    statementSummaries.forEach((s) => byCard.set(s.cardId, [...(byCard.get(s.cardId) ?? []), s]));
    return Array.from(byCard.entries())
      .map(([cardId, records]) => {
        const card = cardById(cardId);
        return card ? rollup(card, records) : undefined;
      })
      .filter((r): r is CardRollup => !!r)
      .sort((a, b) => a.netFils - b.netFils);
  }, [statementSummaries]);

  const coveredCardIds = new Set(rollups.map((r) => r.card.id));
  const uncoveredWalletCards = walletCards.filter((c) => !coveredCardIds.has(c.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fee-ROI Report</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Real rewards earned (from imported statements), annualized and weighed against each card&apos;s
          annual fee — a keep, downgrade, or cancel verdict based on actual value, not the headline rate.
        </p>
      </div>

      {rollups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-lg font-semibold">No statement data yet</p>
          <p className="mt-1 text-sm text-foreground/60">
            Import at least one statement per card on the Statement Import page to see a fee-ROI verdict.
          </p>
          <Link
            href="/statement"
            className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            Import a statement
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rollups.map((r) => (
            <div key={r.card.id} className="card-surface flex flex-col gap-3 rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-foreground/50">{r.card.bank}</p>
                  <h3 className="text-lg font-semibold">{r.card.cardName}</h3>
                  <p className="text-xs text-foreground/50">
                    {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)} · {r.txnCount} transactions ·{" "}
                    {r.records.length} statement{r.records.length === 1 ? "" : "s"} imported
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${VERDICT_STYLE[r.verdict]}`}>{r.verdict}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-foreground/50">Spend covered</p>
                  <p className="font-medium">{fmtBhd(r.totalSpendBhd)}</p>
                </div>
                <div>
                  <p className="text-foreground/50">Earned (period)</p>
                  <p className="font-medium">{fmtFils(r.totalEarnedValueFils)}</p>
                </div>
                <div>
                  <p className="text-foreground/50">Earned (annualized)</p>
                  <p className="font-medium">{fmtFils(r.annualizedEarnedFils)}</p>
                </div>
                <div>
                  <p className="text-foreground/50">Annual fee</p>
                  <p className="font-medium">{r.card.annualFeeBhd === 0 ? "Free" : fmtBhd(r.card.annualFeeBhd)}</p>
                </div>
              </div>

              <p className={`text-sm font-semibold ${r.netFils >= 0 ? "text-brand-strong" : "text-danger"}`}>
                Net value: {r.netFils >= 0 ? "+" : ""}
                {fmtFils(r.netFils)} / year
              </p>

              <div className="flex flex-wrap gap-2">
                {r.records.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => removeStatementSummary(rec.id)}
                    className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground/50 hover:border-danger hover:text-danger"
                    title="Remove this imported statement"
                  >
                    {fmtDate(new Date(rec.periodStart))}–{fmtDate(new Date(rec.periodEnd))} ✕
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {uncoveredWalletCards.length > 0 && (
        <div className="card-surface rounded-2xl p-4">
          <p className="mb-2 text-sm font-semibold">No statement data yet for</p>
          <div className="flex flex-wrap gap-2 text-sm text-foreground/60">
            {uncoveredWalletCards.map((c) => (
              <span key={c.id} className="rounded-full bg-surface-muted px-3 py-1">
                {cardDisplayName(c)}
              </span>
            ))}
          </div>
          <Link href="/statement" className="mt-2 inline-block text-sm font-medium text-brand-strong underline">
            Import a statement for one of these
          </Link>
        </div>
      )}

      <p className="text-xs text-foreground/40">
        Annualized by scaling the imported period&apos;s earnings to 365 days — accuracy improves with longer
        or multiple imported periods. Import statements periodically to keep this current.
      </p>
    </div>
  );
}
