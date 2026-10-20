/**
 * Jetons aléatoires et hachages (sessions, jetons de consultation de commande,
 * références de commande non prédictibles).
 */

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** Jeton opaque aléatoire (base64url). Par défaut 32 octets (256 bits). */
export function generateToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** SHA-256 hexadécimal d'une chaîne (pour stocker un hash de jeton). */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
}

/**
 * Référence de commande lisible et non prédictible.
 * Forme : ARK-XXXXXXXX (alphabet Crockford base32 sans caractères ambigus).
 */
export function generateOrderReference(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `ARK-${out}`;
}
