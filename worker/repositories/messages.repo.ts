import type { Env } from "../types";
import { getSql, query, queryOne } from "../db/client";
import { offset, paginated } from "../lib/http";
import type { ContactMessageDTO, Paginated, MessageStatus } from "@shared/types";

interface MessageRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: MessageStatus;
  created_at: string;
  read_at: string | null;
}

function toDTO(r: MessageRow): ContactMessageDTO {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    subject: r.subject,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
    readAt: r.read_at,
  };
}

export async function create(
  env: Env,
  input: { name: string; email: string; phone: string; subject: string; message: string; ip: string },
): Promise<void> {
  await query(
    getSql(env),
    `INSERT INTO contact_messages (name, email, phone, subject, message, ip)
     VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4, $5, $6)`,
    [input.name, input.email, input.phone, input.subject, input.message, input.ip],
  );
}

export async function adminList(
  env: Env,
  opts: { page: number; pageSize: number; status?: string },
): Promise<Paginated<ContactMessageDTO>> {
  const sql = getSql(env);
  const conds: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    params.push(opts.status);
    conds.push(`status = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  params.push(opts.pageSize, offset(opts.page, opts.pageSize));
  const rows = await query<MessageRow>(
    sql,
    `SELECT * FROM contact_messages ${where} ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const totalRow = await queryOne<{ count: string }>(
    sql,
    `SELECT count(*)::text AS count FROM contact_messages ${where}`,
    params.slice(0, conds.length),
  );
  return paginated(rows.map(toDTO), opts.page, opts.pageSize, Number(totalRow?.count ?? 0));
}

export async function getAndMarkRead(env: Env, id: string): Promise<ContactMessageDTO | null> {
  const row = await queryOne<MessageRow>(
    getSql(env),
    `UPDATE contact_messages
       SET status = CASE WHEN status = 'new' THEN 'read' ELSE status END,
           read_at = CASE WHEN read_at IS NULL THEN now() ELSE read_at END
     WHERE id = $1 RETURNING *`,
    [id],
  );
  return row ? toDTO(row) : null;
}

export async function updateStatus(env: Env, id: string, status: MessageStatus): Promise<boolean> {
  const rows = await query(
    getSql(env),
    "UPDATE contact_messages SET status = $1 WHERE id = $2 RETURNING id",
    [status, id],
  );
  return rows.length > 0;
}

export async function remove(env: Env, id: string): Promise<boolean> {
  const rows = await query(getSql(env), "DELETE FROM contact_messages WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}
