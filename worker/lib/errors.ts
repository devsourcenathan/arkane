export type ErrorCode =
  | "bad_request"
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "turnstile_failed"
  | "insufficient_stock"
  | "payload_too_large"
  | "unsupported_media"
  | "internal_error";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  validation_error: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  turnstile_failed: 400,
  insufficient_stock: 409,
  payload_too_large: 413,
  unsupported_media: 415,
  internal_error: 500,
};

/** Erreur applicative portant un code stable + statut HTTP. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }

  static badRequest(msg = "Requête invalide.", details?: unknown) {
    return new ApiError("bad_request", msg, details);
  }
  static validation(msg = "Données invalides.", details?: unknown) {
    return new ApiError("validation_error", msg, details);
  }
  static unauthorized(msg = "Authentification requise.") {
    return new ApiError("unauthorized", msg);
  }
  static forbidden(msg = "Accès refusé.") {
    return new ApiError("forbidden", msg);
  }
  static notFound(msg = "Ressource introuvable.") {
    return new ApiError("not_found", msg);
  }
  static conflict(msg = "Conflit.", details?: unknown) {
    return new ApiError("conflict", msg, details);
  }
  static rateLimited(msg = "Trop de requêtes. Réessayez plus tard.") {
    return new ApiError("rate_limited", msg);
  }
  static turnstile(msg = "Échec de la vérification anti-robot.") {
    return new ApiError("turnstile_failed", msg);
  }
  static insufficientStock(msg = "Stock insuffisant.", details?: unknown) {
    return new ApiError("insufficient_stock", msg, details);
  }
}
