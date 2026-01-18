import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AttendanceProvider } from "@/providers/AttendanceProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { TrpcProvider } from "@/providers/TrpcProvider";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isDark } = useTheme();
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="session/[sessionId]"
        options={{ title: "Session", presentation: "modal" }}
      />
      <Stack.Screen name="modal" options={{ presentation: "transparentModal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <TrpcProvider queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.ghRoot}>
          <ThemeProvider>
            <AuthProvider>
              <AttendanceProvider>
                <ThemedStatusBar />
                <RootLayoutNav />
              </AttendanceProvider>
            </AuthProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </TrpcProvider>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

const styles = StyleSheet.create({
  ghRoot: {
    flex: 1,
  },
});
