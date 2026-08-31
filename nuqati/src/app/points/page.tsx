"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cardById } from "@/data/cards";
import { programById } from "@/data/loyaltyPrograms";
import { useAppState } from "@/lib/store";
import { fmtFils, fmtPoints } from "@/lib/format";

export default function PointsPage() {
  const { cardIds, balanceFor, setBalance, hydrated } = useAppState();

  const walletCards = useMemo(
    () => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c),
    [cardIds],
  );

  const programIds = useMemo(
    () => Array.from(new Set(walletCards.map((c) => c.loyaltyProgramId))),
    [walletCards],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Points Valuation Engine</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Enter your current balance for each loyalty program to see what it&apos;s really worth — cashback vs.
          transfer.
        </p>
      </div>

      {hydrated && programIds.length === 0 ? (
        <EmptyWallet />
      ) : (
        <div className="flex flex-col gap-4">
          {programIds.map((id) => {
            const program = programById(id);
            if (!program) return null;
            const balance = balanceFor(id);
            const options = [...program.redemptionOptions].sort((a, b) => b.valuePerPointFils - a.valuePerPointFils);
            const best = options[0];
            const cashback = options.find((o) => o.type === "cashback");
            const multiplier = cashback && cashback.valuePerPointFils > 0 ? best.valuePerPointFils / cashback.valuePerPointFils : 1;

            return (
              <div key={id} className="card-surface rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{program.name}</h2>
                    <p className="text-xs text-foreground/50">{program.operator} · {program.currencyName}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-foreground/50">Your balance</span>
                    <input
                      type="number"
                      min={0}
                      value={balance || ""}
                      onChange={(e) => setBalance(id, Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-right outline-none focus:border-brand"
                    />
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {options.map((opt) => (
                    <div
                      key={opt.label}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                        opt === best ? "border-brand bg-brand-soft" : "border-border"
                      }`}
                    >
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        {opt.conditions && <p className="text-xs text-foreground/50">{opt.conditions}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{fmtFils(balance * opt.valuePerPointFils)}</p>
                        <p className="text-xs text-foreground/50">{opt.valuePerPointFils.toFixed(2)} fils/pt</p>
                      </div>
                    </div>
                  ))}
                </div>

                {multiplier > 1.01 && cashback && (
                  <p className="mt-3 text-sm text-brand-strong">
                    {best.label} is {multiplier.toFixed(1)}x more valuable than cashback for your {fmtPoints(balance)}{" "}
                    {program.currencyName} — that&apos;s {fmtFils(balance * (best.valuePerPointFils - cashback.valuePerPointFils))} left
                    on the table if you just take cashback.
                  </p>
                )}

                <p className="mt-3 text-xs text-foreground/50">Expiry: {program.expiryPolicy}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyWallet() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="text-lg font-semibold">No loyalty programs yet</p>
      <p className="mt-1 text-sm text-foreground/60">Add cards to your wallet to value the points they earn.</p>
      <Link
        href="/wallet"
        className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
      >
        Go to My Wallet
      </Link>
    </div>
  );
}
