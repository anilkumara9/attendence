import { serve } from "@hono/node-server";
import app from "./hono";

const port = 3000;
console.log(`🚀 Backend server is running on http://localhost:${port}`);

serve({
    fetch: app.fetch,
    port,
});
