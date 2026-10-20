import type { Env } from "../types";
import { ApiError } from "../lib/errors";
import { generateToken } from "../lib/token";
import { insertMedia, deleteMediaRow, isReferencedByPublished } from "../repositories/media.repo";
import type { MediaDTO } from "@shared/types";

const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo

/** Types autorisés -> extension canonique. */
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/** Vérifie que les octets d'en-tête correspondent au type déclaré (anti-spoofing). */
function sniffMatches(contentType: string, bytes: Uint8Array): boolean {
  const b = bytes;
  switch (contentType) {
    case "image/jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png":
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case "image/gif":
      return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
    case "image/webp":
      return (
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
      );
    case "image/avif": {
      // ....ftyp....  (boîte ISO-BMFF)
      return b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
    }
    case "image/svg+xml": {
      const head = new TextDecoder().decode(b).trimStart();
      return head.startsWith("<");
    }
    default:
      return false;
  }
}

export async function uploadMedia(env: Env, file: File, alt: string): Promise<MediaDTO> {
  if (!(file instanceof File) || file.size === 0) {
    throw ApiError.badRequest("Fichier manquant.");
  }
  if (file.size > MAX_BYTES) {
    throw new ApiError("payload_too_large", "Fichier trop volumineux (max 8 Mo).");
  }
  const contentType = file.type;
  const ext = ALLOWED[contentType];
  if (!ext) {
    throw new ApiError("unsupported_media", "Type de fichier non autorisé.");
  }

  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer.slice(0, 16));
  if (!sniffMatches(contentType, head)) {
    throw new ApiError("unsupported_media", "Le contenu ne correspond pas au type déclaré.");
  }

  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `media/${yearMonth}/${generateToken(16)}.${ext}`;

  await env.MEDIA.put(key, buffer, {
    httpMetadata: { contentType },
  });

  return insertMedia(env, {
    r2Key: key,
    filename: file.name.slice(0, 200),
    contentType,
    sizeBytes: file.size,
    width: null,
    height: null,
    alt,
  });
}

export async function deleteMedia(env: Env, id: string): Promise<void> {
  if (await isReferencedByPublished(env, id)) {
    throw ApiError.conflict("Ce média est utilisé par un contenu publié. Détachez-le d'abord.");
  }
  const r2Key = await deleteMediaRow(env, id);
  if (!r2Key) throw ApiError.notFound("Média introuvable.");
  try {
    await env.MEDIA.delete(r2Key);
  } catch {
    // La ligne est supprimée ; l'objet R2 orphelin sera nettoyé si besoin.
  }
}

/** Sert un objet média depuis R2 (route publique proxy). */
export async function serveMedia(env: Env, key: string): Promise<Response> {
  const object = await env.MEDIA.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }
  const headers = new Headers();
  const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";
  headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  // Neutralise l'exécution de scripts pour les SVG servis en ligne.
  if (contentType === "image/svg+xml") {
    headers.set("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }
  return new Response(object.body, { headers });
}
