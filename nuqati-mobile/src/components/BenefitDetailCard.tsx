import { Text, View } from "react-native";
import type { Card } from "@/lib/types";
import { MERCHANT_CATEGORIES, categoryById } from "@/data/merchantCategories";
import { programById } from "@/data/loyaltyPrograms";
import { pointsUsageFor } from "@/lib/benefits";
import { fmtBhd } from "@/lib/format";
import { Badge } from "@/components/ui";

const NETWORK_TONE: Record<Card["network"], "brand" | "accent" | "muted"> = {
  Visa: "brand",
  Mastercard: "accent",
  Amex: "muted",
};

function formatRate(card: Card, rate: number) {
  return card.currency === "cashback" ? `${(rate * 100).toFixed(1)}%` : `${rate}x`;
}

export function BenefitDetailCard({ card }: { card: Card }) {
  const usage = pointsUsageFor(card);
  const program = programById(card.loyaltyProgramId);
  const boostedCategories = new Set(card.earnRules.map((r) => r.category));
  const flatCategories = MERCHANT_CATEGORIES.filter((c) => c.id !== "other" && !boostedCategories.has(c.id));

  return (
    <View className="rounded-2xl bg-surface border border-border p-5 gap-4">
      <View>
        <Text className="text-xs font-medium uppercase tracking-wide text-foreground/50">{card.bank}</Text>
        <Text className="text-lg font-semibold leading-tight text-foreground">{card.cardName}</Text>
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          <Badge label={card.tier} />
          <Badge label={card.network} tone={NETWORK_TONE[card.network]} />
          {card.isIslamic && <Badge label="Sharia-compliant" tone="accent" />}
          {!card.isActive && <Badge label="Discontinued" tone="danger" />}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[45%]">
          <Text className="text-sm text-foreground/50">Annual fee</Text>
          <Text className="text-sm font-medium text-foreground">{card.annualFeeBhd === 0 ? "Free" : fmtBhd(card.annualFeeBhd)}</Text>
        </View>
        <View className="min-w-[45%]">
          <Text className="text-sm text-foreground/50">Min. salary</Text>
          <Text className="text-sm font-medium text-foreground">{fmtBhd(card.minSalaryBhd)}</Text>
        </View>
        <View className="min-w-[45%]">
          <Text className="text-sm text-foreground/50">Base rate</Text>
          <Text className="text-sm font-medium text-foreground">{formatRate(card, card.baseRate)}</Text>
        </View>
        <View className="min-w-[45%]">
          <Text className="text-sm text-foreground/50">Earns</Text>
          <Text className="text-sm font-medium capitalize text-foreground">{card.currency}</Text>
        </View>
      </View>

      {card.welcomeBonus && (
        <View className="rounded-xl bg-accent-soft px-3 py-2">
          <Text className="text-sm text-accent">
            <Text className="font-semibold">Welcome bonus: </Text>
            {card.welcomeBonus}
          </Text>
        </View>
      )}

      <View>
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/50">Earn rate by category</Text>
        <View className="flex-row flex-wrap gap-1.5">
          {card.earnRules.map((rule) => (
            <View key={rule.category} className="flex-row items-center gap-2 rounded-lg bg-brand-soft px-2 py-1 min-w-[45%] justify-between">
              <Text className="text-sm capitalize text-brand-strong">{categoryById(rule.category).nameEn}</Text>
              <Text className="text-sm font-medium text-brand-strong">
                {formatRate(card, rule.rate)}
                {rule.capPerMonthBhd ? ` · cap ${fmtBhd(rule.capPerMonthBhd)}/mo` : ""}
              </Text>
            </View>
          ))}
          {flatCategories.map((cat) => (
            <View key={cat.id} className="flex-row items-center gap-2 px-2 py-1 min-w-[45%] justify-between">
              <Text className="text-sm capitalize text-foreground/60">{cat.nameEn}</Text>
              <Text className="text-sm text-foreground/60">{formatRate(card, card.baseRate)}</Text>
            </View>
          ))}
        </View>
      </View>

      {card.keyBenefits.length > 0 && (
        <View>
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/50">Benefits</Text>
          <View className="gap-1">
            {card.keyBenefits.map((b, i) => (
              <Text key={i} className="text-sm text-foreground/80">
                • {b}
              </Text>
            ))}
          </View>
        </View>
      )}

      {usage && (
        <View className="border-t border-border pt-3">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/50">
            How {usage.currencyName} can be used
          </Text>
          <Text className="mb-2 text-xs text-foreground/50">
            {program?.operator} · {usage.expiryPolicy}
            {usage.minRedemption ? ` · ${usage.minRedemption}` : ""}
          </Text>
          <View className="gap-1.5">
            {usage.redemptionOptions.map((opt) => (
              <View key={opt.label} className="flex-row items-start justify-between gap-3 rounded-lg border border-border px-3 py-1.5">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">{opt.label}</Text>
                  {opt.conditions && <Text className="text-xs text-foreground/50">{opt.conditions}</Text>}
                </View>
                <Text className="shrink-0 text-sm font-medium text-foreground/70">{opt.valuePerPointFils.toFixed(2)} fils/pt</Text>
              </View>
            ))}
          </View>
          {usage.transferPartners.length > 0 && (
            <View className="mt-2 gap-1">
              {usage.transferPartners.map((t, i) => (
                <Text key={i} className="text-xs text-foreground/60">
                  → <Text className="font-medium">{programById(t.toProgramId)?.name}</Text>: {t.ratioLabel}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      <Text className="text-[11px] text-foreground/40">Last verified {card.lastVerified}</Text>
    </View>
  );
}
