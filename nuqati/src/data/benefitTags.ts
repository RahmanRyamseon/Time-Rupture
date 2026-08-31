import type { Card } from "@/lib/types";

export interface BenefitTag {
  id: string;
  label: string;
  test: (card: Card) => boolean;
}

function textOf(card: Card): string {
  return `${card.keyBenefits.join(" ")} ${card.welcomeBonus ?? ""}`.toLowerCase();
}

// Curated, keyword-matched — not a manually re-tagged field, so it stays accurate as
// new cards are added without needing a second pass over every card's benefits text.
export const BENEFIT_TAGS: BenefitTag[] = [
  { id: "no-fee", label: "No annual fee", test: (c) => c.annualFeeBhd === 0 },
  { id: "welcome-bonus", label: "Welcome bonus", test: (c) => !!c.welcomeBonus },
  { id: "lounge", label: "Airport lounge access", test: (c) => /loung/.test(textOf(c)) },
  { id: "travel-insurance", label: "Travel insurance", test: (c) => /travel insurance/.test(textOf(c)) },
  { id: "concierge", label: "Concierge service", test: (c) => /concierge/.test(textOf(c)) },
  {
    id: "purchase-protection",
    label: "Purchase / fraud protection",
    test: (c) => /purchase protection|buyer.{0,2}s protection|misuse protection|fraud/.test(textOf(c)),
  },
  { id: "dining-cinema", label: "Dining / cinema discounts", test: (c) => /dining|cinema|movie/.test(textOf(c)) },
  { id: "installment", label: "0% installment plans", test: (c) => /installment|0% interest/.test(textOf(c)) },
  { id: "fx-fee-disclosed", label: "FX fee disclosed", test: (c) => c.fxFeePct !== undefined },
];

export function matchesAllBenefitTags(card: Card, selectedTagIds: string[]): boolean {
  if (selectedTagIds.length === 0) return true;
  return selectedTagIds.every((id) => BENEFIT_TAGS.find((t) => t.id === id)?.test(card) ?? false);
}
