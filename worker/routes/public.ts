import { Hono } from "hono";
import type { AppEnv } from "../http-env";
import { validate } from "../lib/validate";
import { ApiError } from "../lib/errors";
import { paginationSchema, contactSchema, createOrderSchema } from "@shared/validation";
import { enforceRateLimit, clientIp } from "../services/rate-limit";
import { getLang } from "../lib/lang";
import { verifyTurnstile } from "../services/turnstile";
import { serveMedia } from "../services/media.service";
import { createOrder, getPublicOrder } from "../services/order.service";
import * as settingsRepo from "../repositories/settings.repo";
import * as artistsRepo from "../repositories/artists.repo";
import * as projectsRepo from "../repositories/projects.repo";
import * as servicesRepo from "../repositories/services.repo";
import * as productsRepo from "../repositories/products.repo";
import * as teamRepo from "../repositories/team.repo";
import * as messagesRepo from "../repositories/messages.repo";

export function publicRoutes(): Hono<AppEnv> {
  const r = new Hono<AppEnv>();

  /* ----------------------------- Médias (proxy R2) ----------------------------- */
  r.get("/media/:key{.+}", async (c) => {
    const key = c.req.param("key");
    return serveMedia(c.env, key);
  });

  /* ----------------------------- Paramètres du site ---------------------------- */
  r.get("/site-settings", async (c) => c.json(await settingsRepo.getPublicSettings(c.env, getLang(c))));

  /* --------------------------------- Accueil ----------------------------------- */
  r.get("/home-content", async (c) => {
    const lang = getLang(c);
    const [featuredProjects, artists, services, products] = await Promise.all([
      projectsRepo.listFeatured(c.env, 6, lang),
      artistsRepo.listPublic(c.env, lang),
      servicesRepo.listPublic(c.env, lang),
      productsRepo.listPublic(c.env, { page: 1, pageSize: 4, lang }),
    ]);
    return c.json({
      featuredProjects,
      artists: artists.slice(0, 8),
      services: services.slice(0, 6),
      products: products.items,
    });
  });

  /* ---------------------------------- Équipe ----------------------------------- */
  r.get("/team", async (c) => c.json(await teamRepo.listPublic(c.env, getLang(c))));

  /* --------------------------------- Artistes ---------------------------------- */
  r.get("/artists", async (c) => c.json(await artistsRepo.listPublic(c.env, getLang(c))));
  r.get("/artists/:slug", async (c) => {
    const artist = await artistsRepo.getPublicBySlug(c.env, c.req.param("slug"), getLang(c));
    if (!artist) throw ApiError.notFound("Artiste introuvable.");
    return c.json(artist);
  });

  /* ------------------------------- Productions --------------------------------- */
  r.get("/project-categories", async (c) => c.json(await projectsRepo.listCategories(c.env)));
  r.get("/projects", async (c) => {
    const { page, pageSize } = validate(paginationSchema, c.req.query());
    const category = c.req.query("category") || undefined;
    return c.json(await projectsRepo.listPublic(c.env, { page, pageSize, category, lang: getLang(c) }));
  });
  r.get("/projects/:slug", async (c) => {
    const project = await projectsRepo.getPublicBySlug(c.env, c.req.param("slug"), getLang(c));
    if (!project) throw ApiError.notFound("Production introuvable.");
    return c.json(project);
  });

  /* --------------------------------- Services ---------------------------------- */
  r.get("/services", async (c) => c.json(await servicesRepo.listPublic(c.env, getLang(c))));
  r.get("/services/:slug", async (c) => {
    const service = await servicesRepo.getPublicBySlug(c.env, c.req.param("slug"), getLang(c));
    if (!service) throw ApiError.notFound("Service introuvable.");
    return c.json(service);
  });

  /* ------------------------------ Merchandising -------------------------------- */
  r.get("/product-categories", async (c) => c.json(await productsRepo.listCategories(c.env)));
  r.get("/products", async (c) => {
    const { page, pageSize } = validate(paginationSchema, c.req.query());
    const category = c.req.query("category") || undefined;
    return c.json(await productsRepo.listPublic(c.env, { page, pageSize, category, lang: getLang(c) }));
  });
  r.get("/products/:slug", async (c) => {
    const product = await productsRepo.getPublicBySlug(c.env, c.req.param("slug"), getLang(c));
    if (!product) throw ApiError.notFound("Produit introuvable.");
    return c.json(product);
  });

  /* --------------------------------- Contact ----------------------------------- */
  r.post("/contact", async (c) => {
    const ip = clientIp(c.req.raw.headers);
    await enforceRateLimit(c.env, `contact:${ip}`, 5, 600);
    const input = validate(contactSchema, await c.req.json().catch(() => ({})));
    await verifyTurnstile(c.env, input.turnstileToken, ip);
    await messagesRepo.create(c.env, {
      name: input.name,
      email: input.email ?? "",
      phone: input.phone ?? "",
      subject: input.subject,
      message: input.message,
      ip,
    });
    return c.json({ ok: true, message: "Message envoyé. Merci, nous revenons vers vous rapidement." }, 201);
  });

  /* ------------------------------- Commandes ----------------------------------- */
  r.post("/orders", async (c) => {
    const ip = clientIp(c.req.raw.headers);
    await enforceRateLimit(c.env, `order:${ip}`, 12, 600);
    const input = validate(createOrderSchema, await c.req.json().catch(() => ({})));
    await verifyTurnstile(c.env, input.turnstileToken, ip);
    const result = await createOrder(c.env, c.executionCtx, input);
    return c.json(result, 201);
  });

  r.get("/orders/:reference", async (c) => {
    const token = c.req.query("token");
    if (!token) throw ApiError.notFound("Commande introuvable.");
    const order = await getPublicOrder(c.env, c.req.param("reference"), token);
    return c.json(order);
  });

  return r;
}
