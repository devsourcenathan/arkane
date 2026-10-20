import type { Env } from "../types";
import { getSql, query, queryOne } from "../db/client";
import { toMediaDTO, type MediaRow } from "../lib/media-url";
import { ensureUniqueSlug } from "../lib/slug";
import { offset, paginated } from "../lib/http";
import { localized, type I18nBag, type Lang } from "@shared/i18n";
import type { ServiceDTO, Paginated, ContentStatus } from "@shared/types";
import type { ServiceInput } from "@shared/validation";

interface ServiceRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  price_from_xaf: number | null;
  price_note: string;
  status: ContentStatus;
  sort_order?: number;
  cover_media_id?: string | null;
  cover: MediaRow | null;
  i18n: I18nBag;
}

const COVER_JSON = "(SELECT to_jsonb(m) FROM media m WHERE m.id = s.cover_media_id) AS cover";

function toDTO(env: Env, r: ServiceRow, lang: Lang): ServiceDTO {
  return {
    id: r.id,
    slug: r.slug,
    title: localized(r.title, r.i18n, lang, "title"),
    summary: localized(r.summary, r.i18n, lang, "summary"),
    description: localized(r.description, r.i18n, lang, "description"),
    priceFromXaf: r.price_from_xaf,
    priceNote: localized(r.price_note, r.i18n, lang, "priceNote"),
    cover: toMediaDTO(env, r.cover),
    status: r.status,
  };
}

export async function listPublic(env: Env, lang: Lang): Promise<ServiceDTO[]> {
  const rows = await query<ServiceRow>(
    getSql(env),
    `SELECT s.id, s.slug, s.title, s.summary, s.description, s.price_from_xaf, s.price_note, s.status, s.i18n, ${COVER_JSON}
     FROM services s WHERE s.status = 'published' ORDER BY s.sort_order ASC, s.title ASC`,
  );
  return rows.map((r) => toDTO(env, r, lang));
}

export async function getPublicBySlug(env: Env, slug: string, lang: Lang): Promise<ServiceDTO | null> {
  const r = await queryOne<ServiceRow>(
    getSql(env),
    `SELECT s.id, s.slug, s.title, s.summary, s.description, s.price_from_xaf, s.price_note, s.status, s.i18n, ${COVER_JSON}
     FROM services s WHERE s.slug = $1 AND s.status = 'published' LIMIT 1`,
    [slug],
  );
  return r ? toDTO(env, r, lang) : null;
}

export async function adminList(
  env: Env,
  opts: { page: number; pageSize: number; status?: string },
): Promise<Paginated<ServiceDTO>> {
  const sql = getSql(env);
  const conds: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    params.push(opts.status);
    conds.push(`s.status = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  params.push(opts.pageSize, offset(opts.page, opts.pageSize));
  const rows = await query<ServiceRow>(
    sql,
    `SELECT s.id, s.slug, s.title, s.summary, s.description, s.price_from_xaf, s.price_note, s.status, s.i18n, ${COVER_JSON}
     FROM services s ${where} ORDER BY s.sort_order ASC, s.title ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const totalRow = await queryOne<{ count: string }>(
    sql,
    `SELECT count(*)::text AS count FROM services s ${where}`,
    params.slice(0, conds.length),
  );
  return paginated(rows.map((r) => toDTO(env, r, "fr")), opts.page, opts.pageSize, Number(totalRow?.count ?? 0));
}

export async function adminGet(env: Env, id: string) {
  const r = await queryOne<ServiceRow>(
    getSql(env),
    `SELECT s.id, s.slug, s.title, s.summary, s.description, s.price_from_xaf, s.price_note,
            s.status, s.sort_order, s.cover_media_id, s.i18n, ${COVER_JSON}
     FROM services s WHERE s.id = $1 LIMIT 1`,
    [id],
  );
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    description: r.description,
    priceFromXaf: r.price_from_xaf,
    priceNote: r.price_note,
    coverMediaId: r.cover_media_id ?? null,
    cover: toMediaDTO(env, r.cover),
    status: r.status,
    sortOrder: r.sort_order ?? 0,
    i18n: r.i18n ?? {},
  };
}

export async function create(env: Env, input: ServiceInput): Promise<string> {
  const sql = getSql(env);
  const slug = await ensureUniqueSlug(sql, "services", input.slug || input.title);
  const rows = await query<{ id: string }>(
    sql,
    `INSERT INTO services (slug, title, summary, description, price_from_xaf, price_note, cover_media_id, status, sort_order, i18n)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING id`,
    [
      slug,
      input.title,
      input.summary ?? "",
      input.description ?? "",
      input.priceFromXaf ?? null,
      input.priceNote ?? "",
      input.coverMediaId ?? null,
      input.status,
      input.sortOrder ?? 0,
      JSON.stringify(input.i18n ?? {}),
    ],
  );
  return rows[0].id;
}

export async function update(env: Env, id: string, input: ServiceInput): Promise<boolean> {
  const sql = getSql(env);
  const slug = await ensureUniqueSlug(sql, "services", input.slug || input.title, id);
  const rows = await query<{ id: string }>(
    sql,
    `UPDATE services SET slug=$1, title=$2, summary=$3, description=$4, price_from_xaf=$5,
       price_note=$6, cover_media_id=$7, status=$8, sort_order=$9, i18n=$10::jsonb WHERE id=$11 RETURNING id`,
    [
      slug,
      input.title,
      input.summary ?? "",
      input.description ?? "",
      input.priceFromXaf ?? null,
      input.priceNote ?? "",
      input.coverMediaId ?? null,
      input.status,
      input.sortOrder ?? 0,
      JSON.stringify(input.i18n ?? {}),
      id,
    ],
  );
  return rows.length > 0;
}

export async function setStatus(env: Env, id: string, status: ContentStatus): Promise<boolean> {
  const rows = await query(getSql(env), "UPDATE services SET status = $1 WHERE id = $2 RETURNING id", [
    status,
    id,
  ]);
  return rows.length > 0;
}

export async function remove(env: Env, id: string): Promise<boolean> {
  const rows = await query(getSql(env), "DELETE FROM services WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}
