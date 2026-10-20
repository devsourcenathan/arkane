/**
 * Hachage de mots de passe via PBKDF2-HMAC-SHA256 (Web Crypto).
 * Disponible nativement dans le runtime Workers ET dans Node (globalThis.crypto).
 *
 * Format stocké : `pbkdf2$SHA-256$<iterations>$<salt_b64>$<hash_b64>`
 *
 * ⚠️ L'algorithme est volontairement identique à scripts/_crypto.mjs afin que le
 * script de bootstrap admin produise des hachages vérifiables par le Worker.
 * La compatibilité est verrouillée par tests/crypto-compat.test.ts.
 *
 * ⚠️ 100 000 itérations = MAXIMUM supporté par le runtime Cloudflare Workers
 * (au-delà, crypto.subtle lève NotSupportedError). Ne pas augmenter.
 */
const ALGO = "SHA-256";
const ITERATIONS = 100_000;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveBits(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: ALGO },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/** Comparaison à temps constant. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, ITERATIONS);
  return `pbkdf2$${ALGO}$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2") return false;
  const iterations = Number.parseInt(parts[2], 10);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  const salt = fromBase64(parts[3]);
  const expected = fromBase64(parts[4]);
  const actual = await deriveBits(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}
