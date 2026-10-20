import type { Env } from "../types";
import { getSql, query, queryOne } from "../db/client";
import { toMediaDTO, type MediaRow } from "../lib/media-url";
import { offset, paginated } from "../lib/http";
import { localized, type I18nBag, type Lang } from "@shared/i18n";
import type { TeamMemberDTO, Paginated, ContentStatus } from "@shared/types";
import type { TeamMemberInput } from "@shared/validation";

interface TeamRow {
  id: string;
  name: string;
  role_title: string;
  bio: string;
  status: ContentStatus;
  sort_order: number;
  photo_media_id?: string | null;
  photo: MediaRow | null;
  i18n: I18nBag;
}

const PHOTO_JSON = "(SELECT to_jsonb(m) FROM media m WHERE m.id = t.photo_media_id) AS photo";

function toDTO(env: Env, r: TeamRow, lang: Lang): TeamMemberDTO {
  return {
    id: r.id,
    name: r.name,
    roleTitle: localized(r.role_title, r.i18n, lang, "roleTitle"),
    bio: localized(r.bio, r.i18n, lang, "bio"),
    photo: toMediaDTO(env, r.photo),
  };
}

export async function listPublic(env: Env, lang: Lang): Promise<TeamMemberDTO[]> {
  const rows = await query<TeamRow>(
    getSql(env),
    `SELECT t.id, t.name, t.role_title, t.bio, t.status, t.sort_order, t.i18n, ${PHOTO_JSON}
     FROM team_members t WHERE t.status = 'published' ORDER BY t.sort_order ASC, t.name ASC`,
  );
  return rows.map((r) => toDTO(env, r, lang));
}

export async function adminList(
  env: Env,
  opts: { page: number; pageSize: number; status?: string },
): Promise<Paginated<TeamMemberDTO & { status: ContentStatus }>> {
  const sql = getSql(env);
  const conds: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    params.push(opts.status);
    conds.push(`t.status = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  params.push(opts.pageSize, offset(opts.page, opts.pageSize));
  const rows = await query<TeamRow>(
    sql,
    `SELECT t.id, t.name, t.role_title, t.bio, t.status, t.sort_order, t.i18n, ${PHOTO_JSON}
     FROM team_members t ${where} ORDER BY t.sort_order ASC, t.name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const totalRow = await queryOne<{ count: string }>(
    sql,
    `SELECT count(*)::text AS count FROM team_members t ${where}`,
    params.slice(0, conds.length),
  );
  const items = rows.map((r) => ({ ...toDTO(env, r, "fr"), status: r.status }));
  return paginated(items, opts.page, opts.pageSize, Number(totalRow?.count ?? 0));
}

export async function adminGet(env: Env, id: string) {
  const r = await queryOne<TeamRow>(
    getSql(env),
    `SELECT t.id, t.name, t.role_title, t.bio, t.status, t.sort_order, t.photo_media_id, t.i18n, ${PHOTO_JSON}
     FROM team_members t WHERE t.id = $1 LIMIT 1`,
    [id],
  );
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    roleTitle: r.role_title,
    bio: r.bio,
    photoMediaId: r.photo_media_id ?? null,
    photo: toMediaDTO(env, r.photo),
    status: r.status,
    sortOrder: r.sort_order,
    i18n: r.i18n ?? {},
  };
}

export async function create(env: Env, input: TeamMemberInput): Promise<string> {
  const rows = await query<{ id: string }>(
    getSql(env),
    `INSERT INTO team_members (name, role_title, bio, photo_media_id, status, sort_order, i18n)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id`,
    [
      input.name,
      input.roleTitle ?? "",
      input.bio ?? "",
      input.photoMediaId ?? null,
      input.status,
      input.sortOrder ?? 0,
      JSON.stringify(input.i18n ?? {}),
    ],
  );
  return rows[0].id;
}

export async function update(env: Env, id: string, input: TeamMemberInput): Promise<boolean> {
  const rows = await query<{ id: string }>(
    getSql(env),
    `UPDATE team_members SET name=$1, role_title=$2, bio=$3, photo_media_id=$4, status=$5,
       sort_order=$6, i18n=$7::jsonb WHERE id=$8 RETURNING id`,
    [
      input.name,
      input.roleTitle ?? "",
      input.bio ?? "",
      input.photoMediaId ?? null,
      input.status,
      input.sortOrder ?? 0,
      JSON.stringify(input.i18n ?? {}),
      id,
    ],
  );
  return rows.length > 0;
}

export async function remove(env: Env, id: string): Promise<boolean> {
  const rows = await query(getSql(env), "DELETE FROM team_members WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}
