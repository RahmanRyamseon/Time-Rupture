import type { Card, MerchantCategoryId } from "@/lib/types";
import { categorizeMerchant } from "@/data/merchantKeywords";
import { parseCsvWithHeader } from "@/lib/csv";
import { computeEarn, type EarnBreakdown } from "@/lib/rewards";
import { currentCycleKey } from "@/lib/format";

/** A card's typical GCC foreign-transaction fee when the card itself doesn't publish one. */
export const DEFAULT_ESTIMATED_FX_FEE_PCT = 0.025;

export interface ParsedTransaction {
  id: string;
  date: Date;
  description: string;
  amountBhd: number;
  category: MerchantCategoryId;
  isForeign: boolean;
}

const DATE_HEADERS = ["date", "transaction date", "posting date", "txn date"];
const DESC_HEADERS = ["description", "merchant", "narration", "details", "particulars"];
const AMOUNT_HEADERS = ["amount", "amount (bhd)", "debit", "value", "amount bhd"];
const CURRENCY_HEADERS = ["currency", "ccy", "original currency"];

function findHeader(headers: string[], candidates: string[]): string | undefined {
  return headers.find((h) => candidates.includes(h)) ?? headers.find((h) => candidates.some((c) => h.includes(c)));
}

export interface StatementParseResult {
  transactions: ParsedTransaction[];
  skippedRows: number;
  totalRows: number;
}

/**
 * Parses a bank-statement CSV into transactions, auto-categorizing each by merchant
 * keyword. Rows with a negative/credit amount (payments, refunds) are skipped — this
 * models spend only. Any row whose date or amount can't be parsed is also skipped.
 */
export function parseStatement(csvText: string): StatementParseResult {
  const rows = parseCsvWithHeader(csvText);
  if (rows.length === 0) return { transactions: [], skippedRows: 0, totalRows: 0 };

  const headers = Object.keys(rows[0]);
  const dateKey = findHeader(headers, DATE_HEADERS);
  const descKey = findHeader(headers, DESC_HEADERS);
  const amountKey = findHeader(headers, AMOUNT_HEADERS);
  const currencyKey = findHeader(headers, CURRENCY_HEADERS);

  const transactions: ParsedTransaction[] = [];
  let skipped = 0;

  rows.forEach((row, i) => {
    const rawDate = dateKey ? row[dateKey] : "";
    const rawDesc = descKey ? row[descKey] : "";
    const rawAmount = amountKey ? row[amountKey] : "";

    const date = new Date(rawDate);
    const amount = Number(rawAmount.replace(/[^0-9.-]/g, ""));

    if (!rawDate || Number.isNaN(date.getTime()) || !rawAmount || Number.isNaN(amount) || amount <= 0) {
      skipped++;
      return;
    }

    const currency = currencyKey ? row[currencyKey]?.toUpperCase() : "";
    transactions.push({
      id: `row-${i}`,
      date,
      description: rawDesc || "(no description)",
      amountBhd: amount,
      category: categorizeMerchant(rawDesc),
      isForeign: !!currency && currency !== "BHD" && currency !== "BD",
    });
  });

  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
  return { transactions, skippedRows: skipped, totalRows: rows.length };
}

export interface TransactionResult {
  transaction: ParsedTransaction;
  breakdown: EarnBreakdown;
  fxCostFils: number;
  netValueFils: number;
}

function fxCostFor(card: Card, txn: ParsedTransaction): number {
  if (!txn.isForeign) return 0;
  const pct = card.fxFeePct ?? DEFAULT_ESTIMATED_FX_FEE_PCT;
  return txn.amountBhd * pct * 1000;
}

/**
 * Runs a transaction list against ONE card in date order, maintaining that card's own
 * running monthly-cap usage across the statement's timeline — this is what the card
 * actually earned (net of estimated FX fees) if every one of these purchases had gone
 * on it, respecting caps exactly the way Smart Swipe does for a single live purchase.
 */
export function simulateChronological(card: Card, transactions: ParsedTransaction[]): TransactionResult[] {
  const usage: Record<string, number> = {};
  return transactions.map((txn) => {
    const key = `${currentCycleKey(txn.date)}::${txn.category}`;
    const prior = usage[key] ?? 0;
    const breakdown = computeEarn(card, txn.category, txn.amountBhd, prior, txn.date);
    usage[key] = prior + txn.amountBhd;
    const fxCostFils = fxCostFor(card, txn);
    return { transaction: txn, breakdown, fxCostFils, netValueFils: breakdown.earnedValueFils - fxCostFils };
  });
}

export interface OptimizedTransactionResult extends TransactionResult {
  card: Card;
  actualCard?: Card;
  actualResult?: TransactionResult;
  deltaFils: number;
}

export interface StatementSummary {
  perTransaction: OptimizedTransactionResult[];
  totalOptimalNetFils: number;
  totalActualNetFils: number;
  totalSpendBhd: number;
  totalLeftOnTableFils: number;
  periodStart?: Date;
  periodEnd?: Date;
}

/**
 * The core "transaction-level, cap-aware, marginal" optimizer: walks the statement in
 * date order and for every purchase picks whichever wallet card would earn the most
 * *at that point in the simulated month* — each card accumulating cap usage only from
 * the transactions actually assigned to it, exactly like a real cardholder switching
 * cards mid-cycle as caps fill up. If `actualCard` is supplied, also computes what that
 * one real card would have earned on the same transaction, for a real-vs-optimal delta.
 */
export function optimizeStatement(wallet: Card[], transactions: ParsedTransaction[], actualCard?: Card): StatementSummary {
  const usageByCard: Record<string, Record<string, number>> = {};
  wallet.forEach((c) => (usageByCard[c.id] = {}));
  const actualUsage: Record<string, number> = {};

  const perTransaction: OptimizedTransactionResult[] = transactions.map((txn) => {
    let best: { card: Card; breakdown: EarnBreakdown; fxCostFils: number; netValueFils: number } | undefined;

    for (const card of wallet) {
      const key = `${currentCycleKey(txn.date)}::${txn.category}`;
      const prior = usageByCard[card.id][key] ?? 0;
      const breakdown = computeEarn(card, txn.category, txn.amountBhd, prior, txn.date);
      const fxCostFils = fxCostFor(card, txn);
      const netValueFils = breakdown.earnedValueFils - fxCostFils;
      if (!best || netValueFils > best.netValueFils) best = { card, breakdown, fxCostFils, netValueFils };
    }

    // best is always defined when wallet is non-empty
    const chosen = best!;
    const key = `${currentCycleKey(txn.date)}::${txn.category}`;
    usageByCard[chosen.card.id][key] = (usageByCard[chosen.card.id][key] ?? 0) + txn.amountBhd;

    let actualResult: TransactionResult | undefined;
    if (actualCard) {
      const aKey = `${currentCycleKey(txn.date)}::${txn.category}`;
      const aPrior = actualUsage[aKey] ?? 0;
      const aBreakdown = computeEarn(actualCard, txn.category, txn.amountBhd, aPrior, txn.date);
      actualUsage[aKey] = aPrior + txn.amountBhd;
      const aFx = fxCostFor(actualCard, txn);
      actualResult = { transaction: txn, breakdown: aBreakdown, fxCostFils: aFx, netValueFils: aBreakdown.earnedValueFils - aFx };
    }

    return {
      transaction: txn,
      card: chosen.card,
      breakdown: chosen.breakdown,
      fxCostFils: chosen.fxCostFils,
      netValueFils: chosen.netValueFils,
      actualCard,
      actualResult,
      deltaFils: actualResult ? chosen.netValueFils - actualResult.netValueFils : 0,
    };
  });

  const totalOptimalNetFils = perTransaction.reduce((s, t) => s + t.netValueFils, 0);
  const totalActualNetFils = perTransaction.reduce((s, t) => s + (t.actualResult?.netValueFils ?? 0), 0);
  const totalSpendBhd = transactions.reduce((s, t) => s + t.amountBhd, 0);

  return {
    perTransaction,
    totalOptimalNetFils,
    totalActualNetFils,
    totalSpendBhd,
    totalLeftOnTableFils: actualCard ? totalOptimalNetFils - totalActualNetFils : 0,
    periodStart: transactions[0]?.date,
    periodEnd: transactions[transactions.length - 1]?.date,
  };
}
