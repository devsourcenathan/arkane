import type { Context } from "hono";
import { ZodError } from "zod";
import { ApiError } from "../lib/errors";
import type { ApiErrorBody } from "@shared/types";

/** Gestionnaire d'erreurs centralisé — réponses JSON cohérentes, sans fuite d'info. */
export function onError(err: Error, c: Context): Response {
  if (err instanceof ApiError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    };
    return c.json(body, err.status as 400);
  }

  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      error: { code: "validation_error", message: "Données invalides.", details: err.flatten() },
    };
    return c.json(body, 422);
  }

  // Erreur inattendue : on logge en détail, on renvoie un message générique.
  console.error("[unhandled]", err?.stack ?? err);
  const body: ApiErrorBody = {
    error: { code: "internal_error", message: "Une erreur interne est survenue." },
  };
  return c.json(body, 500);
}
