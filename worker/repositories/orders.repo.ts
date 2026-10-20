import type { Env } from "../types";
import { getSql, query, queryOne } from "../db/client";
import { offset, paginated } from "../lib/http";
import type { OrderDTO, OrderItemDTO, Paginated, OrderStatus, PaymentStatus } from "@shared/types";

interface OrderRow {
  id: string;
  reference: string;
  lookup_token_hash: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_note: string;
  whatsapp_snapshot: string;
  subtotal_xaf: number;
  total_xaf: number;
  currency: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  internal_notes: string;
  stock_released: boolean;
  created_at: string;
  items: ItemRow[];
}

interface ItemRow {
  id: string;
  product_variant_id: string | null;
  product_name: string;
  variant_label: string;
  sku: string;
  unit_price_xaf: number;
  quantity: number;
  line_total_xaf: number;
}

const ITEMS_JSON = `COALESCE((
  SELECT json_agg(to_jsonb(oi) ORDER BY oi.product_name)
  FROM order_items oi WHERE oi.order_id = o.id
), '[]'::json) AS items`;

function toItems(items: ItemRow[]): OrderItemDTO[] {
  return (items ?? []).map((i) => ({
    id: i.id,
    productName: i.product_name,
    variantLabel: i.variant_label,
    sku: i.sku,
    unitPriceXaf: i.unit_price_xaf,
    quantity: i.quantity,
    lineTotalXaf: i.line_total_xaf,
  }));
}

export function toOrderDTO(r: OrderRow): OrderDTO {
  return {
    id: r.id,
    reference: r.reference,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    customerNote: r.customer_note,
    subtotalXaf: r.subtotal_xaf,
    totalXaf: r.total_xaf,
    currency: r.currency,
    orderStatus: r.order_status,
    paymentStatus: r.payment_status,
    items: toItems(r.items),
    createdAt: r.created_at,
  };
}

export interface AdminOrderListItem {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  totalXaf: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  itemCount: number;
  createdAt: string;
}

export async function adminList(
  env: Env,
  opts: { page: number; pageSize: number; orderStatus?: string; paymentStatus?: string; search?: string },
): Promise<Paginated<AdminOrderListItem>> {
  const sql = getSql(env);
  const conds: string[] = [];
  const params: unknown[] = [];
  if (opts.orderStatus) {
    params.push(opts.orderStatus);
    conds.push(`o.order_status = $${params.length}`);
  }
  if (opts.paymentStatus) {
    params.push(opts.paymentStatus);
    conds.push(`o.payment_status = $${params.length}`);
  }
  if (opts.search) {
    params.push(`%${opts.search}%`);
    conds.push(`(o.reference ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR o.customer_phone ILIKE $${params.length})`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  params.push(opts.pageSize, offset(opts.page, opts.pageSize));

  const rows = await query<{
    id: string;
    reference: string;
    customer_name: string;
    customer_phone: string;
    total_xaf: number;
    currency: string;
    order_status: OrderStatus;
    payment_status: PaymentStatus;
    item_count: number;
    created_at: string;
  }>(
    sql,
    `SELECT o.id, o.reference, o.customer_name, o.customer_phone, o.total_xaf, o.currency,
            o.order_status, o.payment_status, o.created_at,
            (SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id)::int AS item_count
     FROM orders o ${where}
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const totalRow = await queryOne<{ count: string }>(
    sql,
    `SELECT count(*)::text AS count FROM orders o ${where}`,
    params.slice(0, conds.length),
  );
  const items = rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    totalXaf: r.total_xaf,
    currency: r.currency,
    orderStatus: r.order_status,
    paymentStatus: r.payment_status,
    itemCount: Number(r.item_count),
    createdAt: r.created_at,
  }));
  return paginated(items, opts.page, opts.pageSize, Number(totalRow?.count ?? 0));
}

export async function getById(env: Env, id: string): Promise<OrderRow | null> {
  return queryOne<OrderRow>(
    getSql(env),
    `SELECT o.*, ${ITEMS_JSON} FROM orders o WHERE o.id = $1 LIMIT 1`,
    [id],
  );
}

export async function getByReference(env: Env, reference: string): Promise<OrderRow | null> {
  return queryOne<OrderRow>(
    getSql(env),
    `SELECT o.*, ${ITEMS_JSON} FROM orders o WHERE o.reference = $1 LIMIT 1`,
    [reference],
  );
}

export async function adminGet(env: Env, id: string): Promise<OrderDTO | null> {
  const row = await getById(env, id);
  if (!row) return null;
  const dto = toOrderDTO(row);
  return { ...dto, internalNotes: row.internal_notes } as OrderDTO & { internalNotes: string };
}

export type { OrderRow };
export { toItems };
