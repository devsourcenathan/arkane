import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../http-env";
import { ApiError } from "../lib/errors";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Protection CSRF pour les routes admin authentifiées par cookie.
 * Les requêtes mutantes doivent présenter l'en-tête X-CSRF-Token égal au secret
 * de session. Le cookie de session étant HttpOnly + SameSite=Lax, un site tiers
 * ne peut ni le lire ni le transmettre : défense en profondeur.
 */
export const csrfProtect: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (MUTATING.has(c.req.method)) {
    const auth = c.get("auth");
    const header = c.req.header("x-csrf-token");
    if (!auth || !header || header !== auth.csrfSecret) {
      throw ApiError.forbidden("Jeton CSRF invalide ou manquant.");
    }
  }
  await next();
};
