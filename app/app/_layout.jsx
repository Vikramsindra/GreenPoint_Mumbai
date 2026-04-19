import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { useAuthStore } from "../store/authStore";
import { COLORS } from "../constants/theme";
import SideMenu from "../components/SideMenu";

export default function RootLayout() {
  const { token, isLoading, loadStoredAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  // Load stored auth with a timeout so the app never gets stuck
  useEffect(() => {
    const init = async () => {
      try {
        await Promise.race([
          loadStoredAuth(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 5000)
          ),
        ]);
      } catch (e) {
        // If API is down or times out, continue anyway — token may still be in persisted store
        console.log("Auth init timeout or error, continuing...", e.message);
      }
      setIsReady(true);
    };
    init();
  }, []);

  // Handle navigation safely once ready
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      router.replace("/(tabs)/home");
    }
  }, [token, isReady, segments]);

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
