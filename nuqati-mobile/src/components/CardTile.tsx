import { Pressable, Text, View } from "react-native";
import type { Card } from "@/lib/types";
import { fmtBhd, fmtFils } from "@/lib/format";
import { estimateMonthlyValueFils } from "@/lib/rewards";
import { Badge } from "@/components/ui";

const NETWORK_TONE: Record<Card["network"], "brand" | "accent" | "muted"> = {
  Visa: "brand",
  Mastercard: "accent",
  Amex: "muted",
};

export function CardTile({ card, inWallet, onToggle }: { card: Card; inWallet: boolean; onToggle: (id: string) => void }) {
  const estMonthly = estimateMonthlyValueFils(card, true);

  return (
    <View className="flex-1 min-w-[280px] rounded-2xl bg-surface border border-border p-4 gap-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 pr-2">
          <Text className="text-xs font-medium uppercase tracking-wide text-foreground/50">{card.bank}</Text>
          <Text className="text-base font-semibold leading-tight text-foreground">{card.cardName}</Text>
        </View>
        <Pressable
          onPress={() => onToggle(card.id)}
          className={`shrink-0 rounded-full px-3 py-1.5 ${inWallet ? "bg-danger-soft" : "bg-brand"}`}
        >
          <Text className={`text-xs font-semibold ${inWallet ? "text-danger" : "text-white"}`}>
            {inWallet ? "Remove" : "Add to wallet"}
          </Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-1.5">
        <Badge label={card.tier} />
        <Badge label={card.network} tone={NETWORK_TONE[card.network]} />
        {card.isIslamic && <Badge label="Sharia-compliant" tone="accent" />}
        {!card.isActive && <Badge label="Discontinued" tone="danger" />}
      </View>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <Text className="text-sm text-foreground/50">Annual fee</Text>
          <Text className="text-sm font-medium text-foreground">{card.annualFeeBhd === 0 ? "Free" : fmtBhd(card.annualFeeBhd)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm text-foreground/50">Min. salary</Text>
          <Text className="text-sm font-medium text-foreground">{fmtBhd(card.minSalaryBhd)}</Text>
        </View>
      </View>

      {card.earnRules.length > 0 && (
        <View className="gap-0.5">
          {card.earnRules.map((rule) => (
            <View key={rule.category} className="flex-row items-center justify-between">
              <Text className="text-sm capitalize text-foreground/80">{rule.category}</Text>
              <Text className="text-sm font-medium text-foreground/80">
                {card.currency === "cashback" ? `${(rule.rate * 100).toFixed(1)}%` : `${rule.rate}x`}
                {rule.capPerMonthBhd ? ` up to ${fmtBhd(rule.capPerMonthBhd)}/mo` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row items-center justify-between border-t border-border pt-2">
        <Text className="text-sm text-foreground/50">Est. value / month*</Text>
        <Text className="text-sm font-semibold text-brand-strong">{fmtFils(estMonthly)}</Text>
      </View>
    </View>
  );
}
