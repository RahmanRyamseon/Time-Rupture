import type { Card, MerchantCategoryId } from "@/lib/types";
import { programById } from "@/data/loyaltyPrograms";
import { nextCycleStart } from "@/lib/format";
import { ILLUSTRATIVE_MONTHLY_SPEND } from "@/data/spendProfile";

export interface EarnBreakdown {
  card: Card;
  category: MerchantCategoryId;
  amountBhd: number;
  /** Portion of the spend still earning the bonus category rate this cycle. */
  bonusPortionBhd: number;
  /** Portion that has spilled over the monthly cap and earns the base rate instead. */
  basePortionBhd: number;
  earnedUnits: number;
  /** Best available fils-per-unit value for this card's loyalty currency (cashback, or best transfer). */
  valuePerUnitFils: number;
  earnedValueFils: number;
  /** Effective blended reward rate as a fraction of spend (e.g. 0.03 = 3%). */
  effectiveRatePct: number;
  capApplies: boolean;
  capHitThisCycle: boolean;
  capPerMonthBhd?: number;
  spentTowardCapBhd: number;
  cycleResetsOn: Date;
}

/** Best fils-per-unit value available for a card's currency: direct cashback rate, or the best point/mile valuation. */
export function bestValuePerUnitFils(card: Card): number {
  if (card.currency === "cashback") return 1000; // cashback is already BHD; 1 BHD = 1000 fils
  const program = programById(card.loyaltyProgramId);
  if (!program) return 0;
  return Math.max(...program.redemptionOptions.map((o) => o.valuePerPointFils), 0);
}

/** Cashback-only valuation (no speculative transfer), used for conservative "wallet value" totals. */
export function cashValuePerUnitFils(card: Card): number {
  if (card.currency === "cashback") return 1000;
  const program = programById(card.loyaltyProgramId);
  if (!program) return 0;
  const cashOption = program.redemptionOptions.find((o) => o.type === "cashback");
  if (cashOption) return cashOption.valuePerPointFils;
  // No cashback option published (e.g. a pure airline-miles program) — fall back to
  // the lowest available redemption value so the estimate stays conservative but non-zero.
  const nonZero = program.redemptionOptions.map((o) => o.valuePerPointFils).filter((v) => v > 0);
  return nonZero.length ? Math.min(...nonZero) : 0;
}

/**
 * Computes what a card earns for a purchase, accounting for a monthly bonus-category
 * cap that may have already been partly or fully used this billing cycle.
 *
 * `spentTowardCapBhd` is how much of this card+category's cap has already been consumed
 * this cycle (from prior logged swipes). Once the cap is fully used, additional spend
 * earns at the card's base rate — the bonus "restarts" automatically at the next cycle.
 */
export function computeEarn(
  card: Card,
  category: MerchantCategoryId,
  amountBhd: number,
  spentTowardCapBhd = 0,
  now: Date = new Date(),
): EarnBreakdown {
  const rule = card.earnRules.find((r) => r.category === category);
  const valuePerUnitFils = bestValuePerUnitFils(card);
  const cycleResetsOn = nextCycleStart(now);

  if (!rule) {
    const earnedUnits = amountBhd * card.baseRate;
    const earnedValueFils = earnedUnits * valuePerUnitFils;
    return {
      card,
      category,
      amountBhd,
      bonusPortionBhd: 0,
      basePortionBhd: amountBhd,
      earnedUnits,
      valuePerUnitFils,
      earnedValueFils,
      effectiveRatePct: amountBhd > 0 ? earnedValueFils / 1000 / amountBhd : card.baseRate * valuePerUnitFils / 1000,
      capApplies: false,
      capHitThisCycle: false,
      spentTowardCapBhd: 0,
      cycleResetsOn,
    };
  }

  const cap = rule.capPerMonthBhd;
  let bonusPortionBhd = amountBhd;
  let basePortionBhd = 0;
  let capHitThisCycle = false;

  if (cap !== undefined) {
    const remainingCapacity = Math.max(cap - spentTowardCapBhd, 0);
    bonusPortionBhd = Math.min(amountBhd, remainingCapacity);
    basePortionBhd = amountBhd - bonusPortionBhd;
    capHitThisCycle = remainingCapacity <= 0 || basePortionBhd > 0;
  }

  const earnedUnits = bonusPortionBhd * rule.rate + basePortionBhd * card.baseRate;
  const earnedValueFils = earnedUnits * valuePerUnitFils;

  return {
    card,
    category,
    amountBhd,
    bonusPortionBhd,
    basePortionBhd,
    earnedUnits,
    valuePerUnitFils,
    earnedValueFils,
    effectiveRatePct: amountBhd > 0 ? earnedValueFils / 1000 / amountBhd : (rule.rate * valuePerUnitFils) / 1000,
    capApplies: cap !== undefined,
    capHitThisCycle,
    capPerMonthBhd: cap,
    spentTowardCapBhd,
    cycleResetsOn,
  };
}

/**
 * Estimated value a card would earn per month against the illustrative BHD 500
 * household spend profile — used for wallet summaries, not a real balance.
 */
export function estimateMonthlyValueFils(card: Card, useConservativeCashValue = false): number {
  const value = useConservativeCashValue ? cashValuePerUnitFils(card) : bestValuePerUnitFils(card);
  return (Object.entries(ILLUSTRATIVE_MONTHLY_SPEND) as [MerchantCategoryId, number][]).reduce(
    (total, [category, amountBhd]) => {
      if (amountBhd <= 0) return total;
      const rule = card.earnRules.find((r) => r.category === category);
      const rate = rule ? rule.rate : card.baseRate;
      const bonusPortion = rule?.capPerMonthBhd !== undefined ? Math.min(amountBhd, rule.capPerMonthBhd) : amountBhd;
      const basePortion = amountBhd - bonusPortion;
      const units = bonusPortion * rate + basePortion * card.baseRate;
      return total + units * value;
    },
    0,
  );
}

export function rankCardsForPurchase(
  cards: Card[],
  category: MerchantCategoryId,
  amountBhd: number,
  usageForCard: (cardId: string) => number,
  now: Date = new Date(),
): EarnBreakdown[] {
  return cards
    .map((card) => computeEarn(card, category, amountBhd, usageForCard(card.id), now))
    .sort((a, b) => b.earnedValueFils - a.earnedValueFils);
}
