import type { ProductRow } from "@/lib/data/wiki";
import { BRAND_MIN_PRICED, entryPrice, lowestPer10, median, pairSlug } from "@/lib/compare";

export interface HouseSummary {
  slug: string;
  name: string;
  products: ProductRow[];
  priced: number;
  /** Cheapest and dearest entry price (one bottle). */
  entryMin: number | null;
  entryMax: number | null;
  /** Median price per 10 units, per unit actually used. */
  medianPer10: Partial<Record<"ml" | "g", number>>;
  /** Share of products whose listing states a method or type (natural, ruh ...). */
  methodStated: number;
}

export function summariseHouses(rows: ProductRow[]): HouseSummary[] {
  const byHouse = new Map<string, ProductRow[]>();
  for (const r of rows) byHouse.set(r.house.slug, [...(byHouse.get(r.house.slug) ?? []), r]);
  return [...byHouse.entries()].map(([slug, products]) => {
    const entries = products.map((p) => entryPrice(p.prices)).filter((e) => e !== null);
    const per10 = products.map((p) => lowestPer10(p.prices)).filter((e) => e !== null);
    const medianPer10: HouseSummary["medianPer10"] = {};
    for (const unit of ["ml", "g"] as const) {
      const m = median(per10.filter((x) => x.unit === unit).map((x) => x.value));
      if (m != null) medianPer10[unit] = m;
    }
    return {
      slug,
      name: products[0].house.name,
      products,
      priced: entries.length,
      entryMin: entries.length ? Math.min(...entries.map((e) => e.price)) : null,
      entryMax: entries.length ? Math.max(...entries.map((e) => e.price)) : null,
      medianPer10,
      methodStated: products.filter((p) => p.attar_type).length / products.length,
    };
  });
}

/** Every pair of houses that both have enough priced products to compare. */
export function brandPairs(rows: ProductRow[]) {
  const houses = summariseHouses(rows)
    .filter((h) => h.priced >= BRAND_MIN_PRICED)
    .sort((a, b) => b.priced - a.priced || a.name.localeCompare(b.name));
  const pairs: { slug: string; a: HouseSummary; b: HouseSummary }[] = [];
  for (let i = 0; i < houses.length; i++)
    for (let j = i + 1; j < houses.length; j++) {
      const [a, b] = [houses[i], houses[j]].sort((x, y) => x.slug.localeCompare(y.slug));
      pairs.push({ slug: pairSlug(a.slug, b.slug), a, b });
    }
  return pairs;
}

/** Styles both houses make, with each house's versions. */
export function sharedStyles(a: HouseSummary, b: HouseSummary) {
  const styles = new Set(a.products.flatMap((p) => p.styles));
  return [...styles]
    .filter((s) => b.products.some((p) => p.styles.includes(s)))
    .map((s) => ({ style: s, a: a.products.filter((p) => p.styles.includes(s)), b: b.products.filter((p) => p.styles.includes(s)) }));
}
