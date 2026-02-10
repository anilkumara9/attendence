import type { QueryClient } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import Constants from "expo-constants";
import React, { useMemo } from "react";
import { Platform } from "react-native";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl(): string {
  if (Platform.OS === "web") {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/api`;
  }

  // Use the environment variable for production/release APK
  if (process.env.EXPO_PUBLIC_API_URL) {
    // Strip /trpc if it exists, as the Provider appends it
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/trpc$/, "");
  }

  const hostUri = Constants.expoConfig?.hostUri ?? "";
  const host = hostUri.split(":")[0];

  if (!host) {
    console.log("[tRPC] Could not determine hostUri, falling back to localhost");
    return "http://localhost:3000";
  }

  return `http://${host}:3000`;
}

export function TrpcProvider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  const client = useMemo(() => {
    const url = getBaseUrl();
    console.log("[tRPC] creating client", { url, platform: Platform.OS });

    return trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            __DEV__ ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${url}/trpc`,
          transformer: superjson,
        }),
      ],
    });
  }, []);

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      {children}
    </trpc.Provider>
  );
}
