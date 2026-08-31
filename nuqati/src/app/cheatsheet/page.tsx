"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cardById } from "@/data/cards";
import { MERCHANT_CATEGORIES } from "@/data/merchantCategories";
import { ILLUSTRATIVE_MONTHLY_SPEND } from "@/data/spendProfile";
import { useAppState } from "@/lib/store";
import { rankCardsForPurchase } from "@/lib/rewards";
import { cardDisplayName, fmtBhd, fmtDate, nextCycleStart } from "@/lib/format";

export default function CheatsheetPage() {
  const { cardIds, usageForCard } = useAppState();

  const walletCards = useMemo(
    () => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c),
    [cardIds],
  );

  const byCategory = useMemo(
    () =>
      MERCHANT_CATEGORIES.map((cat) => {
        const amount = ILLUSTRATIVE_MONTHLY_SPEND[cat.id] || 30;
        const ranked = rankCardsForPurchase(walletCards, cat.id, amount, (id) => usageForCard(id, cat.id));
        return { category: cat, ranked };
      }),
    [walletCards, usageForCard],
  );

  const capAlerts = useMemo(() => {
    const alerts: { card: (typeof walletCards)[number]; category: (typeof MERCHANT_CATEGORIES)[number]; used: number; cap: number; alternative?: string }[] = [];
    walletCards.forEach((card) => {
      card.earnRules.forEach((rule) => {
        if (!rule.capPerMonthBhd) return;
        const used = usageForCard(card.id, rule.category);
        const pct = used / rule.capPerMonthBhd;
        if (pct >= 0.8) {
          const category = MERCHANT_CATEGORIES.find((c) => c.id === rule.category)!;
          const ranked = rankCardsForPurchase(walletCards, rule.category, 30, (id) => usageForCard(id, rule.category));
          const alt = ranked.find((r) => r.card.id !== card.id);
          alerts.push({ card, category, used, cap: rule.capPerMonthBhd, alternative: alt ? cardDisplayName(alt.card) : undefined });
        }
      });
    });
    return alerts;
  }, [walletCards, usageForCard]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monthly Cheat Sheet</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Which card to reach for, by category, this billing cycle — plus a heads-up before any bonus cap
            runs out. Resets {fmtDate(nextCycleStart())}.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-muted print:hidden"
        >
          Print
        </button>
      </div>

      {walletCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-lg font-semibold">Your wallet is empty</p>
          <p className="mt-1 text-sm text-foreground/60">Add cards to generate your cheat sheet.</p>
          <Link
            href="/wallet"
            className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            Go to My Wallet
          </Link>
        </div>
      ) : (
        <>
          {capAlerts.length > 0 && (
            <div className="card-surface rounded-2xl border border-danger/30 p-4">
              <p className="mb-2 text-sm font-semibold text-danger">Cap running low this cycle</p>
              <ul className="space-y-1.5 text-sm">
                {capAlerts.map((a, i) => (
                  <li key={i}>
                    <span className="font-medium">{cardDisplayName(a.card)}</span>{" "}
                    · {a.category.nameEn}: {fmtBhd(a.used)} of {fmtBhd(a.cap)} bonus cap used.
                    {a.alternative && <> Switch to <span className="font-medium">{a.alternative}</span> for the rest of this cycle.</>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byCategory.map(({ category, ranked }) => {
              const best = ranked[0];
              return (
                <div key={category.id} className="card-surface rounded-2xl p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span>{category.icon}</span>
                    {category.nameEn}
                  </p>
                  {best ? (
                    <>
                      <p className="mt-2 font-medium text-brand-strong">{cardDisplayName(best.card)}</p>
                      <p className="text-xs text-foreground/50">{(best.effectiveRatePct * 100).toFixed(2)}% effective</p>
                      {best.capHitThisCycle && <p className="mt-1 text-xs text-danger">Cap used — reverting to base rate</p>}
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-foreground/40">No cards in wallet</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
