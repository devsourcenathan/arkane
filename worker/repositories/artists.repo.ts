import type { Env } from "../types";
import { getSql, query, queryOne } from "../db/client";
import { toMediaDTO, type MediaRow } from "../lib/media-url";
import { ensureUniqueSlug } from "../lib/slug";
import { offset, paginated } from "../lib/http";
import { localized, type I18nBag, type Lang } from "@shared/i18n";
import type { ArtistSummaryDTO, ArtistDetailDTO, ProjectSummaryDTO, Paginated, ContentStatus } from "@shared/types";
import type { ArtistInput } from "@shared/validation";

interface ArtistRow {
  id: string;
  slug: string;
  name: string;
  role_title: string;
  bio: string;
  portrait: MediaRow | null;
  social_instagram: string;
  social_youtube: string;
  social_spotify: string;
  social_apple_music: string;
  social_tiktok: string;
  social_x: string;
  status: ContentStatus;
  sort_order: number;
  i18n: I18nBag;
}

const PORTRAIT_JSON = "(SELECT to_jsonb(m) FROM media m WHERE m.id = a.portrait_media_id) AS portrait";

function toSummary(env: Env, r: ArtistRow, lang: Lang): ArtistSummaryDTO {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    roleTitle: localized(r.role_title, r.i18n, lang, "roleTitle"),
    portrait: toMediaDTO(env, r.portrait),
  };
}

export async function listPublic(env: Env, lang: Lang): Promise<ArtistSummaryDTO[]> {
  const rows = await query<ArtistRow>(
    getSql(env),
    `SELECT a.id, a.slug, a.name, a.role_title, a.i18n, ${PORTRAIT_JSON}
     FROM artists a WHERE a.status = 'published'
     ORDER BY a.sort_order ASC, a.name ASC`,
  );
  return rows.map((r) => toSummary(env, r, lang));
}

export async function getPublicBySlug(env: Env, slug: string, lang: Lang): Promise<ArtistDetailDTO | null> {
  const sql = getSql(env);
  const r = await queryOne<ArtistRow>(
    sql,
    `SELECT a.id, a.slug, a.name, a.role_title, a.bio, a.status, a.i18n,
            a.social_instagram, a.social_youtube, a.social_spotify, a.social_apple_music,
            a.social_tiktok, a.social_x, ${PORTRAIT_JSON}
     FROM artists a WHERE a.slug = $1 AND a.status = 'published' LIMIT 1`,
    [slug],
  );
  if (!r) return null;

  const projects = await query<{
    id: string;
    slug: string;
    title: string;
    category: string;
    release_date: string | null;
    featured: boolean;
    cover: MediaRow | null;
    i18n: I18nBag;
  }>(
    sql,
    `SELECT p.id, p.slug, p.title, p.category, p.release_date, p.featured, p.i18n,
            (SELECT to_jsonb(m) FROM media m WHERE m.id = p.cover_media_id) AS cover
     FROM projects p
     JOIN project_artists pa ON pa.project_id = p.id
     WHERE pa.artist_id = $1 AND p.status = 'published'
     ORDER BY p.sort_order ASC, p.release_date DESC NULLS LAST`,
    [r.id],
  );

  const projectDTOs: ProjectSummaryDTO[] = projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: localized(p.title, p.i18n, lang, "title"),
    category: p.category,
    cover: toMediaDTO(env, p.cover),
    releaseDate: p.release_date,
    featured: p.featured,
    artists: [],
  }));

  return {
    ...toSummary(env, r, lang),
    bio: localized(r.bio, r.i18n, lang, "bio"),
    socials: {
      instagram: r.social_instagram,
      youtube: r.social_youtube,
      spotify: r.social_spotify,
      appleMusic: r.social_apple_music,
      tiktok: r.social_tiktok,
      x: r.social_x,
    },
    status: r.status,
    projects: projectDTOs,
  };
}

/* ----------------------------- Administration ----------------------------- */

export interface AdminArtistListItem {
  id: string;
  slug: string;
  name: string;
  roleTitle: string;
  status: ContentStatus;
  sortOrder: number;
  portrait: ReturnType<typeof toMediaDTO>;
}

export async function adminList(
  env: Env,
  opts: { page: number; pageSize: number; status?: string; search?: string },
): Promise<Paginated<AdminArtistListItem>> {
  const sql = getSql(env);
  const conds: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    params.push(opts.status);
    conds.push(`a.status = $${params.length}`);
  }
  if (opts.search) {
    params.push(`%${opts.search}%`);
    conds.push(`a.name ILIKE $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  params.push(opts.pageSize, offset(opts.page, opts.pageSize));
  const rows = await query<ArtistRow>(
    sql,
    `SELECT a.id, a.slug, a.name, a.role_title, a.status, a.sort_order, ${PORTRAIT_JSON}
     FROM artists a ${where}
     ORDER BY a.sort_order ASC, a.name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const totalRow = await queryOne<{ count: string }>(
    sql,
    `SELECT count(*)::text AS count FROM artists a ${where}`,
    params.slice(0, conds.length),
  );
  const items = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    roleTitle: r.role_title,
    status: r.status,
    sortOrder: r.sort_order,
    portrait: toMediaDTO(env, r.portrait),
  }));
  return paginated(items, opts.page, opts.pageSize, Number(totalRow?.count ?? 0));
}

export async function adminGet(env: Env, id: string) {
  const r = await queryOne<ArtistRow>(
    getSql(env),
    `SELECT a.id, a.slug, a.name, a.role_title, a.bio, a.status, a.sort_order, a.i18n,
            a.portrait_media_id, a.social_instagram, a.social_youtube, a.social_spotify,
            a.social_apple_music, a.social_tiktok, a.social_x, ${PORTRAIT_JSON}
     FROM artists a WHERE a.id = $1 LIMIT 1`,
    [id],
  );
  if (!r) return null;
  const row = r as ArtistRow & { portrait_media_id: string | null };
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    roleTitle: row.role_title,
    bio: row.bio,
    portraitMediaId: row.portrait_media_id,
    portrait: toMediaDTO(env, row.portrait),
    socialInstagram: row.social_instagram,
    socialYoutube: row.social_youtube,
    socialSpotify: row.social_spotify,
    socialAppleMusic: row.social_apple_music,
    socialTiktok: row.social_tiktok,
    socialX: row.social_x,
    status: row.status,
    sortOrder: row.sort_order,
    i18n: row.i18n ?? {},
  };
}

export async function create(env: Env, input: ArtistInput): Promise<string> {
  const sql = getSql(env);
  const slug = await ensureUniqueSlug(sql, "artists", input.slug || input.name);
  const rows = await query<{ id: string }>(
    sql,
    `INSERT INTO artists
       (slug, name, role_title, bio, portrait_media_id, social_instagram, social_youtube,
        social_spotify, social_apple_music, social_tiktok, social_x, status, sort_order, i18n)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
     RETURNING id`,
    [
      slug,
      input.name,
      input.roleTitle ?? "",
      input.bio ?? "",
      input.portraitMediaId ?? null,
      input.socialInstagram ?? "",
      input.socialYoutube ?? "",
      input.socialSpotify ?? "",
      input.socialAppleMusic ?? "",
      input.socialTiktok ?? "",
      input.socialX ?? "",
      input.status,
      input.sortOrder ?? 0,
      JSON.stringify(input.i18n ?? {}),
    ],
  );
  return rows[0].id;
}

export async function update(env: Env, id: string, input: ArtistInput): Promise<boolean> {
  const sql = getSql(env);
  const slug = await ensureUniqueSlug(sql, "artists", input.slug || input.name, id);
  const rows = await query<{ id: string }>(
    sql,
    `UPDATE artists SET
       slug = $1, name = $2, role_title = $3, bio = $4, portrait_media_id = $5,
       social_instagram = $6, social_youtube = $7, social_spotify = $8,
       social_apple_music = $9, social_tiktok = $10, social_x = $11, status = $12,
       sort_order = $13, i18n = $14::jsonb
     WHERE id = $15 RETURNING id`,
    [
      slug,
      input.name,
      input.roleTitle ?? "",
      input.bio ?? "",
      input.portraitMediaId ?? null,
      input.socialInstagram ?? "",
      input.socialYoutube ?? "",
      input.socialSpotify ?? "",
      input.socialAppleMusic ?? "",
      input.socialTiktok ?? "",
      input.socialX ?? "",
      input.status,
      input.sortOrder ?? 0,
      JSON.stringify(input.i18n ?? {}),
      id,
    ],
  );
  return rows.length > 0;
}

export async function setStatus(env: Env, id: string, status: ContentStatus): Promise<boolean> {
  const rows = await query(getSql(env), "UPDATE artists SET status = $1 WHERE id = $2 RETURNING id", [
    status,
    id,
  ]);
  return rows.length > 0;
}

export async function remove(env: Env, id: string): Promise<boolean> {
  const rows = await query(getSql(env), "DELETE FROM artists WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}
