import { initTRPC } from "@trpc/server";
import superjson from "superjson";

import type { TrpcContext } from "@/backend/trpc/context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
