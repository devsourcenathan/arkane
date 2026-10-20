import type { Context } from "hono";
import type { Paginated } from "@shared/types";

/** Construit une réponse paginée à partir du total renvoyé par la base. */
export function paginated<T>(items: T[], page: number, pageSize: number, total: number): Paginated<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Calcule l'offset SQL. */
export function offset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/** En-têtes anti-cache pour les réponses d'API sensibles/admin. */
export function noStore(c: Context) {
  c.header("Cache-Control", "no-store");
}
