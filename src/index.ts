import { serve } from "bun";
import { api } from "@/backend";
import index from "@/frontend/index.html";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/app": index,
    "/app/*": index,
  },

  fetch: api.fetch,

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
