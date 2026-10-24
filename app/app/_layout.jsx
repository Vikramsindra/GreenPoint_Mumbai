// filepath: app/app/_layout.jsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { useAuthStore } from "../store/authStore";
import { COLORS } from "../constants/theme";
import SideMenu from "../components/SideMenu";

export default function RootLayout() {
  const { token, user, loadStoredAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  // Restore the saved session before deciding which role flow to show.
  useEffect(() => {
    const init = async () => {
      try {
        await loadStoredAuth();
      } catch (e) {
        console.log("Unable to restore the saved session:", e.message);
      } finally {
        setIsReady(true);
      }
    };
    init();
  }, [loadStoredAuth]);

  // Handle navigation safely once ready
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      // User just logged in, route to appropriate dashboard
      if (user?.role === "collector") {
        router.replace("/(collector)/round");
      } else if (user?.role === "bmc_collector") {
        router.replace("/(bmc-collector)/dashboard");
      } else if (user?.role === "society_representative") {
        router.replace("/(society-representative)/dashboard");
      } else {
        router.replace("/(tabs)/home");
      }
    } else if (token && !inAuthGroup) {
      // Keep each operational role inside its own route group. Citizen-only
      // shared screens live at the root and are intentionally allowed.
      const currentPage = segments[0];
      if (user?.role === "collector" && currentPage !== "(collector)") {
        router.replace("/(collector)/round");
      } else if (user?.role === "bmc_collector" && currentPage !== "(bmc-collector)") {
        router.replace("/(bmc-collector)/dashboard");
      } else if (user?.role === "society_representative" && currentPage !== "(society-representative)") {
        router.replace("/(society-representative)/dashboard");
      } else if (user?.role === "citizen" && !["(tabs)", "leaderboard", "profile", "rewards-history"].includes(currentPage)) {
        router.replace("/(tabs)/home");
      }
    }
  }, [token, user?.role, isReady, segments]);

  // Show loader while initializing (max 5 seconds)
  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.white,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Main app
  return (
    <PaperProvider>
      <Slot />
      <SideMenu />
    </PaperProvider>
  );
}
