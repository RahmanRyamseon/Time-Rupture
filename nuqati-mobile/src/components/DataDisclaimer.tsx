import { Text } from "react-native";
import { BAHRAIN_CARDS, BANKS, activeCards } from "@/data/cards";

export function DataDisclaimer() {
  return (
    <Text className="text-xs leading-relaxed text-foreground/55">
      Card data is a curated dataset ({activeCards().length} active cards, plus {BAHRAIN_CARDS.length - activeCards().length}{" "}
      legacy/discontinued, across {BANKS.length} Bahrain issuing entities) built from a research pass over published bank pages
      and T&Cs — not a live bank feed. Fields marked &ldquo;(sourced)&rdquo; in a card&apos;s details come from that research;
      everything else, including most fees, minimum salaries, and MCC-level rates not called out as sourced, is estimated.
      Always confirm current terms with your bank before deciding. Last verified 1 Aug 2026.
    </Text>
  );
}
