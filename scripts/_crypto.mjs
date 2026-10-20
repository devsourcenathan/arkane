/**
 * Miroir Node (ESM) de worker/lib/password.ts.
 * DOIT rester strictement identique en algorithme et format.
 * La compatibilité est verrouillée par tests/crypto-compat.test.ts.
 */
// 100 000 = maximum supporté par Cloudflare Workers (cf. worker/lib/password.ts).
const ALGO = "SHA-256";
const ITERATIONS = 100_000;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

function toBase64(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveBits(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: ALGO },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, ITERATIONS);
  return `pbkdf2$${ALGO}$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2") return false;
  const iterations = Number.parseInt(parts[2], 10);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  const salt = fromBase64(parts[3]);
  const expected = fromBase64(parts[4]);
  const actual = await deriveBits(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}
