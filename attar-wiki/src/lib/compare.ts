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
