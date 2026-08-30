import { BAHRAIN_CARDS, BANKS } from "@/data/cards";

export function DataDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-foreground/55 ${className}`}>
      Card data is a curated, illustrative dataset ({BAHRAIN_CARDS.length} cards across Bahrain&apos;s{" "}
      {BANKS.length} major issuing banks) built for demonstration — not a live bank feed. Rates, caps
      and fees are approximate; always confirm current terms with your bank before deciding. Last
      verified 1 Aug 2026.
    </p>
  );
}
