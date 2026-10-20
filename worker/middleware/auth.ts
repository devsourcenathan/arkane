import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../http-env";
import { getSql, query } from "../db/client";
import { sha256Hex } from "../lib/token";
import { ApiError } from "../lib/errors";
import { SESSION_COOKIE, clearSessionCookie } from "../lib/cookies";

interface SessionRow {
  id: string;
  admin_user_id: string;
  csrf_secret: string;
  expires_at: string;
  revoked_at: string | null;
  email: string;
}

/**
 * Vérifie la session admin (cookie HttpOnly -> hash -> table admin_sessions).
 * Refuse si absente, révoquée ou expirée. Attache `auth` au contexte.
 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) throw ApiError.unauthorized();

  const tokenHash = await sha256Hex(token);
  const sql = getSql(c.env);
  const rows = await query<SessionRow>(
    sql,
    `SELECT s.id, s.admin_user_id, s.csrf_secret, s.expires_at, s.revoked_at, u.email
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.admin_user_id
     WHERE s.token_hash = $1
     LIMIT 1`,
    [tokenHash],
  );
  const row = rows[0];

  if (!row || row.revoked_at || new Date(row.expires_at).getTime() < Date.now()) {
    clearSessionCookie(c);
    throw ApiError.unauthorized("Session invalide ou expirée.");
  }

  c.set("auth", {
    sessionId: row.id,
    adminUserId: row.admin_user_id,
    email: row.email,
    csrfSecret: row.csrf_secret,
  });
  c.header("Cache-Control", "no-store");
  await next();
};
