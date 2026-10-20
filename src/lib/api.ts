import type { ApiErrorBody } from "@shared/types";

const BASE = "/api/v1";
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Jeton CSRF courant (défini par l'auth admin après login / me). */
let csrfToken: string | null = null;
export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

/**
 * Langue courante envoyée à l'API (en-tête X-Lang) pour localiser le contenu.
 * Initialisée dès le chargement du module (avant le 1er rendu React) pour que
 * la toute première requête utilise déjà la bonne langue.
 */
let apiLang: string | null = detectInitialLang();
export function setApiLang(lang: string | null): void {
  apiLang = lang;
}

function detectInitialLang(): string | null {
  try {
    const stored = localStorage.getItem("arkane_lang");
    if (stored === "fr" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  try {
    if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("en")) {
      return "en";
    }
  } catch {
    /* ignore */
  }
  return null;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(method: string, path: string, body?: unknown, isForm = false): Promise<T> {
  const headers: Record<string, string> = {};
  const init: RequestInit = { method, credentials: "same-origin" };

  if (body !== undefined && body !== null) {
    if (isForm) {
      init.body = body as BodyInit;
    } else {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }
  }
  if (MUTATING.has(method) && csrfToken) {
    headers["x-csrf-token"] = csrfToken;
  }
  if (apiLang) {
    headers["x-lang"] = apiLang;
  }
  init.headers = headers;

  const res = await fetch(`${BASE}${path}`, init);
  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const err = (payload as ApiErrorBody | null)?.error;
    throw new ApiClientError(
      err?.code ?? "error",
      err?.message ?? `Erreur ${res.status}`,
      res.status,
      err?.details,
    );
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
  upload: <T>(path: string, form: FormData) => request<T>("POST", path, form, true),
};

/** Sérialise des paramètres de requête en ignorant les valeurs vides. */
export function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
