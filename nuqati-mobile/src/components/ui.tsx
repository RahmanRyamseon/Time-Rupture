import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";

export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-2xl bg-surface border border-border p-4 ${className}`}>{children}</View>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/50">{children}</Text>;
}

export function Chip({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-full border px-3 py-1.5 ${
        active ? "border-brand bg-brand-soft" : disabled ? "border-border bg-surface-muted" : "border-border bg-surface"
      }`}
    >
      <Text className={`text-xs font-medium ${active ? "text-brand-strong" : disabled ? "text-foreground/30" : "text-foreground/70"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({ label, tone = "muted" }: { label: string; tone?: "muted" | "brand" | "accent" | "danger" }) {
  const styles = {
    muted: "bg-surface-muted text-foreground/70",
    brand: "bg-brand-soft text-brand-strong",
    accent: "bg-accent-soft text-accent",
    danger: "bg-danger-soft text-danger",
  } as const;
  return (
    <View className={`rounded-full px-2 py-0.5 ${styles[tone].split(" ")[0]}`}>
      <Text className={`text-[11px] font-medium ${styles[tone].split(" ")[1]}`}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-full px-4 py-2.5 items-center ${disabled ? "bg-surface-muted" : "bg-brand"}`}
    >
      <Text className={`text-sm font-semibold ${disabled ? "text-foreground/40" : "text-white"}`}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="rounded-full border border-border px-4 py-2.5 items-center bg-surface">
      <Text className="text-sm font-semibold text-foreground">{label}</Text>
    </Pressable>
  );
}

export function StatTile({ label, value, tone = "brand" }: { label: string; value: string; tone?: "brand" | "danger" }) {
  return (
    <Surface className="flex-1 min-w-[45%]">
      <Text className="text-[11px] font-medium uppercase tracking-wide text-foreground/50">{label}</Text>
      <Text className={`mt-1 text-xl font-bold ${tone === "danger" ? "text-danger" : "text-brand-strong"}`}>{value}</Text>
    </Surface>
  );
}

export function EmptyState({ title, subtitle, actionLabel, onAction }: { title: string; subtitle: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View className="rounded-2xl border border-dashed border-border p-8 items-center">
      <Text className="text-base font-semibold text-foreground text-center">{title}</Text>
      <Text className="mt-1 text-sm text-foreground/60 text-center">{subtitle}</Text>
      {actionLabel && onAction && (
        <View className="mt-4">
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}
