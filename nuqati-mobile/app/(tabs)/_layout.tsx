import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0f5c4c" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "600" },
        tabBarActiveTintColor: "#0f5c4c",
        tabBarInactiveTintColor: "#8a8f8c",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Nuqati", tabBarLabel: "Home", tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: "Explore Benefits", tabBarLabel: "Explore", tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} /> }}
      />
      <Tabs.Screen
        name="wallet"
        options={{ title: "My Wallet", tabBarLabel: "Wallet", tabBarIcon: ({ focused }) => <TabIcon emoji="👛" focused={focused} /> }}
      />
      <Tabs.Screen
        name="swipe"
        options={{ title: "Smart Swipe", tabBarLabel: "Swipe", tabBarIcon: ({ focused }) => <TabIcon emoji="⚡" focused={focused} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarLabel: "More", tabBarIcon: ({ focused }) => <TabIcon emoji="⋯" focused={focused} /> }}
      />
      <Tabs.Screen name="points" options={{ href: null, title: "Points Valuation Engine" }} />
    </Tabs>
  );
}
