import type { MerchantCategoryId } from "@/lib/types";

/**
 * An illustrative BHD 500/month household spend profile, used only to produce
 * a representative "estimated value" for wallet summaries and card comparisons.
 * Real value depends entirely on a user's actual spend — see Smart Swipe for that.
 */
export const ILLUSTRATIVE_MONTHLY_SPEND: Record<MerchantCategoryId, number> = {
  groceries: 150,
  dining: 80,
  fuel: 40,
  online: 60,
  travel: 50,
  utilities: 40,
  healthcare: 30,
  education: 0,
  other: 50,
};

export const ILLUSTRATIVE_MONTHLY_TOTAL = Object.values(ILLUSTRATIVE_MONTHLY_SPEND).reduce((a, b) => a + b, 0);
