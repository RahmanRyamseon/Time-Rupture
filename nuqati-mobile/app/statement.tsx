import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { ScrollView, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { cardById } from "@/data/cards";
import { MERCHANT_CATEGORIES } from "@/data/merchantCategories";
import { useAppState } from "@/lib/store";
import { parseStatement, optimizeStatement, type ParsedTransaction } from "@/lib/statement";
import { cardDisplayName, fmtBhd, fmtFils, fmtDate } from "@/lib/format";
import type { MerchantCategoryId } from "@/lib/types";
import { Chip, EmptyState, PrimaryButton, SectionLabel, StatTile, Surface } from "@/components/ui";

const SAMPLE_CSV = `date,description,amount,currency
2026-08-02,Lulu Hypermarket,32.500,BHD
2026-08-05,Talabat Order,8.200,BHD
2026-08-09,Amazon.sa,15.000,USD
2026-08-14,Bapco Fuel Station,20.000,BHD`;

export default function StatementScreen() {
  const router = useRouter();
  const { cardIds, statementSummaries, addStatementSummary } = useAppState();

  const [csvText, setCsvText] = useState("");
  const [transactions, setTransactions] = useState<ParsedTransaction[] | null>(null);
  const [skippedRows, setSkippedRows] = useState(0);
  const [assignedCardId, setAssignedCardId] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const walletCards = useMemo(() => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c), [cardIds]);
  const assignedCard = assignedCardId ? cardById(assignedCardId) : undefined;

  const result = useMemo(() => {
    if (!transactions || transactions.length === 0 || walletCards.length === 0) return null;
    return optimizeStatement(walletCards, transactions, assignedCard);
  }, [transactions, walletCards, assignedCard]);

  function handleParse(text: string) {
    const parsed = parseStatement(text);
    setTransactions(parsed.transactions);
    setSkippedRows(parsed.skippedRows);
    setSaved(false);
  }

  async function handlePickFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/comma-separated-values", "*/*"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
    setCsvText(text);
    handleParse(text);
  }

  function updateTransaction(id: string, patch: Partial<ParsedTransaction>) {
    setTransactions((prev) => prev?.map((t) => (t.id === id ? { ...t, ...patch } : t)) ?? null);
    setSaved(false);
  }

  function handleSave() {
    if (!result || !assignedCard || !result.periodStart || !result.periodEnd) return;
    addStatementSummary({
      cardId: assignedCard.id,
      periodStart: result.periodStart.toISOString(),
      periodEnd: result.periodEnd.toISOString(),
      totalSpendBhd: result.totalSpendBhd,
      totalEarnedValueFils: result.totalActualNetFils,
      txnCount: result.perTransaction.length,
    });
    setSaved(true);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <Text className="text-sm text-foreground/60">
        Import real transactions (not just an average spend profile) to see, purchase by purchase, what your assigned
        card actually earned versus what your best wallet card would have earned — caps and all, tracked
        chronologically the way a real billing cycle works.
      </Text>

      {walletCards.length === 0 ? (
        <EmptyState
          title="Your wallet is empty"
          subtitle="Add a few cards first so Nuqati has a wallet to optimize your statement against."
          actionLabel="Go to My Wallet"
          onAction={() => router.push("/wallet")}
        />
      ) : (
        <>
          <Surface className="gap-3">
            <PrimaryButton label="Pick a CSV file" onPress={handlePickFile} />

            <View>
              <SectionLabel>This statement is for</SectionLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-1.5">
                  {walletCards.map((c) => (
                    <Chip key={c.id} label={cardDisplayName(c)} active={assignedCardId === c.id} onPress={() => setAssignedCardId(c.id)} />
                  ))}
                </View>
              </ScrollView>
            </View>

            <View>
              <SectionLabel>Or paste CSV text</SectionLabel>
              <TextInput
                value={csvText}
                onChangeText={(t) => {
                  setCsvText(t);
                  handleParse(t);
                }}
                placeholder={SAMPLE_CSV}
                multiline
                numberOfLines={5}
                className="rounded-lg border border-border bg-background p-2 text-xs text-foreground"
                style={{ fontFamily: "monospace" }}
              />
              <Text className="mt-1 text-xs text-foreground/50">
                Columns: date, description, amount, optional currency (anything other than BHD is treated as
                foreign-currency). Category is auto-detected and can be corrected below.
              </Text>
            </View>

            {transactions && (
              <Text className="text-xs text-foreground/50">
                Parsed {transactions.length} transactions{skippedRows > 0 ? `, skipped ${skippedRows} unreadable/credit rows` : ""}.
              </Text>
            )}
          </Surface>

          {!assignedCard && transactions && transactions.length > 0 && (
            <View className="rounded-xl bg-accent-soft px-3 py-2">
              <Text className="text-sm text-accent">Pick which wallet card this statement belongs to above to see real-vs-optimal earnings.</Text>
            </View>
          )}

          {result && (
            <>
              <View className="flex-row flex-wrap gap-3">
                <StatTile label="Total spend" value={fmtBhd(result.totalSpendBhd)} />
                <StatTile
                  label={assignedCard ? `${assignedCard.bankShort} earned (net)` : "Optimal earned (net)"}
                  value={fmtFils(assignedCard ? result.totalActualNetFils : result.totalOptimalNetFils)}
                />
                {assignedCard && <StatTile label="Best-wallet earned (net)" value={fmtFils(result.totalOptimalNetFils)} />}
                {assignedCard && (
                  <StatTile label="Left on the table" value={fmtFils(result.totalLeftOnTableFils)} tone={result.totalLeftOnTableFils > 0 ? "danger" : "brand"} />
                )}
              </View>

              {assignedCard && <PrimaryButton label={saved ? "Saved to Fee-ROI tracker ✓" : "Save to Fee-ROI tracker"} onPress={handleSave} />}

              <View className="gap-2">
                {result.perTransaction.map((r) => (
                  <Surface key={r.transaction.id} className="gap-1.5">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="text-xs text-foreground/50">{fmtDate(r.transaction.date)}</Text>
                        <Text className="text-sm font-medium text-foreground">{r.transaction.description}</Text>
                      </View>
                      <Text className="text-sm font-medium text-foreground">{fmtBhd(r.transaction.amountBhd)}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row gap-1">
                        {MERCHANT_CATEGORIES.map((c) => (
                          <Chip
                            key={c.id}
                            label={`${c.icon} ${c.nameEn}`}
                            active={r.transaction.category === c.id}
                            onPress={() => updateTransaction(r.transaction.id, { category: c.id as MerchantCategoryId })}
                          />
                        ))}
                      </View>
                    </ScrollView>
                    <View className="flex-row items-center justify-between border-t border-border pt-1.5">
                      {assignedCard && r.actualResult && (
                        <Text className={`text-xs ${r.deltaFils > 1 ? "text-danger" : "text-foreground/60"}`}>
                          {assignedCard.bankShort} earned: {fmtFils(r.actualResult.netValueFils)}
                        </Text>
                      )}
                      <Text className="text-xs text-foreground/60">
                        Best: {cardDisplayName(r.card)} — <Text className="font-semibold text-brand-strong">{fmtFils(r.netValueFils)}</Text>
                      </Text>
                    </View>
                  </Surface>
                ))}
              </View>
              <Text className="text-xs text-foreground/40">
                Earned values are net of an estimated foreign-transaction fee (the card&apos;s own rate where
                published, otherwise ~2.5%) on any row flagged foreign-currency — a negative figure means the FX fee
                outweighed the rewards on that purchase.
              </Text>
            </>
          )}

          {statementSummaries.length > 0 && (
            <Text className="text-xs text-foreground/50">
              {statementSummaries.length} statement{statementSummaries.length === 1 ? "" : "s"} saved. See the{" "}
              <Text className="font-medium text-brand-strong" onPress={() => router.push("/fee-roi")} suppressHighlighting>
                Fee-ROI report
              </Text>
              .
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}
