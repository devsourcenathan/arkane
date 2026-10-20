import { Hono } from "hono";
import type { AppEnv } from "./http-env";
import { onError } from "./middleware/error";
import { publicRoutes } from "./routes/public";
import { adminRoutes } from "./routes/admin";
import { getSql, query } from "./db/client";

/**
 * Construit l'application Hono (API + routes dynamiques).
 * Montée dans worker/index.ts, derrière run_worker_first (/api/*, /robots.txt, /sitemap.xml).
 */
export function createApp() {
  const app = new Hono<AppEnv>();
  app.onError(onError);

  app.get("/api/v1/health", (c) =>
    c.json({ ok: true, service: "arkane-production", ts: new Date().toISOString() }),
  );

  // L'admin est monté avant le public pour que /api/v1/admin/* soit prioritaire.
  app.route("/api/v1/admin", adminRoutes());
  app.route("/api/v1", publicRoutes());

  app.get("/robots.txt", (c) => {
    const base = (c.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
    const body = ["User-agent: *", "Allow: /", "Disallow: /admin", `Sitemap: ${base}/sitemap.xml`, ""].join("\n");
    return c.text(body, 200, { "content-type": "text/plain; charset=utf-8" });
  });

  app.get("/sitemap.xml", async (c) => {
    const base = (c.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
    const staticPaths = ["/", "/studio", "/productions", "/artistes", "/services", "/merch", "/contact"];

    let dynamic: string[] = [];
    try {
      const sql = getSql(c.env);
      const [projects, artists, products] = await Promise.all([
        query<{ slug: string }>(sql, "SELECT slug FROM projects WHERE status = 'published'"),
        query<{ slug: string }>(sql, "SELECT slug FROM artists WHERE status = 'published'"),
        query<{ slug: string }>(sql, "SELECT slug FROM products WHERE status = 'published'"),
      ]);
      dynamic = [
        ...projects.map((p) => `/productions/${p.slug}`),
        ...artists.map((a) => `/artistes/${a.slug}`),
        ...products.map((p) => `/merch/${p.slug}`),
      ];
    } catch {
      // Base indisponible : on sert au moins les pages statiques.
    }

    const urls = [...staticPaths, ...dynamic];
    const body =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join("\n") +
      `\n</urlset>\n`;
    return c.text(body, 200, { "content-type": "application/xml; charset=utf-8" });
  });

  return app;
}
