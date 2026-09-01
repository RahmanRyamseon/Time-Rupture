import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { cardById, BANKS, activeCards } from "@/data/cards";
import { useAppState } from "@/lib/store";
import { estimateMonthlyValueFils } from "@/lib/rewards";
import { fmtFils } from "@/lib/format";
import { DataDisclaimer } from "@/components/DataDisclaimer";
import { PrimaryButton, SecondaryButton, StatTile, Surface } from "@/components/ui";
import type { Href } from "expo-router";

const FEATURES: { href: Href; title: string; blurb: string; icon: string }[] = [
  { href: "/explore", title: "Explore Benefits", blurb: "Filter by country, bank, and card type to see every benefit and exactly how points can be used.", icon: "🔍" },
  { href: "/wallet", title: "My Wallet", blurb: "Add your Bahrain cards from a curated database — no bank login, ever.", icon: "👛" },
  { href: "/swipe", title: "Smart Swipe Advisor", blurb: "Pick a category and amount — instantly see which card in your wallet earns the most.", icon: "⚡" },
  { href: "/statement", title: "Statement Import", blurb: "Import real transactions and see, purchase by purchase, what you actually earned vs. your best card — caps and all.", icon: "📄" },
  { href: "/cheatsheet", title: "Monthly Cheat Sheet", blurb: "A category-by-category best-card grid for this cycle, plus alerts when a bonus cap is nearly used up.", icon: "🗒️" },
  { href: "/fee-roi", title: "Fee-ROI Report", blurb: "Real rewards earned, annualized, weighed against each card's annual fee — keep, downgrade, or cancel.", icon: "⚖️" },
  { href: "/points", title: "Points Valuation Engine", blurb: "See what your points are really worth: cashback vs. airline/hotel transfer, with a clear recommended path.", icon: "💎" },
  { href: "/transfers", title: "Transfer Partner Navigator", blurb: "The full bank-points → Falconflyer/AlFursan/Shukran transfer map, with a simulator.", icon: "🔁" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { cardIds, hydrated } = useAppState();

  const walletCards = useMemo(() => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c), [cardIds]);
  const totalMonthlyValue = walletCards.reduce((sum, c) => sum + estimateMonthlyValueFils(c, true), 0);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-8">
      <View className="gap-4">
        <View className="self-start rounded-full bg-brand-soft px-3 py-1">
          <Text className="text-xs font-semibold text-brand-strong">Bahrain · Phase 1 MVP</Text>
        </View>
        <Text className="text-3xl font-bold tracking-tight text-foreground">
          Which card should you swipe? What are your points actually worth?
        </Text>
        <Text className="text-base text-foreground/70">
          <Text className="font-bold">Nuqati</Text> (نقاطي — “my points”) is a GCC credit card rewards optimizer. Look up
          what any bank, in any country, actually offers — by card type, with exactly how the points can be used — then
          add the cards you carry for real-time recommendations and honest valuations. Starting with{" "}
          {activeCards().length} major cards across {BANKS.length} Bahrain issuing entities.
        </Text>
        <View className="flex-row flex-wrap gap-3">
          <PrimaryButton label="Explore benefits" onPress={() => router.push("/explore")} />
          <SecondaryButton
            label={hydrated && walletCards.length > 0 ? "Manage my wallet" : "Add your first card"}
            onPress={() => router.push("/wallet")}
          />
        </View>
      </View>

      {hydrated && walletCards.length > 0 && (
        <View className="flex-row flex-wrap gap-3">
          <StatTile label="Cards in your wallet" value={String(walletCards.length)} />
          <StatTile label="Est. cashback value / month*" value={fmtFils(totalMonthlyValue)} />
          <StatTile label="Banks covered" value={String(BANKS.length)} />
        </View>
      )}

      <View>
        <Text className="mb-4 text-lg font-semibold text-foreground">Everything you need to understand and optimize your cards</Text>
        <View className="gap-3">
          {FEATURES.map((f) => (
            <Pressable key={f.href.toString()} onPress={() => router.push(f.href)}>
              <Surface className="gap-1">
                <Text className="text-xl">{f.icon}</Text>
                <Text className="font-semibold text-foreground">{f.title}</Text>
                <Text className="text-sm text-foreground/60">{f.blurb}</Text>
              </Surface>
            </Pressable>
          ))}
        </View>
      </View>

      <Surface className="gap-2">
        <Text className="text-lg font-semibold text-foreground">How the reward caps work</Text>
        <Text className="text-sm text-foreground/70">
          Many Bahrain cards pay a bonus rate on a category (e.g. 3x on groceries) only up to a monthly spend cap.
          Nuqati tracks how much of that cap you&apos;ve used this billing cycle — once it&apos;s fully used, Smart
          Swipe automatically shows the card reverting to its base rate. The cap restarts on its own the moment the
          next cycle begins, no action needed.{" "}
          <Text className="font-medium text-brand-strong" onPress={() => router.push("/swipe")} suppressHighlighting>
            Log your swipes on Smart Swipe
          </Text>{" "}
          to track this in real time.
        </Text>
      </Surface>

      <View className="gap-2">
        <Text className="text-lg font-semibold text-foreground">What&apos;s not here yet — and why</Text>
        <Text className="text-sm text-foreground/60">
          Two things from the wider GCC roadmap are deliberately not shipped: card data for UAE, Saudi, Qatar, Kuwait,
          and Oman (no verified source for those markets yet — see Explore Benefits), and true push/SMS alerts (Nuqati
          has no backend to send them from; the Monthly Cheat Sheet&apos;s in-app cap warnings are the client-side
          equivalent). Points expiry alerts and an AI points concierge remain later-phase ideas.
        </Text>
      </View>

      <DataDisclaimer />
    </ScrollView>
  );
}
