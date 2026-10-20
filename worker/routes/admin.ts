import { Hono, type Context } from "hono";
import type { AppEnv } from "../http-env";
import { requireAuth } from "../middleware/auth";
import { csrfProtect } from "../middleware/csrf";
import { validate } from "../lib/validate";
import { ApiError } from "../lib/errors";
import { isUniqueViolation } from "../lib/pg";
import { clientIp, enforceRateLimit } from "../services/rate-limit";
import { login, logout } from "../services/auth.service";
import { updateOrderStatus } from "../services/order.service";
import { uploadMedia, deleteMedia } from "../services/media.service";
import { setSessionCookie, clearSessionCookie } from "../lib/cookies";
import {
  loginSchema,
  paginationSchema,
  statusSchema,
  artistInputSchema,
  projectInputSchema,
  serviceInputSchema,
  productInputSchema,
  updateOrderStatusSchema,
  updateMessageSchema,
  mediaUpdateSchema,
  siteSettingsSchema,
  teamMemberInputSchema,
} from "@shared/validation";
import * as settingsRepo from "../repositories/settings.repo";
import * as artistsRepo from "../repositories/artists.repo";
import * as teamRepo from "../repositories/team.repo";
import * as projectsRepo from "../repositories/projects.repo";
import * as servicesRepo from "../repositories/services.repo";
import * as productsRepo from "../repositories/products.repo";
import * as ordersRepo from "../repositories/orders.repo";
import * as messagesRepo from "../repositories/messages.repo";
import * as mediaRepo from "../repositories/media.repo";
import { getDashboard } from "../repositories/dashboard.repo";

function listQuery(c: Context<AppEnv>) {
  const q = c.req.query();
  const { page, pageSize } = paginationSchema.parse(q);
  return {
    page,
    pageSize,
    status: q.status || undefined,
    search: q.search || undefined,
  };
}

async function mapUnique<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isUniqueViolation(err)) throw ApiError.conflict("Un enregistrement avec cette valeur unique (SKU/slug) existe déjà.");
    throw err;
  }
}

export function adminRoutes(): Hono<AppEnv> {
  const r = new Hono<AppEnv>();

  /* --------------------------------- Login ------------------------------------ */
  r.post("/auth/login", async (c) => {
    const ip = clientIp(c.req.raw.headers);
    await enforceRateLimit(c.env, `login:${ip}`, 15, 900);
    const input = validate(loginSchema, await c.req.json().catch(() => ({})));
    const result = await login(c.env, input, ip, c.req.header("user-agent") ?? "");
    setSessionCookie(c, result.sessionToken);
    return c.json({ user: result.user, csrfToken: result.csrfToken });
  });

  /* ------------ À partir d'ici : authentification + CSRF obligatoires ---------- */
  r.use("*", requireAuth);
  r.use("*", csrfProtect);

  r.post("/auth/logout", async (c) => {
    await logout(c.env, c.get("auth").sessionId);
    clearSessionCookie(c);
    return c.json({ ok: true });
  });

  r.get("/auth/me", async (c) => {
    const auth = c.get("auth");
    return c.json({ user: { id: auth.adminUserId, email: auth.email }, csrfToken: auth.csrfSecret });
  });

  r.get("/dashboard", async (c) => c.json(await getDashboard(c.env)));

  /* -------------------------------- Artistes ----------------------------------- */
  r.get("/artists", async (c) => c.json(await artistsRepo.adminList(c.env, listQuery(c))));
  r.get("/artists/:id", async (c) => {
    const item = await artistsRepo.adminGet(c.env, c.req.param("id"));
    if (!item) throw ApiError.notFound();
    return c.json(item);
  });
  r.post("/artists", async (c) => {
    const input = validate(artistInputSchema, await c.req.json());
    const id = await artistsRepo.create(c.env, input);
    return c.json({ id }, 201);
  });
  r.put("/artists/:id", async (c) => {
    const input = validate(artistInputSchema, await c.req.json());
    const ok = await artistsRepo.update(c.env, c.req.param("id"), input);
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.patch("/artists/:id/status", async (c) => {
    const body = (await c.req.json()) as { status?: unknown };
    const parsed = statusSchema.parse(body.status);
    const ok = await artistsRepo.setStatus(c.env, c.req.param("id"), parsed);
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.delete("/artists/:id", async (c) => {
    const ok = await artistsRepo.remove(c.env, c.req.param("id"));
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });

  /* --------------------------------- Équipe ------------------------------------ */
  r.get("/team", async (c) => c.json(await teamRepo.adminList(c.env, listQuery(c))));
  r.get("/team/:id", async (c) => {
    const item = await teamRepo.adminGet(c.env, c.req.param("id"));
    if (!item) throw ApiError.notFound();
    return c.json(item);
  });
  r.post("/team", async (c) => {
    const input = validate(teamMemberInputSchema, await c.req.json());
    const id = await teamRepo.create(c.env, input);
    return c.json({ id }, 201);
  });
  r.put("/team/:id", async (c) => {
    const input = validate(teamMemberInputSchema, await c.req.json());
    const ok = await teamRepo.update(c.env, c.req.param("id"), input);
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.delete("/team/:id", async (c) => {
    const ok = await teamRepo.remove(c.env, c.req.param("id"));
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });

  /* ------------------------------- Productions --------------------------------- */
  r.get("/projects", async (c) => c.json(await projectsRepo.adminList(c.env, listQuery(c))));
  r.get("/projects/:id", async (c) => {
    const item = await projectsRepo.adminGet(c.env, c.req.param("id"));
    if (!item) throw ApiError.notFound();
    return c.json(item);
  });
  r.post("/projects", async (c) => {
    const input = validate(projectInputSchema, await c.req.json());
    const id = await projectsRepo.create(c.env, input);
    return c.json({ id }, 201);
  });
  r.put("/projects/:id", async (c) => {
    const input = validate(projectInputSchema, await c.req.json());
    const ok = await projectsRepo.update(c.env, c.req.param("id"), input);
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.patch("/projects/:id/status", async (c) => {
    const body = (await c.req.json()) as { status?: unknown };
    const parsed = statusSchema.parse(body.status);
    const ok = await projectsRepo.setStatus(c.env, c.req.param("id"), parsed);
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.delete("/projects/:id", async (c) => {
    const ok = await projectsRepo.remove(c.env, c.req.param("id"));
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });

  /* --------------------------------- Services ---------------------------------- */
  r.get("/services", async (c) => c.json(await servicesRepo.adminList(c.env, listQuery(c))));
  r.get("/services/:id", async (c) => {
    const item = await servicesRepo.adminGet(c.env, c.req.param("id"));
    if (!item) throw ApiError.notFound();
    return c.json(item);
  });
  r.post("/services", async (c) => {
    const input = validate(serviceInputSchema, await c.req.json());
    const id = await servicesRepo.create(c.env, input);
    return c.json({ id }, 201);
  });
  r.put("/services/:id", async (c) => {
    const input = validate(serviceInputSchema, await c.req.json());
    const ok = await servicesRepo.update(c.env, c.req.param("id"), input);
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.patch("/services/:id/status", async (c) => {
    const body = (await c.req.json()) as { status?: unknown };
    const parsed = statusSchema.parse(body.status);
    const ok = await servicesRepo.setStatus(c.env, c.req.param("id"), parsed);
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.delete("/services/:id", async (c) => {
    const ok = await servicesRepo.remove(c.env, c.req.param("id"));
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });

  /* ------------------------------ Merchandising -------------------------------- */
  r.get("/products", async (c) => c.json(await productsRepo.adminList(c.env, listQuery(c))));
  r.get("/products/:id", async (c) => {
    const item = await productsRepo.adminGet(c.env, c.req.param("id"));
    if (!item) throw ApiError.notFound();
    return c.json(item);
  });
  r.post("/products", async (c) => {
    const input = validate(productInputSchema, await c.req.json());
    const id = await mapUnique(() => productsRepo.create(c.env, input));
    return c.json({ id }, 201);
  });
  r.put("/products/:id", async (c) => {
    const input = validate(productInputSchema, await c.req.json());
    const ok = await mapUnique(() => productsRepo.update(c.env, c.req.param("id"), input));
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.patch("/products/:id/status", async (c) => {
    const body = (await c.req.json()) as { status?: unknown };
    const parsed = statusSchema.parse(body.status);
    const ok = await productsRepo.setStatus(c.env, c.req.param("id"), parsed);
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.patch("/variants/:id/stock", async (c) => {
    const body = (await c.req.json()) as { stock?: unknown };
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) throw ApiError.validation("Stock invalide.");
    const ok = await productsRepo.updateVariantStock(c.env, c.req.param("id"), stock);
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.delete("/products/:id", async (c) => {
    const ok = await productsRepo.remove(c.env, c.req.param("id"));
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });

  /* -------------------------------- Commandes ---------------------------------- */
  r.get("/orders", async (c) => {
    const base = listQuery(c);
    const q = c.req.query();
    return c.json(
      await ordersRepo.adminList(c.env, {
        page: base.page,
        pageSize: base.pageSize,
        orderStatus: q.orderStatus || undefined,
        paymentStatus: q.paymentStatus || undefined,
        search: base.search,
      }),
    );
  });
  r.get("/orders/:id", async (c) => {
    const order = await ordersRepo.adminGet(c.env, c.req.param("id"));
    if (!order) throw ApiError.notFound("Commande introuvable.");
    return c.json(order);
  });
  r.patch("/orders/:id/status", async (c) => {
    const input = validate(updateOrderStatusSchema, await c.req.json());
    const order = await updateOrderStatus(c.env, c.executionCtx, c.req.param("id"), input);
    return c.json(order);
  });

  /* -------------------------------- Messages ----------------------------------- */
  r.get("/messages", async (c) => {
    const base = listQuery(c);
    return c.json(await messagesRepo.adminList(c.env, base));
  });
  r.get("/messages/:id", async (c) => {
    const msg = await messagesRepo.getAndMarkRead(c.env, c.req.param("id"));
    if (!msg) throw ApiError.notFound();
    return c.json(msg);
  });
  r.patch("/messages/:id", async (c) => {
    const { status } = validate(updateMessageSchema, await c.req.json());
    const ok = await messagesRepo.updateStatus(c.env, c.req.param("id"), status);
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.delete("/messages/:id", async (c) => {
    const ok = await messagesRepo.remove(c.env, c.req.param("id"));
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });

  /* ---------------------------------- Médias ----------------------------------- */
  r.get("/media", async (c) => {
    const { page, pageSize } = paginationSchema.parse(c.req.query());
    return c.json(await mediaRepo.listMedia(c.env, page, pageSize));
  });
  r.post("/media", async (c) => {
    const body = await c.req.parseBody();
    const file = body["file"];
    const alt = typeof body["alt"] === "string" ? body["alt"] : "";
    if (!(file instanceof File)) throw ApiError.badRequest("Champ 'file' manquant.");
    const media = await uploadMedia(c.env, file, alt);
    return c.json(media, 201);
  });
  r.patch("/media/:id", async (c) => {
    const { alt } = validate(mediaUpdateSchema, await c.req.json());
    const ok = await mediaRepo.updateMediaAlt(c.env, c.req.param("id"), alt);
    if (!ok) throw ApiError.notFound();
    return c.json({ ok: true });
  });
  r.delete("/media/:id", async (c) => {
    await deleteMedia(c.env, c.req.param("id"));
    return c.json({ ok: true });
  });

  /* ------------------------------- Paramètres ---------------------------------- */
  r.get("/settings", async (c) => c.json(await settingsRepo.getAdminSettings(c.env)));
  r.put("/settings", async (c) => {
    const input = validate(siteSettingsSchema, await c.req.json());
    await settingsRepo.updateSettings(c.env, input);
    return c.json(await settingsRepo.getAdminSettings(c.env));
  });

  return r;
}
