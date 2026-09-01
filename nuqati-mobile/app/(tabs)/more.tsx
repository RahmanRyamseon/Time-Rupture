import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { Surface } from "@/components/ui";

const ITEMS: { href: Href; title: string; blurb: string; icon: string }[] = [
  { href: "/points", title: "Points Value", blurb: "What your points are really worth — cashback vs. transfer.", icon: "💎" },
  { href: "/transfers", title: "Transfers", blurb: "Bank points → airline/hotel transfer map, with a simulator.", icon: "🔁" },
  { href: "/statement", title: "Statement Import", blurb: "Import a CSV — see real-vs-optimal earnings, transaction by transaction.", icon: "📄" },
  { href: "/cheatsheet", title: "Cheat Sheet", blurb: "This cycle's best card per category, plus cap alerts.", icon: "🗒️" },
  { href: "/fee-roi", title: "Fee-ROI Report", blurb: "Keep, downgrade, or cancel — based on real earnings vs. fees.", icon: "⚖️" },
];

export default function MoreScreen() {
  const router = useRouter();
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-3">
      <Text className="text-2xl font-bold tracking-tight text-foreground mb-1">More</Text>
      {ITEMS.map((item) => (
        <Pressable key={item.href.toString()} onPress={() => router.push(item.href)}>
          <Surface className="flex-row items-center gap-3">
            <Text className="text-2xl">{item.icon}</Text>
            <View className="flex-1">
              <Text className="font-semibold text-foreground">{item.title}</Text>
              <Text className="text-sm text-foreground/60">{item.blurb}</Text>
            </View>
            <Text className="text-foreground/30 text-lg">›</Text>
          </Surface>
        </Pressable>
      ))}
    </ScrollView>
  );
}
