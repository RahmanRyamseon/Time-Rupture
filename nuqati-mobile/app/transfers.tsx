import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { TRANSFER_PARTNERS } from "@/data/transferPartners";
import { LOYALTY_PROGRAMS, programById } from "@/data/loyaltyPrograms";
import { fmtFils, fmtPoints } from "@/lib/format";
import { Chip, SectionLabel, Surface } from "@/components/ui";

const ACTIVE_PARTNERS = TRANSFER_PARTNERS.filter((t) => t.isActive);
const INACTIVE_PARTNERS = TRANSFER_PARTNERS.filter((t) => !t.isActive);
const FROM_IDS = Array.from(new Set(ACTIVE_PARTNERS.map((t) => t.fromProgramId)));

export default function TransfersScreen() {
  const active = ACTIVE_PARTNERS;
  const inactive = INACTIVE_PARTNERS;
  const fromIds = FROM_IDS;

  const [fromId, setFromId] = useState(active[0]?.fromProgramId ?? "");
  const [toId, setToId] = useState(active[0]?.toProgramId ?? "");
  const [points, setPoints] = useState("20000");

  const availableTargets = useMemo(() => active.filter((t) => t.fromProgramId === fromId), [active, fromId]);
  const link = active.find((t) => t.fromProgramId === fromId && t.toProgramId === toId) ?? availableTargets[0];

  const fromProgram = programById(fromId);
  const toProgram = link ? programById(link.toProgramId) : undefined;
  const pointsNum = Math.max(0, Number(points) || 0);
  const resultingUnits = link?.ratioFromPerTo ? pointsNum / link.ratioFromPerTo : undefined;
  const toBest = toProgram ? Math.max(...toProgram.redemptionOptions.map((o) => o.valuePerPointFils)) : undefined;
  const resultingValueFils = resultingUnits !== undefined && toBest !== undefined ? resultingUnits * toBest : undefined;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
      <View>
        <Text className="text-2xl font-bold tracking-tight text-foreground">Transfer Partner Navigator</Text>
        <Text className="mt-1 text-sm text-foreground/60">
          Every Bahrain bank points program mapped to its airline &amp; retail transfer partners — the intelligence
          layer no comparison site maintains.
        </Text>
      </View>

      <Surface className="gap-3">
        <Text className="text-sm font-semibold text-foreground">Transfer simulator</Text>

        <View>
          <SectionLabel>From</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-1.5">
              {fromIds.map((id) => (
                <Chip
                  key={id}
                  label={programById(id)?.name ?? id}
                  active={fromId === id}
                  onPress={() => {
                    setFromId(id);
                    const next = active.find((t) => t.fromProgramId === id);
                    if (next) setToId(next.toProgramId);
                  }}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        <View>
          <SectionLabel>To</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-1.5">
              {availableTargets.map((t) => (
                <Chip key={t.toProgramId} label={programById(t.toProgramId)?.name ?? t.toProgramId} active={toId === t.toProgramId} onPress={() => setToId(t.toProgramId)} />
              ))}
            </View>
          </ScrollView>
        </View>

        <View>
          <SectionLabel>Points</SectionLabel>
          <TextInput
            value={points}
            onChangeText={setPoints}
            keyboardType="number-pad"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </View>

        {link && (
          <View className="rounded-xl bg-brand-soft p-3">
            <Text className="text-sm text-foreground">
              {fmtPoints(pointsNum)} {fromProgram?.currencyName} → {link.ratioFromPerTo ? fmtPoints(resultingUnits ?? 0) : "—"}{" "}
              {toProgram?.currencyName} <Text className="text-foreground/50">({link.ratioLabel})</Text>
            </Text>
            {resultingValueFils !== undefined && (
              <Text className="mt-1 text-sm font-semibold text-brand-strong">Best redemption value: {fmtFils(resultingValueFils)}</Text>
            )}
            {link.sweetSpot && <Text className="mt-1 text-xs text-foreground/60">Sweet spot: {link.sweetSpot}</Text>}
            <Text className="mt-1 text-xs text-foreground/50">
              Min transfer {link.minTransfer ?? "—"} · takes {link.transferTimeDays ?? "—"}
            </Text>
          </View>
        )}
      </Surface>

      <Surface className="gap-2">
        <Text className="text-sm font-semibold text-foreground">Full transfer map</Text>
        {active.map((t, i) => (
          <View key={i} className="rounded-lg bg-surface-muted p-2">
            <Text className="text-sm font-medium text-foreground">
              {programById(t.fromProgramId)?.name} → {programById(t.toProgramId)?.name}
            </Text>
            <Text className="text-xs text-foreground/70">{t.ratioLabel}</Text>
            <Text className="text-xs text-foreground/50">
              Min {t.minTransfer ?? "—"} · {t.transferTimeDays ?? "—"}
            </Text>
          </View>
        ))}
        {inactive.map((t, i) => (
          <View key={`inactive-${i}`} className="rounded-lg bg-surface-muted p-2 opacity-50">
            <Text className="text-sm font-medium text-foreground">{programById(t.fromProgramId)?.name}</Text>
            <Text className="text-xs text-foreground/70">{t.ratioLabel}</Text>
          </View>
        ))}
      </Surface>

      <Surface className="gap-2">
        <Text className="text-sm font-semibold text-foreground">All Bahrain-reachable loyalty programs</Text>
        <View className="flex-row flex-wrap gap-2">
          {LOYALTY_PROGRAMS.map((p) => (
            <View key={p.id} className="rounded-xl border border-border px-3 py-2 min-w-[45%]">
              <Text className="text-sm font-medium text-foreground">{p.name}</Text>
              <Text className="text-xs text-foreground/50">{p.operator}</Text>
            </View>
          ))}
        </View>
      </Surface>
    </ScrollView>
  );
}
