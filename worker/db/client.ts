import { neon, Pool, type PoolClient } from "@neondatabase/serverless";
import type { Env } from "../types";

/** Fonction de requête Neon (HTTP) — parfaite pour les lectures/écritures simples. */
export type Sql = ReturnType<typeof neon>;

/** Contexte minimal pour prolonger une tâche après la réponse (découplé du type ExecutionContext). */
export interface WaitUntilCtx {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Crée un client Neon HTTP. Léger, sans connexion persistante : idéal en Worker.
 * À instancier par requête (ne pas conserver au niveau module).
 */
export function getSql(env: Env): Sql {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL manquant — configurez Neon (.dev.vars / wrangler secret).");
  }
  return neon(env.DATABASE_URL);
}

/**
 * Exécute une requête paramétrée et renvoie les lignes typées.
 * Toujours paramétré ($1, $2, ...) — jamais de concaténation de valeurs client.
 */
export async function query<T = Record<string, unknown>>(
  sql: Sql,
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  // Usage "fonction ordinaire" du driver Neon HTTP : sql(text, params) -> lignes.
  const rows = await sql(text, params as unknown[]);
  return rows as T[];
}

/** Première ligne ou null. */
export async function queryOne<T = Record<string, unknown>>(
  sql: Sql,
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, text, params);
  return rows[0] ?? null;
}

/**
 * Transaction interactive via le Pool Neon (WebSocket).
 * Nécessaire pour les opérations atomiques avec décision conditionnelle
 * (ex: décrément de stock sous contrainte, création de commande).
 */
export async function withTransaction<T>(
  env: Env,
  ctx: WaitUntilCtx | undefined,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL manquant — configurez Neon (.dev.vars / wrangler secret).");
  }
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback error */
    }
    throw err;
  } finally {
    client.release();
    const ending = pool.end();
    if (ctx) ctx.waitUntil(ending);
    else await ending;
  }
}

export type { PoolClient };
