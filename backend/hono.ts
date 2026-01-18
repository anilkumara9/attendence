import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@/backend/trpc/server";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (c) => c.json({ ok: true, service: "myclass-backend" }));

app.route("/trpc", trpcServer);

export default app;
