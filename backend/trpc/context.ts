import connectToDatabase from "@/backend/lib/mongodb";
import type { Context as HonoContext } from "hono";

export type TrpcContext = {
  hono: HonoContext;
};

export async function createTrpcContext(opts: { hono: HonoContext }): Promise<TrpcContext> {
  await connectToDatabase();
  return { hono: opts.hono };
}
