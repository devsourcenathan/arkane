import type { Env } from "../types";
import { getSql, query, queryOne } from "../db/client";

export interface AdminUserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  last_login_at: string | null;
}

export async function findUserByEmail(env: Env, email: string): Promise<AdminUserRow | null> {
  return queryOne<AdminUserRow>(
    getSql(env),
    "SELECT id, email, password_hash, display_name, last_login_at FROM admin_users WHERE lower(email) = lower($1) LIMIT 1",
    [email],
  );
}

export async function touchLastLogin(env: Env, userId: string): Promise<void> {
  await query(getSql(env), "UPDATE admin_users SET last_login_at = now() WHERE id = $1", [userId]);
}

export async function createSession(
  env: Env,
  input: {
    userId: string;
    tokenHash: string;
    csrfSecret: string;
    expiresAt: Date;
    ip: string;
    userAgent: string;
  },
): Promise<void> {
  await query(
    getSql(env),
    `INSERT INTO admin_sessions (admin_user_id, token_hash, csrf_secret, expires_at, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.userId, input.tokenHash, input.csrfSecret, input.expiresAt.toISOString(), input.ip, input.userAgent],
  );
}

export async function revokeSession(env: Env, sessionId: string): Promise<void> {
  await query(getSql(env), "UPDATE admin_sessions SET revoked_at = now() WHERE id = $1", [sessionId]);
}

/** Purge opportuniste des sessions expirées/révoquées anciennes. */
export async function purgeExpiredSessions(env: Env): Promise<void> {
  await query(
    getSql(env),
    "DELETE FROM admin_sessions WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days'",
  );
}
