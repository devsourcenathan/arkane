import type { Env } from "../types";
import type { MediaDTO } from "@shared/types";

export interface MediaRow {
  id: string;
  r2_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  created_at?: string;
}

/**
 * URL publique d'un média :
 * - si PUBLIC_MEDIA_BASE_URL est défini (bucket R2 public / domaine personnalisé), on l'utilise ;
 * - sinon on sert via le proxy du Worker /api/v1/media/:key.
 */
export function mediaUrl(env: Env, r2Key: string): string {
  // Clé déjà absolue (http/https) : URL externe directe (ex. données de démo).
  if (/^https?:\/\//i.test(r2Key)) return r2Key;
  const base = env.PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "");
  if (base) return `${base}/${r2Key}`;
  return `/api/v1/media/${r2Key.split("/").map(encodeURIComponent).join("/")}`;
}

export function toMediaDTO(env: Env, row: MediaRow | null | undefined): MediaDTO | null {
  if (!row) return null;
  return {
    id: row.id,
    url: mediaUrl(env, row.r2_key),
    alt: row.alt,
    width: row.width,
    height: row.height,
    contentType: row.content_type,
    filename: row.filename,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}
