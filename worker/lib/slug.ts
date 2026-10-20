import type { Sql } from "../db/client";
import { query } from "../db/client";

/** Tables disposant d'une colonne `slug` unique (liste fermée — jamais d'entrée client). */
export type SluggedTable = "artists" | "projects" | "services" | "products";

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "") || "element";
}

/**
 * Garantit l'unicité du slug dans `table`. Ajoute un suffixe -2, -3... si besoin.
 * `table` provient d'une union fermée (sûr à interpoler) ; la valeur est paramétrée.
 */
export async function ensureUniqueSlug(
  sql: Sql,
  table: SluggedTable,
  desired: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(desired);
  let candidate = base;
  let n = 1;
  // Boucle bornée pour éviter tout cas pathologique.
  for (let i = 0; i < 1000; i++) {
    const rows = await query<{ id: string }>(
      sql,
      `SELECT id FROM ${table} WHERE slug = $1 ${excludeId ? "AND id <> $2" : ""} LIMIT 1`,
      excludeId ? [candidate, excludeId] : [candidate],
    );
    if (rows.length === 0) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  // Dernier recours : suffixe aléatoire.
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
