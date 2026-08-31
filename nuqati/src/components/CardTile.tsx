"use client";

import type { Card } from "@/lib/types";
import { fmtBhd, fmtFils } from "@/lib/format";
import { estimateMonthlyValueFils } from "@/lib/rewards";

const NETWORK_COLOR: Record<Card["network"], string> = {
  Visa: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Mastercard: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  Amex: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
};

export function CardTile({
  card,
  inWallet,
  onToggle,
}: {
  card: Card;
  inWallet: boolean;
  onToggle: (id: string) => void;
}) {
  const estMonthly = estimateMonthlyValueFils(card, true);

  return (
    <div className="card-surface flex flex-col gap-3 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{card.bank}</p>
          <h3 className="text-base font-semibold leading-tight">{card.cardName}</h3>
        </div>
        <button
          onClick={() => onToggle(card.id)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            inWallet
              ? "bg-danger-soft text-danger hover:opacity-80"
              : "bg-brand text-white hover:bg-brand-strong"
          }`}
        >
          {inWallet ? "Remove" : "Add to wallet"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium">{card.tier}</span>
        <span className={`rounded-full px-2 py-0.5 font-medium ${NETWORK_COLOR[card.network]}`}>{card.network}</span>
        {card.isIslamic && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">Sharia-compliant</span>
        )}
        {!card.isActive && (
          <span className="rounded-full bg-danger-soft px-2 py-0.5 font-medium text-danger">Discontinued</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-foreground/50">Annual fee</p>
          <p className="font-medium">{card.annualFeeBhd === 0 ? "Free" : fmtBhd(card.annualFeeBhd)}</p>
        </div>
        <div>
          <p className="text-foreground/50">Min. salary</p>
          <p className="font-medium">{fmtBhd(card.minSalaryBhd)}</p>
        </div>
      </div>

      {card.earnRules.length > 0 && (
        <ul className="space-y-0.5 text-sm">
          {card.earnRules.map((rule) => (
            <li key={rule.category} className="flex items-center justify-between text-foreground/80">
              <span className="capitalize">{rule.category}</span>
              <span className="font-medium">
                {card.currency === "cashback" ? `${(rule.rate * 100).toFixed(1)}%` : `${rule.rate}x`}
                {rule.capPerMonthBhd ? ` up to ${fmtBhd(rule.capPerMonthBhd)}/mo` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="text-foreground/50">Est. value / month*</span>
        <span className="font-semibold text-brand-strong">{fmtFils(estMonthly)}</span>
      </div>
    </div>
  );
}
