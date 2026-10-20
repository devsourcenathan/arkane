import type { Env } from "../types";
import { ApiError } from "../lib/errors";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Vérifie un jeton Turnstile côté serveur. Lève ApiError si invalide (fail-closed).
 * La clé de test de dev (1x000...) réussit toujours auprès de Cloudflare.
 */
export async function verifyTurnstile(env: Env, token: string, ip?: string): Promise<void> {
  if (!env.TURNSTILE_SECRET_KEY) {
    // Fail-closed : une protection manquante ne doit pas ouvrir le formulaire.
    throw ApiError.turnstile("Protection anti-robot non configurée côté serveur.");
  }

  const form = new URLSearchParams();
  form.set("secret", env.TURNSTILE_SECRET_KEY);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);

  let ok = false;
  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean };
    ok = data.success === true;
  } catch {
    ok = false;
  }

  if (!ok) throw ApiError.turnstile();
}
