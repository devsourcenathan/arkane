import type { Context } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import type { AppEnv } from "../http-env";

export const SESSION_COOKIE = "arkane_session";

/** Durée de vie d'une session admin (secondes). */
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 heures

function isProd(c: Context<AppEnv>): boolean {
  return (c.env.APP_ENV ?? "production") === "production";
}

export function setSessionCookie(c: Context<AppEnv>, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd(c),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(c: Context<AppEnv>) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}
