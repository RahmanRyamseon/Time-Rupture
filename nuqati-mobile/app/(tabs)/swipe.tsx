import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { ScrollView, Text, TextInput, View } from "react-native";
import { cardById } from "@/data/cards";
import { MERCHANT_CATEGORIES, categoryById } from "@/data/merchantCategories";
import { useAppState } from "@/lib/store";
import { rankCardsForPurchase, type EarnBreakdown } from "@/lib/rewards";
import { cardDisplayName, fmtBhd, fmtDate, fmtFils, fmtPoints } from "@/lib/format";
import type { MerchantCategoryId } from "@/lib/types";
import { Chip, EmptyState, PrimaryButton, Surface } from "@/components/ui";

export default function SwipeScreen() {
  const router = useRouter();
  const { cardIds, usageForCard, logSwipe, hydrated } = useAppState();
  const [category, setCategory] = useState<MerchantCategoryId>("groceries");
  const [amount, setAmount] = useState("30");
  const [loggedFor, setLoggedFor] = useState<string | null>(null);

  const walletCards = useMemo(() => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c), [cardIds]);
  const amountNum = Math.max(0, Number(amount) || 0);

  const ranked: EarnBreakdown[] = useMemo(() => {
    if (walletCards.length === 0) return [];
    return rankCardsForPurchase(walletCards, category, amountNum, (id) => usageForCard(id, category));
  }, [walletCards, category, amountNum, usageForCard]);

  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const savingsVsWorst = best && worst && ranked.length > 1 ? best.earnedValueFils - worst.earnedValueFils : 0;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View>
        <Text className="text-2xl font-bold tracking-tight text-foreground">Smart Swipe Advisor</Text>
        <Text className="mt-1 text-sm text-foreground/60">
          Pick a category and amount — Nuqati ranks your wallet so you always know which card to hand over.
        </Text>
        <Text className="text-xs text-foreground/40">
          Rankings assume the best available redemption for points/miles cards — see Points Value for cashback-only
          figures.
        </Text>
      </View>

      {hydrated && walletCards.length === 0 ? (
        <EmptyState title="Your wallet is empty" subtitle="Add a few cards first so Nuqati has something to compare." actionLabel="Go to My Wallet" onAction={() => router.push("/wallet")} />
      ) : (
        <>
          <Surface className="gap-3">
            <Text className="text-xs font-medium uppercase tracking-wide text-foreground/50">Category</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {MERCHANT_CATEGORIES.map((c) => (
                <Chip key={c.id} label={`${c.icon} ${c.nameEn}`} active={category === c.id} onPress={() => setCategory(c.id)} />
              ))}
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-medium uppercase tracking-wide text-foreground/50">Spend</Text>
              <View className="flex-row items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5">
                <Text className="text-sm text-foreground/50">BD</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  className="w-20 text-sm text-foreground"
                />
              </View>
            </View>
          </Surface>

          {best && (
            <View className="rounded-2xl border border-brand bg-brand-soft p-4 gap-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-brand-strong">Recommended</Text>
              <Text className="text-lg font-bold text-foreground">
                Use your {cardDisplayName(best.card)} for {categoryById(category).nameEn.toLowerCase()}
              </Text>
              <Text className="text-sm text-foreground/70">
                {best.effectiveRatePct >= 0.005
                  ? `${(best.effectiveRatePct * 100).toFixed(1)}% effective reward`
                  : `${fmtPoints(best.earnedUnits)} ${best.card.currency}`}{" "}
                = {fmtFils(best.earnedValueFils)} on {fmtBhd(amountNum)} spend.
                {ranked.length > 1 && savingsVsWorst > 0 && (
                  <> That&apos;s {fmtFils(savingsVsWorst)} more than your worst card ({cardDisplayName(worst.card)}) for this purchase.</>
                )}
              </Text>
              <View className="mt-2 flex-row items-center gap-2">
                <PrimaryButton
                  label="Log this swipe"
                  onPress={() => {
                    logSwipe(best.card.id, category, amountNum);
                    setLoggedFor(best.card.id);
                  }}
                />
                {loggedFor === best.card.id && <Text className="text-xs text-brand-strong">Logged toward this cycle&apos;s cap ✓</Text>}
              </View>
            </View>
          )}

          <View className="gap-3">
            {ranked.map((r, i) => (
              <RankedCardRow key={r.card.id} rank={i + 1} breakdown={r} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function RankedCardRow({ rank, breakdown }: { rank: number; breakdown: EarnBreakdown }) {
  const { card, capApplies, capHitThisCycle, capPerMonthBhd, spentTowardCapBhd, cycleResetsOn } = breakdown;
  const capUsedPct = capApplies && capPerMonthBhd ? Math.min(100, (spentTowardCapBhd / capPerMonthBhd) * 100) : 0;

  return (
    <Surface className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="h-7 w-7 items-center justify-center rounded-full bg-surface-muted">
            <Text className="text-xs font-bold text-foreground">{rank}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-foreground/50">{card.bank}</Text>
            <Text className="font-semibold leading-tight text-foreground">{card.cardName}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="font-bold text-brand-strong">{fmtFils(breakdown.earnedValueFils)}</Text>
          <Text className="text-xs text-foreground/50">{(breakdown.effectiveRatePct * 100).toFixed(2)}% effective</Text>
        </View>
      </View>

      {capApplies && (
        <View>
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <View className={`h-full rounded-full ${capHitThisCycle ? "bg-danger" : "bg-accent"}`} style={{ width: `${capUsedPct}%` }} />
          </View>
          {capHitThisCycle ? (
            <Text className="mt-1 text-xs font-medium text-danger">
              Bonus cap used this cycle — extra spend earns the base rate. Restarts {fmtDate(cycleResetsOn)}.
            </Text>
          ) : (
            <Text className="mt-1 text-xs text-foreground/50">
              {fmtBhd(spentTowardCapBhd)} of {fmtBhd(capPerMonthBhd!)} bonus cap used this cycle · resets {fmtDate(cycleResetsOn)}
            </Text>
          )}
        </View>
      )}
    </Surface>
  );
}
