import { useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, View } from "react-native";
import { BAHRAIN_CARDS } from "@/data/cards";
import { COUNTRIES } from "@/data/countries";
import { BENEFIT_TAGS, matchesAllBenefitTags } from "@/data/benefitTags";
import { LOYALTY_PROGRAMS } from "@/data/loyaltyPrograms";
import { resolvedRedemptionReach } from "@/lib/benefits";
import { BenefitDetailCard } from "@/components/BenefitDetailCard";
import { DataDisclaimer } from "@/components/DataDisclaimer";
import { Chip, EmptyState, SectionLabel } from "@/components/ui";
import type { RedemptionType, Card } from "@/lib/types";

const REDEMPTION_USE_CHIPS: { type: RedemptionType; label: string }[] = [
  { type: "cashback", label: "💵 Cashback" },
  { type: "flight", label: "✈️ Flights" },
  { type: "hotel", label: "🏨 Hotels" },
  { type: "merchandise", label: "🎁 Merchandise / vouchers" },
];

const DESTINATION_PROGRAMS = LOYALTY_PROGRAMS.filter((p) => !p.redemptionOptions.some((o) => o.type === "cashback"));

export default function ExploreScreen() {
  const [countryId, setCountryId] = useState("bahrain");
  const [bankFilter, setBankFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [islamicOnly, setIslamicOnly] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [query, setQuery] = useState("");
  const [benefitTagIds, setBenefitTagIds] = useState<string[]>([]);
  const [redemptionUses, setRedemptionUses] = useState<RedemptionType[]>([]);
  const [redeemableVia, setRedeemableVia] = useState("all");

  const cardsInCountry = useMemo(() => (countryId === "bahrain" ? BAHRAIN_CARDS : []), [countryId]);
  const banksAvailable = useMemo(() => Array.from(new Set(cardsInCountry.map((c) => c.bank))).sort(), [cardsInCountry]);
  const bankScoped = useMemo(() => cardsInCountry.filter((c) => bankFilter === "all" || c.bank === bankFilter), [cardsInCountry, bankFilter]);
  const tiersAvailable = useMemo(() => Array.from(new Set(bankScoped.map((c) => c.tier))).sort(), [bankScoped]);

  const filtered = useMemo(() => {
    return bankScoped.filter((c) => {
      if (!showLegacy && !c.isActive) return false;
      if (tierFilter !== "all" && c.tier !== tierFilter) return false;
      if (islamicOnly && !c.isIslamic) return false;
      if (query && !`${c.bank} ${c.cardName}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (!matchesAllBenefitTags(c, benefitTagIds)) return false;
      if (redemptionUses.length > 0 || redeemableVia !== "all") {
        const reach = resolvedRedemptionReach(c);
        if (redemptionUses.length > 0 && !redemptionUses.every((t) => reach.types.has(t))) return false;
        if (redeemableVia !== "all" && !reach.programIds.has(redeemableVia)) return false;
      }
      return true;
    });
  }, [bankScoped, tierFilter, islamicOnly, query, showLegacy, benefitTagIds, redemptionUses, redeemableVia]);

  function toggleBenefitTag(id: string) {
    setBenefitTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }
  function toggleRedemptionUse(type: RedemptionType) {
    setRedemptionUses((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  const listData: Card[] = countryId !== "bahrain" ? [] : filtered;

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4"
      data={listData}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        <View className="gap-4 mb-4">
          <View>
            <Text className="text-2xl font-bold tracking-tight text-foreground">Explore Benefits</Text>
            <Text className="mt-1 text-sm text-foreground/60">
              What does this bank actually offer? Filter by country, bank, card type, specific benefits, or exactly
              what the points can be redeemed for — no wallet needed.
            </Text>
          </View>

          <View>
            <SectionLabel>Country</SectionLabel>
            <View className="flex-row flex-wrap gap-1.5">
              {COUNTRIES.map((c) => (
                <Chip
                  key={c.id}
                  label={`${c.flag} ${c.name}${!c.available ? " · soon" : ""}`}
                  active={countryId === c.id}
                  disabled={!c.available}
                  onPress={() => {
                    setCountryId(c.id);
                    setBankFilter("all");
                    setTierFilter("all");
                  }}
                />
              ))}
            </View>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search bank or card name…"
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
          />

          <View>
            <SectionLabel>Bank</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-1.5">
                <Chip label={`All banks (${banksAvailable.length})`} active={bankFilter === "all"} onPress={() => { setBankFilter("all"); setTierFilter("all"); }} />
                {banksAvailable.map((b) => (
                  <Chip key={b} label={b} active={bankFilter === b} onPress={() => { setBankFilter(b); setTierFilter("all"); }} />
                ))}
              </View>
            </ScrollView>
          </View>

          {tiersAvailable.length > 0 && (
            <View>
              <SectionLabel>Card type</SectionLabel>
              <View className="flex-row flex-wrap gap-1.5">
                <Chip label="All types" active={tierFilter === "all"} onPress={() => setTierFilter("all")} />
                {tiersAvailable.map((t) => (
                  <Chip key={t} label={t} active={tierFilter === t} onPress={() => setTierFilter(t)} />
                ))}
              </View>
            </View>
          )}

          <View className="flex-row flex-wrap gap-1.5">
            <Chip label="Sharia-compliant only" active={islamicOnly} onPress={() => setIslamicOnly((v) => !v)} />
            <Chip label="Show discontinued/legacy" active={showLegacy} onPress={() => setShowLegacy((v) => !v)} />
          </View>

          <View>
            <SectionLabel>Benefits include</SectionLabel>
            <View className="flex-row flex-wrap gap-1.5">
              {BENEFIT_TAGS.map((tag) => (
                <Chip key={tag.id} label={tag.label} active={benefitTagIds.includes(tag.id)} onPress={() => toggleBenefitTag(tag.id)} />
              ))}
            </View>
          </View>

          <View>
            <SectionLabel>Points can be used for</SectionLabel>
            <View className="flex-row flex-wrap gap-1.5">
              {REDEMPTION_USE_CHIPS.map((chip) => (
                <Chip key={chip.type} label={chip.label} active={redemptionUses.includes(chip.type)} onPress={() => toggleRedemptionUse(chip.type)} />
              ))}
            </View>
          </View>

          <View>
            <SectionLabel>Redeemable via</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-1.5">
                <Chip label="Any partner" active={redeemableVia === "all"} onPress={() => setRedeemableVia("all")} />
                {DESTINATION_PROGRAMS.map((p) => (
                  <Chip key={p.id} label={p.name} active={redeemableVia === p.id} onPress={() => setRedeemableVia(p.id)} />
                ))}
              </View>
            </ScrollView>
          </View>

          {countryId !== "bahrain" && (
            <EmptyState
              title={`${COUNTRIES.find((c) => c.id === countryId)?.name} is coming soon`}
              subtitle="Nuqati launched with Bahrain — the full GCC rollout follows the app's own roadmap."
            />
          )}
          {countryId === "bahrain" && filtered.length === 0 && (
            <EmptyState title="No matches" subtitle="No cards match those filters." />
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View className="mb-4">
          <BenefitDetailCard card={item} />
        </View>
      )}
      ListFooterComponent={<DataDisclaimer />}
    />
  );
}
