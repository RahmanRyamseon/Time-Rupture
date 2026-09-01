import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { cardById } from "@/data/cards";
import { useAppState, type StatementSummaryRecord } from "@/lib/store";
import { cardDisplayName, fmtBhd, fmtFils, fmtDate } from "@/lib/format";
import type { Card } from "@/lib/types";
import { EmptyState, Surface } from "@/components/ui";

interface CardRollup {
  card: Card;
  records: StatementSummaryRecord[];
  totalSpendBhd: number;
  totalEarnedValueFils: number;
  txnCount: number;
  periodStart: Date;
  periodEnd: Date;
  annualizedEarnedFils: number;
  netFils: number;
  verdict: "Keep" | "Consider downgrading" | "Consider cancelling";
}

function rollup(card: Card, records: StatementSummaryRecord[]): CardRollup {
  const totalSpendBhd = records.reduce((s, r) => s + r.totalSpendBhd, 0);
  const totalEarnedValueFils = records.reduce((s, r) => s + r.totalEarnedValueFils, 0);
  const txnCount = records.reduce((s, r) => s + r.txnCount, 0);
  const periodStart = new Date(Math.min(...records.map((r) => new Date(r.periodStart).getTime())));
  const periodEnd = new Date(Math.max(...records.map((r) => new Date(r.periodEnd).getTime())));
  const daysCovered = Math.max(1, (periodEnd.getTime() - periodStart.getTime()) / 86_400_000);
  const annualizedEarnedFils = totalEarnedValueFils * (365 / daysCovered);
  const annualFeeFils = card.annualFeeBhd * 1000;

  const netFils = annualizedEarnedFils - annualFeeFils;
  let verdict: CardRollup["verdict"] = "Keep";
  if (annualFeeFils > 0) {
    if (annualizedEarnedFils < annualFeeFils * 0.5) verdict = "Consider cancelling";
    else if (annualizedEarnedFils < annualFeeFils) verdict = "Consider downgrading";
  }

  return { card, records, totalSpendBhd, totalEarnedValueFils, txnCount, periodStart, periodEnd, annualizedEarnedFils, netFils, verdict };
}

const VERDICT_TONE: Record<CardRollup["verdict"], "brand" | "accent" | "danger"> = {
  Keep: "brand",
  "Consider downgrading": "accent",
  "Consider cancelling": "danger",
};

export default function FeeRoiScreen() {
  const router = useRouter();
  const { cardIds, statementSummaries, removeStatementSummary } = useAppState();

  const walletCards = useMemo(() => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c), [cardIds]);

  const rollups = useMemo(() => {
    const byCard = new Map<string, StatementSummaryRecord[]>();
    statementSummaries.forEach((s) => byCard.set(s.cardId, [...(byCard.get(s.cardId) ?? []), s]));
    return Array.from(byCard.entries())
      .map(([cardId, records]) => {
        const card = cardById(cardId);
        return card ? rollup(card, records) : undefined;
      })
      .filter((r): r is CardRollup => !!r)
      .sort((a, b) => a.netFils - b.netFils);
  }, [statementSummaries]);

  const coveredCardIds = new Set(rollups.map((r) => r.card.id));
  const uncoveredWalletCards = walletCards.filter((c) => !coveredCardIds.has(c.id));

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <Text className="text-sm text-foreground/60">
        Real rewards earned (from imported statements), annualized and weighed against each card&apos;s annual fee — a
        keep, downgrade, or cancel verdict based on actual value, not the headline rate.
      </Text>

      {rollups.length === 0 ? (
        <EmptyState
          title="No statement data yet"
          subtitle="Import at least one statement per card on the Statement Import page to see a fee-ROI verdict."
          actionLabel="Import a statement"
          onAction={() => router.push("/statement")}
        />
      ) : (
        <View className="gap-4">
          {rollups.map((r) => (
            <Surface key={r.card.id} className="gap-3">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xs text-foreground/50">{r.card.bank}</Text>
                  <Text className="text-lg font-semibold text-foreground">{r.card.cardName}</Text>
                  <Text className="text-xs text-foreground/50">
                    {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)} · {r.txnCount} txns · {r.records.length} statement{r.records.length === 1 ? "" : "s"}
                  </Text>
                </View>
                <View
                  className={`rounded-full px-3 py-1 ${
                    VERDICT_TONE[r.verdict] === "brand" ? "bg-brand-soft" : VERDICT_TONE[r.verdict] === "accent" ? "bg-accent-soft" : "bg-danger-soft"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      VERDICT_TONE[r.verdict] === "brand" ? "text-brand-strong" : VERDICT_TONE[r.verdict] === "accent" ? "text-accent" : "text-danger"
                    }`}
                  >
                    {r.verdict}
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap gap-3">
                <View className="min-w-[40%]">
                  <Text className="text-sm text-foreground/50">Spend covered</Text>
                  <Text className="text-sm font-medium text-foreground">{fmtBhd(r.totalSpendBhd)}</Text>
                </View>
                <View className="min-w-[40%]">
                  <Text className="text-sm text-foreground/50">Earned (annualized)</Text>
                  <Text className="text-sm font-medium text-foreground">{fmtFils(r.annualizedEarnedFils)}</Text>
                </View>
                <View className="min-w-[40%]">
                  <Text className="text-sm text-foreground/50">Annual fee</Text>
                  <Text className="text-sm font-medium text-foreground">{r.card.annualFeeBhd === 0 ? "Free" : fmtBhd(r.card.annualFeeBhd)}</Text>
                </View>
              </View>

              <Text className={`text-sm font-semibold ${r.netFils >= 0 ? "text-brand-strong" : "text-danger"}`}>
                Net value: {r.netFils >= 0 ? "+" : ""}
                {fmtFils(r.netFils)} / year
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {r.records.map((rec) => (
                  <Pressable key={rec.id} onPress={() => removeStatementSummary(rec.id)} className="rounded-full border border-border px-2 py-0.5">
                    <Text className="text-xs text-foreground/50">
                      {fmtDate(new Date(rec.periodStart))}–{fmtDate(new Date(rec.periodEnd))} ✕
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Surface>
          ))}
        </View>
      )}

      {uncoveredWalletCards.length > 0 && (
        <Surface className="gap-2">
          <Text className="text-sm font-semibold text-foreground">No statement data yet for</Text>
          <View className="flex-row flex-wrap gap-2">
            {uncoveredWalletCards.map((c) => (
              <View key={c.id} className="rounded-full bg-surface-muted px-3 py-1">
                <Text className="text-sm text-foreground/60">{cardDisplayName(c)}</Text>
              </View>
            ))}
          </View>
          <Text className="text-sm font-medium text-brand-strong" onPress={() => router.push("/statement")} suppressHighlighting>
            Import a statement for one of these
          </Text>
        </Surface>
      )}

      <Text className="text-xs text-foreground/40">
        Annualized by scaling the imported period&apos;s earnings to 365 days — accuracy improves with longer or
        multiple imported periods. Import statements periodically to keep this current.
      </Text>
    </ScrollView>
  );
}
