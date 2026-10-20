import type { Env } from "../types";
import { getSql, query, queryOne } from "../db/client";
import { toMediaDTO, type MediaRow } from "../lib/media-url";
import { offset, paginated } from "../lib/http";
import type { MediaDTO, Paginated } from "@shared/types";

export interface InsertMediaInput {
  r2Key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt?: string;
}

export async function insertMedia(env: Env, input: InsertMediaInput): Promise<MediaDTO> {
  const sql = getSql(env);
  const row = await queryOne<MediaRow>(
    sql,
    `INSERT INTO media (r2_key, filename, content_type, size_bytes, width, height, alt)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.r2Key,
      input.filename,
      input.contentType,
      input.sizeBytes,
      input.width,
      input.height,
      input.alt ?? "",
    ],
  );
  return toMediaDTO(env, row)!;
}

export async function getMediaById(env: Env, id: string): Promise<MediaRow | null> {
  return queryOne<MediaRow>(getSql(env), "SELECT * FROM media WHERE id = $1", [id]);
}

export async function listMedia(env: Env, page: number, pageSize: number): Promise<Paginated<MediaDTO>> {
  const sql = getSql(env);
  const rows = await query<MediaRow>(
    sql,
    "SELECT * FROM media ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [pageSize, offset(page, pageSize)],
  );
  const totalRow = await queryOne<{ count: string }>(sql, "SELECT count(*)::text AS count FROM media");
  const items = rows.map((r) => toMediaDTO(env, r)!);
  return paginated(items, page, pageSize, Number(totalRow?.count ?? 0));
}

export async function updateMediaAlt(env: Env, id: string, alt: string): Promise<boolean> {
  const rows = await query(getSql(env), "UPDATE media SET alt = $1 WHERE id = $2 RETURNING id", [alt, id]);
  return rows.length > 0;
}

/** Vrai si le média est référencé par un contenu PUBLIÉ (bloque la suppression). */
export async function isReferencedByPublished(env: Env, id: string): Promise<boolean> {
  const row = await queryOne<{ referenced: boolean }>(
    getSql(env),
    `SELECT (
       EXISTS(SELECT 1 FROM artists  WHERE portrait_media_id = $1 AND status = 'published') OR
       EXISTS(SELECT 1 FROM projects WHERE cover_media_id   = $1 AND status = 'published') OR
       EXISTS(SELECT 1 FROM services WHERE cover_media_id   = $1 AND status = 'published') OR
       EXISTS(SELECT 1 FROM products WHERE cover_media_id   = $1 AND status = 'published') OR
       EXISTS(SELECT 1 FROM product_images pi JOIN products p ON p.id = pi.product_id
              WHERE pi.media_id = $1 AND p.status = 'published') OR
       EXISTS(SELECT 1 FROM site_settings WHERE og_image_media_id = $1)
     ) AS referenced`,
    [id],
  );
  return row?.referenced === true;
}

/** Supprime la ligne média et renvoie sa clé R2 (pour suppression dans R2). */
export async function deleteMediaRow(env: Env, id: string): Promise<string | null> {
  const rows = await query<{ r2_key: string }>(
    getSql(env),
    "DELETE FROM media WHERE id = $1 RETURNING r2_key",
    [id],
  );
  return rows[0]?.r2_key ?? null;
}
