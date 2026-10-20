import type { Env } from "./types";
import { createApp } from "./app";

const app = createApp();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // L'API et les routes dynamiques passent par Hono (voir run_worker_first).
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname === "/robots.txt" ||
      url.pathname === "/sitemap.xml"
    ) {
      return app.fetch(request, env, ctx);
    }

    // Tout le reste : assets statiques + fallback SPA (géré par le routeur d'assets).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
