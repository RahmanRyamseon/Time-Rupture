import { useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, View } from "react-native";
import { BAHRAIN_CARDS, BANKS, cardById } from "@/data/cards";
import { CardTile } from "@/components/CardTile";
import { DataDisclaimer } from "@/components/DataDisclaimer";
import { useAppState } from "@/lib/store";
import { fmtFils } from "@/lib/format";
import { estimateMonthlyValueFils } from "@/lib/rewards";
import { Chip, EmptyState, StatTile } from "@/components/ui";

export default function WalletScreen() {
  const { cardIds, addCard, removeCard, hasCard, hydrated } = useAppState();
  const [query, setQuery] = useState("");
  const [bankFilter, setBankFilter] = useState<string>("all");
  const [islamicOnly, setIslamicOnly] = useState(false);
  const [showOnlyWallet, setShowOnlyWallet] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);

  const filtered = useMemo(() => {
    return BAHRAIN_CARDS.filter((c) => {
      if (!showLegacy && !c.isActive && !cardIds.includes(c.id)) return false;
      if (showOnlyWallet && !cardIds.includes(c.id)) return false;
      if (bankFilter !== "all" && c.bank !== bankFilter) return false;
      if (islamicOnly && !c.isIslamic) return false;
      if (query && !`${c.bank} ${c.cardName}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [cardIds, bankFilter, islamicOnly, query, showOnlyWallet, showLegacy]);

  const walletCards = useMemo(() => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c), [cardIds]);
  const totalMonthlyValue = walletCards.reduce((sum, c) => sum + estimateMonthlyValueFils(c, true), 0);
  const totalFees = walletCards.reduce((sum, c) => sum + c.annualFeeBhd, 0);

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4"
      data={filtered}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        <View className="gap-4 mb-4">
          <View>
            <Text className="text-2xl font-bold tracking-tight text-foreground">My Wallet</Text>
            <Text className="mt-1 text-sm text-foreground/60">
              Add the cards you actually carry from Bahrain&apos;s major banks — no login, no bank data shared.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-3">
            <StatTile label="Cards in wallet" value={String(walletCards.length)} />
            <StatTile label="Est. cashback value / month*" value={fmtFils(totalMonthlyValue)} />
            <StatTile label="Combined annual fees" value={`BD ${totalFees.toFixed(2)}`} />
          </View>

          <View className="gap-3">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search bank or card name…"
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-1.5">
                <Chip label={`All banks (${BANKS.length})`} active={bankFilter === "all"} onPress={() => setBankFilter("all")} />
                {BANKS.map((b) => (
                  <Chip key={b} label={b} active={bankFilter === b} onPress={() => setBankFilter(b)} />
                ))}
              </View>
            </ScrollView>
            <View className="flex-row flex-wrap gap-1.5">
              <Chip label="Sharia-compliant only" active={islamicOnly} onPress={() => setIslamicOnly((v) => !v)} />
              <Chip label="My wallet only" active={showOnlyWallet} onPress={() => setShowOnlyWallet((v) => !v)} />
              <Chip label="Show discontinued/legacy" active={showLegacy} onPress={() => setShowLegacy((v) => !v)} />
            </View>
          </View>

          {hydrated && filtered.length === 0 && <EmptyState title="No matches" subtitle="No cards match those filters." />}
        </View>
      }
      renderItem={({ item }) => (
        <View className="mb-4">
          <CardTile card={item} inWallet={hasCard(item.id)} onToggle={(id) => (hasCard(id) ? removeCard(id) : addCard(id))} />
        </View>
      )}
      ListFooterComponent={
        <View className="gap-2 mt-2">
          <DataDisclaimer />
          <Text className="text-xs text-foreground/40">
            *Estimated value assumes an illustrative BHD 500/month household spend profile and conservative
            cashback-equivalent redemption. Your real earnings depend on your actual spending — see Smart Swipe.
          </Text>
        </View>
      }
    />
  );
}
