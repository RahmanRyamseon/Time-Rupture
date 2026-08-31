import type { MerchantCategoryId } from "@/lib/types";

// Keyword → category map used to auto-categorize a bank-statement description line.
// Deliberately conservative and Bahrain-flavored; anything unmatched falls back to "other"
// and the user can always override the guess in the statement importer.
export const MERCHANT_KEYWORDS: Record<MerchantCategoryId, string[]> = {
  groceries: ["lulu", "carrefour", "al jazira", "mega mart", "megamart", "geant", "nesto", "hypermarket", "supermarket", "grocery"],
  dining: ["talabat", "jahez", "restaurant", "cafe", "coffee", "starbucks", "costa", "mcdonald", "kfc", "burger", "pizza", "cinnabon", "dunkin", "shawarma"],
  fuel: ["bapco", "oil city", "petrol", "fuel", "gas station"],
  online: ["amazon", "noon", "shein", "iherb", "vogacloset", "aliexpress", "ebay", "apple.com/bill", "google play", "app store"],
  travel: ["gulf air", "emirates", "qatar airways", "etihad", "saudia", "booking.com", "airbnb", "agoda", "hotel", "airline", "airport", "expedia", "trip.com"],
  education: ["school", "university", "tuition", "college", "academy", "nursery"],
  utilities: ["ewa", "batelco", "stc", "zain", "electricity", "water authority", "internet bill", "telecom"],
  healthcare: ["pharmacy", "clinic", "hospital", "medical", "dental", "boots"],
  other: [],
};

export function categorizeMerchant(description: string): MerchantCategoryId {
  const text = description.toLowerCase();
  for (const [category, keywords] of Object.entries(MERCHANT_KEYWORDS) as [MerchantCategoryId, string[]][]) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }
  return "other";
}
