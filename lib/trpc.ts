import type { AppRouter } from "@/backend/trpc/app-router";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

// For local development with Expo Go, use your machine's IP address instead of localhost
const BACKEND_URL = "http://localhost:3000/trpc";

export const trpc = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: BACKEND_URL,
            transformer: superjson,
        }),
    ],
});
