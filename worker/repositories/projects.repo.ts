import type { Env } from "../types";
import { getSql, query, queryOne, withTransaction } from "../db/client";
import { toMediaDTO, type MediaRow } from "../lib/media-url";
import { ensureUniqueSlug } from "../lib/slug";
import { offset, paginated } from "../lib/http";
import { localized, type I18nBag, type Lang } from "@shared/i18n";
import type { ProjectSummaryDTO, ProjectDetailDTO, Paginated, ContentStatus } from "@shared/types";
import type { ProjectInput } from "@shared/validation";

interface ProjectRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  description?: string;
  video_url?: string;
  release_date: string | null;
  featured: boolean;
  status: ContentStatus;
  sort_order?: number;
  cover: MediaRow | null;
  artists: { id: string; slug: string; name: string }[];
  i18n: I18nBag;
}

const ARTISTS_JSON = `COALESCE((
  SELECT json_agg(json_build_object('id', a.id, 'slug', a.slug, 'name', a.name) ORDER BY pa.sort_order)
  FROM project_artists pa JOIN artists a ON a.id = pa.artist_id
  WHERE pa.project_id = p.id AND a.status = 'published'
), '[]'::json) AS artists`;

const COVER_JSON = "(SELECT to_jsonb(m) FROM media m WHERE m.id = p.cover_media_id) AS cover";

function toSummary(env: Env, r: ProjectRow, lang: Lang): ProjectSummaryDTO {
  return {
    id: r.id,
    slug: r.slug,
    title: localized(r.title, r.i18n, lang, "title"),
    category: r.category,
    cover: toMediaDTO(env, r.cover),
    releaseDate: r.release_date,
    featured: r.featured,
    artists: r.artists ?? [],
  };
}

export async function listPublic(
  env: Env,
  opts: { page: number; pageSize: number; category?: string; lang: Lang },
): Promise<Paginated<ProjectSummaryDTO>> {
  const sql = getSql(env);
  const conds = ["p.status = 'published'"];
  const params: unknown[] = [];
  if (opts.category) {
    params.push(opts.category);
    conds.push(`p.category = $${params.length}`);
  }
  const where = `WHERE ${conds.join(" AND ")}`;
  params.push(opts.pageSize, offset(opts.page, opts.pageSize));

  const rows = await query<ProjectRow>(
    sql,
    `SELECT p.id, p.slug, p.title, p.category, p.release_date, p.featured, p.status, p.i18n,
            ${COVER_JSON}, ${ARTISTS_JSON}
     FROM projects p ${where}
     ORDER BY p.sort_order ASC, p.release_date DESC NULLS LAST, p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const totalRow = await queryOne<{ count: string }>(
    sql,
    `SELECT count(*)::text AS count FROM projects p ${where}`,
    params.slice(0, opts.category ? 1 : 0),
  );
  return paginated(rows.map((r) => toSummary(env, r, opts.lang)), opts.page, opts.pageSize, Number(totalRow?.count ?? 0));
}

export async function listFeatured(env: Env, limit: number, lang: Lang): Promise<ProjectSummaryDTO[]> {
  const rows = await query<ProjectRow>(
    getSql(env),
    `SELECT p.id, p.slug, p.title, p.category, p.release_date, p.featured, p.status, p.i18n,
            ${COVER_JSON}, ${ARTISTS_JSON}
     FROM projects p
     WHERE p.status = 'published' AND p.featured = true
     ORDER BY p.sort_order ASC, p.release_date DESC NULLS LAST
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => toSummary(env, r, lang));
}

export async function listCategories(env: Env): Promise<string[]> {
  const rows = await query<{ category: string }>(
    getSql(env),
    `SELECT DISTINCT category FROM projects
     WHERE status = 'published' AND category <> '' ORDER BY category ASC`,
  );
  return rows.map((r) => r.category);
}

export async function getPublicBySlug(env: Env, slug: string, lang: Lang): Promise<ProjectDetailDTO | null> {
  const r = await queryOne<ProjectRow>(
    getSql(env),
    `SELECT p.id, p.slug, p.title, p.category, p.description, p.video_url, p.release_date,
            p.featured, p.status, p.i18n, ${COVER_JSON}, ${ARTISTS_JSON}
     FROM projects p WHERE p.slug = $1 AND p.status = 'published' LIMIT 1`,
    [slug],
  );
  if (!r) return null;
  return {
    ...toSummary(env, r, lang),
    description: localized(r.description ?? "", r.i18n, lang, "description"),
    videoUrl: r.video_url ?? "",
    status: r.status,
  };
}

/* ----------------------------- Administration ----------------------------- */

export async function adminList(
  env: Env,
  opts: { page: number; pageSize: number; status?: string; search?: string },
): Promise<Paginated<ProjectSummaryDTO & { status: ContentStatus }>> {
  const sql = getSql(env);
  const conds: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    params.push(opts.status);
    conds.push(`p.status = $${params.length}`);
  }
  if (opts.search) {
    params.push(`%${opts.search}%`);
    conds.push(`p.title ILIKE $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  params.push(opts.pageSize, offset(opts.page, opts.pageSize));

  const rows = await query<ProjectRow>(
    sql,
    `SELECT p.id, p.slug, p.title, p.category, p.release_date, p.featured, p.status, p.i18n,
            ${COVER_JSON}, ${ARTISTS_JSON}
     FROM projects p ${where}
     ORDER BY p.sort_order ASC, p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const totalRow = await queryOne<{ count: string }>(
    sql,
    `SELECT count(*)::text AS count FROM projects p ${where}`,
    params.slice(0, conds.length),
  );
  const items = rows.map((r) => ({ ...toSummary(env, r, "fr"), status: r.status }));
  return paginated(items, opts.page, opts.pageSize, Number(totalRow?.count ?? 0));
}

export async function adminGet(env: Env, id: string) {
  const sql = getSql(env);
  const r = await queryOne<ProjectRow & { cover_media_id: string | null }>(
    sql,
    `SELECT p.id, p.slug, p.title, p.category, p.description, p.video_url, p.release_date,
            p.featured, p.status, p.sort_order, p.cover_media_id, p.i18n, ${COVER_JSON}, ${ARTISTS_JSON}
     FROM projects p WHERE p.id = $1 LIMIT 1`,
    [id],
  );
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category,
    description: r.description ?? "",
    videoUrl: r.video_url ?? "",
    releaseDate: r.release_date,
    featured: r.featured,
    status: r.status,
    sortOrder: r.sort_order ?? 0,
    coverMediaId: r.cover_media_id,
    cover: toMediaDTO(env, r.cover),
    artistIds: (r.artists ?? []).map((a) => a.id),
    i18n: r.i18n ?? {},
  };
}

export async function create(env: Env, input: ProjectInput): Promise<string> {
  const sql = getSql(env);
  const slug = await ensureUniqueSlug(sql, "projects", input.slug || input.title);
  const releaseDate = input.releaseDate && input.releaseDate !== "" ? input.releaseDate : null;

  return withTransaction(env, undefined, async (client) => {
    const res = await client.query(
      `INSERT INTO projects
         (slug, title, category, description, cover_media_id, video_url, release_date, status, featured, sort_order, i18n)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) RETURNING id`,
      [
        slug,
        input.title,
        input.category ?? "",
        input.description ?? "",
        input.coverMediaId ?? null,
        input.videoUrl ?? "",
        releaseDate,
        input.status,
        input.featured ?? false,
        input.sortOrder ?? 0,
        JSON.stringify(input.i18n ?? {}),
      ],
    );
    const projectId = res.rows[0].id as string;
    await syncArtists(client, projectId, input.artistIds ?? []);
    return projectId;
  });
}

export async function update(env: Env, id: string, input: ProjectInput): Promise<boolean> {
  const sql = getSql(env);
  const slug = await ensureUniqueSlug(sql, "projects", input.slug || input.title, id);
  const releaseDate = input.releaseDate && input.releaseDate !== "" ? input.releaseDate : null;

  return withTransaction(env, undefined, async (client) => {
    const res = await client.query(
      `UPDATE projects SET
         slug = $1, title = $2, category = $3, description = $4, cover_media_id = $5,
         video_url = $6, release_date = $7, status = $8, featured = $9, sort_order = $10, i18n = $11::jsonb
       WHERE id = $12 RETURNING id`,
      [
        slug,
        input.title,
        input.category ?? "",
        input.description ?? "",
        input.coverMediaId ?? null,
        input.videoUrl ?? "",
        releaseDate,
        input.status,
        input.featured ?? false,
        input.sortOrder ?? 0,
        JSON.stringify(input.i18n ?? {}),
        id,
      ],
    );
    if (res.rows.length === 0) return false;
    await syncArtists(client, id, input.artistIds ?? []);
    return true;
  });
}

async function syncArtists(
  client: { query: (t: string, p?: unknown[]) => Promise<unknown> },
  projectId: string,
  artistIds: string[],
): Promise<void> {
  await client.query("DELETE FROM project_artists WHERE project_id = $1", [projectId]);
  let i = 0;
  for (const artistId of artistIds) {
    await client.query(
      "INSERT INTO project_artists (project_id, artist_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [projectId, artistId, i++],
    );
  }
}

export async function setStatus(env: Env, id: string, status: ContentStatus): Promise<boolean> {
  const rows = await query(getSql(env), "UPDATE projects SET status = $1 WHERE id = $2 RETURNING id", [
    status,
    id,
  ]);
  return rows.length > 0;
}

export async function remove(env: Env, id: string): Promise<boolean> {
  const rows = await query(getSql(env), "DELETE FROM projects WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}
