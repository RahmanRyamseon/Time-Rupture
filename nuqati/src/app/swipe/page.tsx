"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cardById } from "@/data/cards";
import { MERCHANT_CATEGORIES, categoryById } from "@/data/merchantCategories";
import { useAppState } from "@/lib/store";
import { rankCardsForPurchase, type EarnBreakdown } from "@/lib/rewards";
import { fmtBhd, fmtDate, fmtFils, fmtPoints } from "@/lib/format";
import type { MerchantCategoryId } from "@/lib/types";

export default function SwipePage() {
  const { cardIds, usageForCard, logSwipe, hydrated } = useAppState();
  const [category, setCategory] = useState<MerchantCategoryId>("groceries");
  const [amount, setAmount] = useState(30);
  const [loggedFor, setLoggedFor] = useState<string | null>(null);

  const walletCards = useMemo(
    () => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c),
    [cardIds],
  );

  const ranked: EarnBreakdown[] = useMemo(() => {
    if (walletCards.length === 0) return [];
    return rankCardsForPurchase(walletCards, category, amount, (id) => usageForCard(id, category));
  }, [walletCards, category, amount, usageForCard]);

  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const savingsVsWorst = best && worst && ranked.length > 1 ? best.earnedValueFils - worst.earnedValueFils : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Smart Swipe Advisor</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Pick a category and amount — Nuqati ranks your wallet so you always know which card to hand over.
        </p>
        <p className="text-xs text-foreground/40">
          Rankings assume the best available redemption for points/miles cards (e.g. an airline transfer) — see
          Points Value for cashback-only figures.
        </p>
      </div>

      {hydrated && walletCards.length === 0 ? (
        <EmptyWallet />
      ) : (
        <>
          <div className="card-surface rounded-2xl p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">Category</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {MERCHANT_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors ${
                    category === c.id
                      ? "border-brand bg-brand-soft text-brand-strong"
                      : "border-border bg-background text-foreground/70 hover:border-brand/50"
                  }`}
                >
                  <span className="text-lg">{c.icon}</span>
                  {c.nameEn}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="text-xs font-medium uppercase tracking-wide text-foreground/50" htmlFor="amount">
                Spend amount
              </label>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5">
                <span className="text-sm text-foreground/50">BD</span>
                <input
                  id="amount"
                  type="number"
                  min={0}
                  step={0.5}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          </div>

          {best && (
            <div className="rounded-2xl border border-brand bg-brand-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">Recommended</p>
              <p className="mt-1 text-lg font-bold">
                Use your {best.card.bankShort} {best.card.cardName} for {categoryById(category).nameEn.toLowerCase()}
              </p>
              <p className="mt-1 text-sm text-foreground/70">
                {best.effectiveRatePct >= 0.005
                  ? `${(best.effectiveRatePct * 100).toFixed(1)}% effective reward`
                  : `${fmtPoints(best.earnedUnits)} ${best.card.currency}`}{" "}
                = {fmtFils(best.earnedValueFils)} on {fmtBhd(amount)} spend.
                {ranked.length > 1 && savingsVsWorst > 0 && (
                  <>
                    {" "}
                    That&apos;s {fmtFils(savingsVsWorst)} more than your worst card ({worst.card.bankShort}{" "}
                    {worst.card.cardName}) for this purchase.
                  </>
                )}
              </p>
              <button
                onClick={() => {
                  logSwipe(best.card.id, category, amount);
                  setLoggedFor(best.card.id);
                }}
                className="mt-3 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                Log this swipe
              </button>
              {loggedFor === best.card.id && (
                <span className="ml-2 text-xs text-brand-strong">Logged toward this cycle&apos;s cap ✓</span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {ranked.map((r, i) => (
              <RankedCardRow key={r.card.id} rank={i + 1} breakdown={r} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RankedCardRow({ rank, breakdown }: { rank: number; breakdown: EarnBreakdown }) {
  const { card, capApplies, capHitThisCycle, capPerMonthBhd, spentTowardCapBhd, cycleResetsOn } = breakdown;
  const capUsedPct = capApplies && capPerMonthBhd ? Math.min(100, (spentTowardCapBhd / capPerMonthBhd) * 100) : 0;

  return (
    <div className="card-surface flex flex-col gap-2 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold">
            {rank}
          </span>
          <div>
            <p className="text-xs text-foreground/50">{card.bank}</p>
            <p className="font-semibold leading-tight">{card.cardName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-brand-strong">{fmtFils(breakdown.earnedValueFils)}</p>
          <p className="text-xs text-foreground/50">{(breakdown.effectiveRatePct * 100).toFixed(2)}% effective</p>
        </div>
      </div>

      {capApplies && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className={`h-full rounded-full ${capHitThisCycle ? "bg-danger" : "bg-accent"}`}
              style={{ width: `${capUsedPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-foreground/50">
            {capHitThisCycle ? (
              <span className="font-medium text-danger">
                Bonus cap used this cycle — extra spend earns the base rate. Restarts {fmtDate(cycleResetsOn)}.
              </span>
            ) : (
              <>
                {fmtBhd(spentTowardCapBhd)} of {fmtBhd(capPerMonthBhd!)} bonus cap used this cycle · resets{" "}
                {fmtDate(cycleResetsOn)}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyWallet() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="text-lg font-semibold">Your wallet is empty</p>
      <p className="mt-1 text-sm text-foreground/60">Add a few cards first so Nuqati has something to compare.</p>
      <Link
        href="/wallet"
        className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
      >
        Go to My Wallet
      </Link>
    </div>
  );
}
