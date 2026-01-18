import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";

import { appRouter } from "@/backend/trpc/app-router";
import { createTrpcContext } from "@/backend/trpc/context";

export const trpcServer = new Hono().all("/*", async (c) => {
  const url = new URL(c.req.url);
  console.log("[backend] tRPC request", {
    method: c.req.method,
    path: url.pathname,
    query: url.search,
  });

  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => createTrpcContext({ hono: c }),
    onError({ error, path }) {
      console.log("[backend] tRPC error", { path, error });
    },
  });
});
