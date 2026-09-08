import type { Category } from "./types";

const ADJUSTMENT_YEARS: Record<Category, number> = {
  "Movable (5 yr)": 5,
  "Real estate (10 yr)": 10,
};

export interface CapitalAssetCalc {
  slice: number; // annual portion of input VAT subject to the adjustment
  adjustment: number; // signed BHD adjustment for the current year
  trigger: boolean; // whether the taxable-use % has moved from baseline
}

/** Capital Assets Adjustment Scheme — Article 47. */
export function calcCapitalAsset(asset: {
  inputVat: number;
  basePct: number;
  curPct: number;
  category: Category;
}): CapitalAssetCalc {
  const years = ADJUSTMENT_YEARS[asset.category];
  const slice = Math.round((asset.inputVat / years) * 1000) / 1000;
  const delta = (asset.curPct - asset.basePct) / 100;
  const adjustment = Math.round(slice * delta * 1000) / 1000;
  const trigger = Math.abs(asset.curPct - asset.basePct) >= 0.01;
  return { slice, adjustment, trigger };
}
