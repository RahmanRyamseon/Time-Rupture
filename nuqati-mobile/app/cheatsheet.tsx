import { useMemo } from "react";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { cardById } from "@/data/cards";
import { MERCHANT_CATEGORIES } from "@/data/merchantCategories";
import { ILLUSTRATIVE_MONTHLY_SPEND } from "@/data/spendProfile";
import { useAppState } from "@/lib/store";
import { rankCardsForPurchase } from "@/lib/rewards";
import { cardDisplayName, fmtBhd, fmtDate, nextCycleStart } from "@/lib/format";
import { EmptyState, Surface } from "@/components/ui";

export default function CheatsheetScreen() {
  const router = useRouter();
  const { cardIds, usageForCard } = useAppState();

  const walletCards = useMemo(() => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c), [cardIds]);

  const byCategory = useMemo(
    () =>
      MERCHANT_CATEGORIES.map((cat) => {
        const amount = ILLUSTRATIVE_MONTHLY_SPEND[cat.id] || 30;
        const ranked = rankCardsForPurchase(walletCards, cat.id, amount, (id) => usageForCard(id, cat.id));
        return { category: cat, ranked };
      }),
    [walletCards, usageForCard],
  );

  const capAlerts = useMemo(() => {
    const alerts: { card: (typeof walletCards)[number]; category: (typeof MERCHANT_CATEGORIES)[number]; used: number; cap: number; alternative?: string }[] = [];
    walletCards.forEach((card) => {
      card.earnRules.forEach((rule) => {
        if (!rule.capPerMonthBhd) return;
        const used = usageForCard(card.id, rule.category);
        const pct = used / rule.capPerMonthBhd;
        if (pct >= 0.8) {
          const category = MERCHANT_CATEGORIES.find((c) => c.id === rule.category)!;
          const ranked = rankCardsForPurchase(walletCards, rule.category, 30, (id) => usageForCard(id, rule.category));
          const alt = ranked.find((r) => r.card.id !== card.id);
          alerts.push({ card, category, used, cap: rule.capPerMonthBhd, alternative: alt ? cardDisplayName(alt.card) : undefined });
        }
      });
    });
    return alerts;
  }, [walletCards, usageForCard]);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <Text className="text-sm text-foreground/60">
        Which card to reach for, by category, this billing cycle — plus a heads-up before any bonus cap runs out.
        Resets {fmtDate(nextCycleStart())}.
      </Text>

      {walletCards.length === 0 ? (
        <EmptyState title="Your wallet is empty" subtitle="Add cards to generate your cheat sheet." actionLabel="Go to My Wallet" onAction={() => router.push("/wallet")} />
      ) : (
        <>
          {capAlerts.length > 0 && (
            <Surface className="border-danger/30 gap-2">
              <Text className="text-sm font-semibold text-danger">Cap running low this cycle</Text>
              {capAlerts.map((a, i) => (
                <Text key={i} className="text-sm text-foreground/80">
                  <Text className="font-medium text-foreground">{cardDisplayName(a.card)}</Text> · {a.category.nameEn}: {fmtBhd(a.used)} of{" "}
                  {fmtBhd(a.cap)} bonus cap used.
                  {a.alternative && (
                    <>
                      {" "}
                      Switch to <Text className="font-medium text-foreground">{a.alternative}</Text> for the rest of this cycle.
                    </>
                  )}
                </Text>
              ))}
            </Surface>
          )}

          <View className="flex-row flex-wrap gap-3">
            {byCategory.map(({ category, ranked }) => {
              const best = ranked[0];
              return (
                <Surface key={category.id} className="min-w-[45%] flex-1">
                  <Text className="flex-row items-center gap-2 text-sm font-semibold text-foreground">
                    {category.icon} {category.nameEn}
                  </Text>
                  {best ? (
                    <>
                      <Text className="mt-2 font-medium text-brand-strong">{cardDisplayName(best.card)}</Text>
                      <Text className="text-xs text-foreground/50">{(best.effectiveRatePct * 100).toFixed(2)}% effective</Text>
                      {best.capHitThisCycle && <Text className="mt-1 text-xs text-danger">Cap used — reverting to base rate</Text>}
                    </>
                  ) : (
                    <Text className="mt-2 text-sm text-foreground/40">No cards in wallet</Text>
                  )}
                </Surface>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}
