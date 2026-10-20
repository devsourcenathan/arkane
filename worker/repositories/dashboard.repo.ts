import type { Env } from "../types";
import { getSql, query, queryOne } from "../db/client";
import type { DashboardDTO, OrderStatus, PaymentStatus } from "@shared/types";

export async function getDashboard(env: Env): Promise<DashboardDTO> {
  const sql = getSql(env);

  const counts = await queryOne<{
    projects: number;
    artists: number;
    team: number;
    services: number;
    products: number;
    orders_pending: number;
    messages_new: number;
  }>(
    sql,
    `SELECT
       (SELECT count(*) FROM projects)::int AS projects,
       (SELECT count(*) FROM artists)::int AS artists,
       (SELECT count(*) FROM team_members)::int AS team,
       (SELECT count(*) FROM services)::int AS services,
       (SELECT count(*) FROM products)::int AS products,
       (SELECT count(*) FROM orders WHERE order_status = 'pending')::int AS orders_pending,
       (SELECT count(*) FROM contact_messages WHERE status = 'new')::int AS messages_new`,
  );

  const lowStock = await query<{ product_name: string; sku: string; label: string; stock: number }>(
    sql,
    `SELECT p.name AS product_name, v.sku,
            NULLIF(trim(both ' / ' FROM concat_ws(' / ', NULLIF(v.option_size,''), NULLIF(v.option_color,''))), '') AS label,
            v.stock
     FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE v.status = 'active' AND v.stock <= 3
     ORDER BY v.stock ASC, p.name ASC
     LIMIT 10`,
  );

  const recentOrders = await query<{
    id: string;
    reference: string;
    customer_name: string;
    total_xaf: number;
    order_status: OrderStatus;
    payment_status: PaymentStatus;
    created_at: string;
  }>(
    sql,
    `SELECT id, reference, customer_name, total_xaf, order_status, payment_status, created_at
     FROM orders ORDER BY created_at DESC LIMIT 6`,
  );

  return {
    counts: {
      projects: counts?.projects ?? 0,
      artists: counts?.artists ?? 0,
      team: counts?.team ?? 0,
      services: counts?.services ?? 0,
      products: counts?.products ?? 0,
      ordersPending: counts?.orders_pending ?? 0,
      messagesNew: counts?.messages_new ?? 0,
    },
    lowStock: lowStock.map((r) => ({
      productName: r.product_name,
      sku: r.sku,
      label: r.label ?? "Standard",
      stock: r.stock,
    })),
    recentOrders: recentOrders.map((r) => ({
      id: r.id,
      reference: r.reference,
      customerName: r.customer_name,
      totalXaf: r.total_xaf,
      orderStatus: r.order_status,
      paymentStatus: r.payment_status,
      createdAt: r.created_at,
    })),
  };
}
