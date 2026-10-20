import type { Env } from "../types";
import { getSql, query } from "../db/client";
import { ApiError } from "../lib/errors";

interface RateRow {
  count: number;
  reset_at: string;
}

/**
 * Limiteur de débit durable (table rate_limits), atomique via upsert conditionnel.
 * Fenêtre glissante par `bucket`. Lève ApiError 429 si dépassé.
 */
export async function enforceRateLimit(
  env: Env,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const sql = getSql(env);
  const rows = await query<RateRow>(
    sql,
    `INSERT INTO rate_limits (bucket, count, reset_at)
     VALUES ($1, 1, now() + ($2 || ' seconds')::interval)
     ON CONFLICT (bucket) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at < now()
                       THEN now() + ($2 || ' seconds')::interval
                       ELSE rate_limits.reset_at END
     RETURNING count, reset_at`,
    [bucket, String(windowSeconds)],
  );
  const row = rows[0];
  if (row && row.count > limit) {
    throw ApiError.rateLimited();
  }
}

/** Récupère l'IP cliente (Cloudflare) ou un repli local. */
export function clientIp(headers: Headers): string {
  return headers.get("cf-connecting-ip") || headers.get("x-forwarded-for") || "local";
}
