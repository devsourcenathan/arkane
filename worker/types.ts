/**
 * Bindings et variables d'environnement du Worker.
 * - Secrets (DATABASE_URL, SESSION_SECRET, TURNSTILE_SECRET_KEY) : via `.dev.vars`
 *   en local et `wrangler secret put` en production.
 * - Vars publiques : définies dans wrangler.jsonc > vars.
 */
export interface Env {
  /** Binding des assets statiques (SPA buildée par Vite). */
  ASSETS: Fetcher;
  /** Bucket R2 pour les médias (images, fichiers). */
  MEDIA: R2Bucket;

  /** Chaîne de connexion Neon (Postgres). Secret. */
  DATABASE_URL: string;
  /** Clé secrète pour la dérivation/signature des jetons de session. Secret. */
  SESSION_SECRET: string;
  /** Clé secrète Cloudflare Turnstile (vérification serveur). Secret. */
  TURNSTILE_SECRET_KEY: string;

  /** Environnement applicatif : "development" | "production". */
  APP_ENV: string;
  /** URL de base publique (sans slash final) pour sitemap / Open Graph. */
  PUBLIC_BASE_URL: string;
  /** Préfixe public pour servir les médias R2 (vide = proxy via /api/v1/media). */
  PUBLIC_MEDIA_BASE_URL: string;
}
