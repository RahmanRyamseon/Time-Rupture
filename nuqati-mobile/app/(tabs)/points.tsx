import { useMemo } from "react";
import { useRouter } from "expo-router";
import { ScrollView, Text, TextInput, View } from "react-native";
import { cardById } from "@/data/cards";
import { programById } from "@/data/loyaltyPrograms";
import { useAppState } from "@/lib/store";
import { fmtFils, fmtPoints } from "@/lib/format";
import { EmptyState, Surface } from "@/components/ui";

export default function PointsScreen() {
  const router = useRouter();
  const { cardIds, balanceFor, setBalance, hydrated } = useAppState();

  const walletCards = useMemo(() => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c), [cardIds]);
  const programIds = useMemo(() => Array.from(new Set(walletCards.map((c) => c.loyaltyProgramId))), [walletCards]);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View>
        <Text className="text-2xl font-bold tracking-tight text-foreground">Points Valuation Engine</Text>
        <Text className="mt-1 text-sm text-foreground/60">
          Enter your current balance for each loyalty program to see what it&apos;s really worth — cashback vs. transfer.
        </Text>
      </View>

      {hydrated && programIds.length === 0 ? (
        <EmptyState title="No loyalty programs yet" subtitle="Add cards to your wallet to value the points they earn." actionLabel="Go to My Wallet" onAction={() => router.push("/wallet")} />
      ) : (
        <View className="gap-4">
          {programIds.map((id) => {
            const program = programById(id);
            if (!program) return null;
            const balance = balanceFor(id);
            const options = [...program.redemptionOptions].sort((a, b) => b.valuePerPointFils - a.valuePerPointFils);
            const best = options[0];
            const cashback = options.find((o) => o.type === "cashback");
            const multiplier = cashback && cashback.valuePerPointFils > 0 ? best.valuePerPointFils / cashback.valuePerPointFils : 1;

            return (
              <Surface key={id} className="gap-3">
                <View className="flex-row flex-wrap items-center justify-between gap-3">
                  <View>
                    <Text className="text-lg font-semibold text-foreground">{program.name}</Text>
                    <Text className="text-xs text-foreground/50">
                      {program.operator} · {program.currencyName}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm text-foreground/50">Your balance</Text>
                    <TextInput
                      value={balance ? String(balance) : ""}
                      onChangeText={(v) => setBalance(id, Number(v) || 0)}
                      placeholder="0"
                      keyboardType="number-pad"
                      className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm text-foreground"
                    />
                  </View>
                </View>

                <View className="gap-2">
                  {options.map((opt) => (
                    <View
                      key={opt.label}
                      className={`flex-row items-start justify-between gap-3 rounded-xl border px-3 py-2 ${
                        opt === best ? "border-brand bg-brand-soft" : "border-border"
                      }`}
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center flex-wrap gap-2">
                          <Text className="text-sm font-medium text-foreground">{opt.label}</Text>
                          {opt === best && (
                            <View className="rounded-full bg-brand px-2 py-0.5">
                              <Text className="text-[10px] font-semibold uppercase text-white">Recommended</Text>
                            </View>
                          )}
                        </View>
                        {opt.conditions && <Text className="text-xs text-foreground/50">{opt.conditions}</Text>}
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-semibold text-foreground">{fmtFils(balance * opt.valuePerPointFils)}</Text>
                        <Text className="text-xs text-foreground/50">{opt.valuePerPointFils.toFixed(2)} fils/pt</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {multiplier > 1.01 && cashback && (
                  <Text className="text-sm text-brand-strong">
                    Recommended path: {best.label} is {multiplier.toFixed(1)}x more valuable than cashback for your{" "}
                    {fmtPoints(balance)} {program.currencyName} — that&apos;s{" "}
                    {fmtFils(balance * (best.valuePerPointFils - cashback.valuePerPointFils))} left on the table if you
                    just take cashback.
                  </Text>
                )}

                {program.redemptionCapUnitsPerMonth && balance > program.redemptionCapUnitsPerMonth && (
                  <View className="rounded-lg bg-danger-soft px-3 py-2">
                    <Text className="text-sm text-danger">
                      Your balance exceeds {program.name}
                      {program.name.endsWith("s") ? "'" : "'s"} cashback redemption cap of{" "}
                      {fmtPoints(program.redemptionCapUnitsPerMonth)} {program.currencyName}/month — redeeming the full
                      amount as cashback would take {Math.ceil(balance / program.redemptionCapUnitsPerMonth)} months. A
                      transfer redemption isn&apos;t subject to this cap.
                    </Text>
                  </View>
                )}

                <Text className="text-xs text-foreground/50">Expiry: {program.expiryPolicy}</Text>
              </Surface>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
