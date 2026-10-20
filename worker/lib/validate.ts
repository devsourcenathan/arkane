import type { ZodType } from "zod";
import { ApiError } from "./errors";

/**
 * Valide `data` contre `schema`, ou lève une ApiError 422 avec le détail des champs.
 * Renvoie le type de SORTIE du schéma (valeurs par défaut appliquées).
 */
export function validate<S extends ZodType>(schema: S, data: unknown): S["_output"] {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw ApiError.validation("Données invalides.", result.error.flatten());
  }
  return result.data;
}
