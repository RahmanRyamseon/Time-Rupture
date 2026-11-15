import type { PriceReport } from "@/lib/types";

export interface Per10 {
  value: number;
  unit: "ml" | "g";
  reportedOn: string;
}

/**
 * Lowest listed price per 10 units, in the seller's own unit (g or ml).
 * Uses only the most recent report date for the item; never converts g to ml.
 */
export function lowestPer10(prices: Pick<PriceReport, "price_min_inr" | "volume_ml" | "unit" | "reported_on">[]): Per10 | null {
  const valid = prices.filter((p) => Number(p.volume_ml) > 0 && Number(p.price_min_inr) > 0);
  if (!valid.length) return null;
  const latest = valid.reduce((d, p) => (p.reported_on > d ? p.reported_on : d), valid[0].reported_on);
  let best: Per10 | null = null;
  for (const p of valid.filter((x) => x.reported_on === latest)) {
    const value = (Number(p.price_min_inr) / Number(p.volume_ml)) * 10;
    if (!best || value < best.value) best = { value, unit: (p.unit ?? "ml") as "ml" | "g", reportedOn: p.reported_on };
  }
  return best;
}

/** Cheapest first; versions without a price last, then by name. */
export function byPer10<T extends { name: string; per10: Per10 | null }>(a: T, b: T) {
  if (a.per10 && b.per10) return a.per10.value - b.per10.value;
  if (a.per10) return -1;
  if (b.per10) return 1;
  return a.name.localeCompare(b.name);
}

export interface EntryPrice {
  price: number;
  volume: number;
  unit: "ml" | "g";
  reportedOn: string;
  sourceName: string;
  sourceUrl: string | null;
}

/** The cheapest single bottle listed on the latest report date: what it costs to try. */
export function entryPrice(
  prices: Pick<PriceReport, "price_min_inr" | "volume_ml" | "unit" | "reported_on" | "source_name" | "source_url">[],
): EntryPrice | null {
  const valid = prices.filter((p) => Number(p.volume_ml) > 0 && Number(p.price_min_inr) > 0);
  if (!valid.length) return null;
  const latest = valid.reduce((d, p) => (p.reported_on > d ? p.reported_on : d), valid[0].reported_on);
  const cheapest = valid
    .filter((p) => p.reported_on === latest)
    .sort((a, b) => Number(a.price_min_inr) - Number(b.price_min_inr) || Number(b.volume_ml) - Number(a.volume_ml))[0];
  return {
    price: Number(cheapest.price_min_inr),
    volume: Number(cheapest.volume_ml),
    unit: (cheapest.unit ?? "ml") as "ml" | "g",
    reportedOn: cheapest.reported_on,
    sourceName: cheapest.source_name,
    sourceUrl: cheapest.source_url,
  };
}

/** Budget pages: /best/attars-under-{max}. */
export const BUDGETS = [500, 1000, 2000] as const;
export type Budget = (typeof BUDGETS)[number];
export const budgetSlug = (max: number) => `attars-under-${max}`;
export function budgetFromSlug(slug: string): Budget | null {
  const m = /^attars-under-(\d+)$/.exec(slug);
  const n = m ? Number(m[1]) : NaN;
  return (BUDGETS as readonly number[]).includes(n) ? (n as Budget) : null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** Brand-vs-brand pages: houses with at least this many priced products. */
export const BRAND_MIN_PRICED = 5;
export const pairSlug = (a: string, b: string) => [a, b].sort().join("-vs-");
