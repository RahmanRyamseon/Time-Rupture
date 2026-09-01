import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppStateProvider } from "@/lib/store";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#0f5c4c" },
            headerTintColor: "#ffffff",
            headerTitleStyle: { fontWeight: "600" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="transfers" options={{ title: "Transfer Partner Navigator" }} />
          <Stack.Screen name="statement" options={{ title: "Statement Import" }} />
          <Stack.Screen name="cheatsheet" options={{ title: "Monthly Cheat Sheet" }} />
          <Stack.Screen name="fee-roi" options={{ title: "Fee-ROI Report" }} />
        </Stack>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
