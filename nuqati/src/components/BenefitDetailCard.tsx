"use client";

import type { Card } from "@/lib/types";
import { MERCHANT_CATEGORIES, categoryById } from "@/data/merchantCategories";
import { programById } from "@/data/loyaltyPrograms";
import { pointsUsageFor } from "@/lib/benefits";
import { fmtBhd } from "@/lib/format";

const NETWORK_COLOR: Record<Card["network"], string> = {
  Visa: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Mastercard: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  Amex: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
};

function formatRate(card: Card, rate: number) {
  return card.currency === "cashback" ? `${(rate * 100).toFixed(1)}%` : `${rate}x`;
}

export function BenefitDetailCard({ card }: { card: Card }) {
  const usage = pointsUsageFor(card);
  const program = programById(card.loyaltyProgramId);
  const boostedCategories = new Set(card.earnRules.map((r) => r.category));
  const flatCategories = MERCHANT_CATEGORIES.filter((c) => c.id !== "other" && !boostedCategories.has(c.id));

  return (
    <div className="card-surface flex flex-col gap-4 rounded-2xl p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{card.bank}</p>
        <h3 className="text-lg font-semibold leading-tight">{card.cardName}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium">{card.tier}</span>
          <span className={`rounded-full px-2 py-0.5 font-medium ${NETWORK_COLOR[card.network]}`}>{card.network}</span>
          {card.isIslamic && <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">Sharia-compliant</span>}
          {!card.isActive && <span className="rounded-full bg-danger-soft px-2 py-0.5 font-medium text-danger">Discontinued</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <p className="text-foreground/50">Annual fee</p>
          <p className="font-medium">{card.annualFeeBhd === 0 ? "Free" : fmtBhd(card.annualFeeBhd)}</p>
        </div>
        <div>
          <p className="text-foreground/50">Min. salary</p>
          <p className="font-medium">{fmtBhd(card.minSalaryBhd)}</p>
        </div>
        <div>
          <p className="text-foreground/50">Base rate</p>
          <p className="font-medium">{formatRate(card, card.baseRate)}</p>
        </div>
        <div>
          <p className="text-foreground/50">Earns</p>
          <p className="font-medium capitalize">{card.currency}</p>
        </div>
      </div>

      {card.welcomeBonus && (
        <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">
          <span className="font-semibold">Welcome bonus: </span>
          {card.welcomeBonus}
        </p>
      )}

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/50">Earn rate by category</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          {card.earnRules.map((rule) => (
            <div key={rule.category} className="flex items-center justify-between gap-2 rounded-lg bg-brand-soft px-2 py-1">
              <span className="capitalize text-brand-strong">{categoryById(rule.category).nameEn}</span>
              <span className="font-medium text-brand-strong">
                {formatRate(card, rule.rate)}
                {rule.capPerMonthBhd ? ` · cap ${fmtBhd(rule.capPerMonthBhd)}/mo` : ""}
              </span>
            </div>
          ))}
          {flatCategories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between gap-2 px-2 py-1 text-foreground/60">
              <span className="capitalize">{cat.nameEn}</span>
              <span>{formatRate(card, card.baseRate)}</span>
            </div>
          ))}
        </div>
      </div>

      {card.keyBenefits.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/50">Benefits</p>
          <ul className="list-inside list-disc space-y-1 text-sm text-foreground/80">
            {card.keyBenefits.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {usage && (
        <div className="border-t border-border pt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/50">
            How {usage.currencyName} can be used
          </p>
          <p className="mb-2 text-xs text-foreground/50">
            {program?.operator} · {usage.expiryPolicy}
            {usage.minRedemption ? ` · ${usage.minRedemption}` : ""}
          </p>
          <div className="flex flex-col gap-1.5">
            {usage.redemptionOptions.map((opt) => (
              <div key={opt.label} className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-1.5 text-sm">
                <div>
                  <p className="font-medium">{opt.label}</p>
                  {opt.conditions && <p className="text-xs text-foreground/50">{opt.conditions}</p>}
                </div>
                <span className="shrink-0 font-medium text-foreground/70">{opt.valuePerPointFils.toFixed(2)} fils/pt</span>
              </div>
            ))}
          </div>
          {usage.transferPartners.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {usage.transferPartners.map((t, i) => (
                <p key={i} className="text-xs text-foreground/60">
                  → <span className="font-medium">{programById(t.toProgramId)?.name}</span>: {t.ratioLabel}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-foreground/40">Last verified {card.lastVerified}</p>
    </div>
  );
}
