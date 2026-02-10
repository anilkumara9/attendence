import type { AppRouter } from "@/backend/trpc/app-router";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

// For local development with Expo Go, use your machine's IP address instead of localhost in the .env file
// Example: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/trpc
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/trpc";

console.log("[TRPC] Using Backend URL:", BACKEND_URL);

export const trpc = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: BACKEND_URL,
            transformer: superjson,
        }),
    ],
});
