import type { Env } from "../types";
import { getSql, query, withTransaction, type PoolClient, type WaitUntilCtx } from "../db/client";
import { ApiError } from "../lib/errors";
import { generateOrderReference, generateToken, sha256Hex } from "../lib/token";
import { buildOrderDraft, type VariantPricing } from "./order-pricing";
import { variantLabel } from "../repositories/products.repo";
import { getById, getByReference, toOrderDTO } from "../repositories/orders.repo";
import type { CreateOrderInput, UpdateOrderStatusInput } from "@shared/validation";
import type { OrderCreatedDTO, OrderDTO, OrderItemDTO, OrderPublicDTO } from "@shared/types";

interface VariantDbRow {
  id: string;
  sku: string;
  option_size: string;
  option_color: string;
  price_xaf: number | null;
  stock: number;
  v_status: "active" | "inactive";
  product_name: string;
  base_price_xaf: number;
  p_status: string;
}

export async function createOrder(
  env: Env,
  ctx: WaitUntilCtx | undefined,
  input: CreateOrderInput,
): Promise<OrderCreatedDTO> {
  const variantIds = Array.from(new Set(input.items.map((i) => i.variantId)));

  return withTransaction(env, ctx, async (client) => {
    // 1. Verrouille et relit les variantes depuis la base (prix + stock = source de vérité).
    const res = await client.query(
      `SELECT v.id, v.sku, v.option_size, v.option_color, v.price_xaf, v.stock,
              v.status AS v_status, p.name AS product_name, p.base_price_xaf, p.status AS p_status
       FROM product_variants v JOIN products p ON p.id = v.product_id
       WHERE v.id = ANY($1::uuid[]) FOR UPDATE OF v`,
      [variantIds],
    );
    const rows = res.rows as VariantDbRow[];
    const map = new Map<string, VariantPricing>();
    for (const r of rows) {
      map.set(r.id, {
        id: r.id,
        sku: r.sku,
        productName: r.product_name,
        label: variantLabel(r.option_size, r.option_color),
        effectivePrice: r.price_xaf ?? r.base_price_xaf,
        stock: r.stock,
        orderable: r.v_status === "active" && r.p_status === "published",
      });
    }

    // 2. Calcule et valide (prix serveur, stock) — logique pure.
    const draft = buildOrderDraft(input.items, map);
    if (!draft.ok) {
      if (draft.code === "insufficient_stock") {
        throw ApiError.insufficientStock(draft.message, {
          variantId: draft.variantId,
          requested: draft.requested,
          available: draft.available,
        });
      }
      throw ApiError.badRequest(draft.message, { code: draft.code });
    }

    // 3. Décrémente le stock sous contrainte (sécurité anti-course, déjà verrouillé).
    for (const line of draft.lines) {
      const upd = await client.query(
        "UPDATE product_variants SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING id",
        [line.quantity, line.variantId],
      );
      if (upd.rows.length === 0) {
        throw ApiError.insufficientStock("Stock insuffisant (mise à jour concurrente).", {
          variantId: line.variantId,
        });
      }
    }

    // 4. Référence non prédictible + jeton de consultation.
    const reference = await uniqueReference(client);
    const lookupToken = generateToken(24);
    const lookupHash = await sha256Hex(lookupToken);

    const settings = await client.query("SELECT whatsapp_number FROM site_settings WHERE id = 1");
    const whatsappNumber = (settings.rows[0]?.whatsapp_number as string) ?? "";

    // 5. Crée la commande (statut 'pending' / paiement 'unpaid' — JAMAIS payé auto).
    const orderRes = await client.query(
      `INSERT INTO orders
         (reference, lookup_token_hash, customer_name, customer_phone, customer_email, customer_note,
          whatsapp_snapshot, subtotal_xaf, total_xaf, order_status, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending','unpaid') RETURNING id`,
      [
        reference,
        lookupHash,
        input.customer.name,
        input.customer.phone,
        input.customer.email || null,
        input.customer.note ?? "",
        whatsappNumber,
        draft.subtotalXaf,
        draft.totalXaf,
      ],
    );
    const orderId = orderRes.rows[0].id as string;

    const items: OrderItemDTO[] = [];
    for (const line of draft.lines) {
      const itemRes = await client.query(
        `INSERT INTO order_items
           (order_id, product_variant_id, product_name, variant_label, sku, unit_price_xaf, quantity, line_total_xaf)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          orderId,
          line.variantId,
          line.productName,
          line.variantLabel,
          line.sku,
          line.unitPriceXaf,
          line.quantity,
          line.lineTotalXaf,
        ],
      );
      items.push({
        id: itemRes.rows[0].id as string,
        productName: line.productName,
        variantLabel: line.variantLabel,
        sku: line.sku,
        unitPriceXaf: line.unitPriceXaf,
        quantity: line.quantity,
        lineTotalXaf: line.lineTotalXaf,
      });
    }

    return {
      reference,
      lookupToken,
      totalXaf: draft.totalXaf,
      currency: "XAF",
      whatsappNumber,
      items,
    };
  });
}

async function uniqueReference(client: PoolClient): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const ref = generateOrderReference();
    const exists = await client.query("SELECT 1 FROM orders WHERE reference = $1 LIMIT 1", [ref]);
    if (exists.rows.length === 0) return ref;
  }
  // Extrêmement improbable : suffixe additionnel.
  return `${generateOrderReference()}-${generateToken(3)}`;
}

/**
 * Met à jour le statut d'une commande.
 * - Passage à 'cancelled' : libère le stock (une seule fois, flag stock_released).
 * - Passage à 'confirmed' : renseigne confirmed_at.
 * - Le statut de paiement est purement manuel (jamais 'paid' automatiquement).
 */
export async function updateOrderStatus(
  env: Env,
  ctx: WaitUntilCtx | undefined,
  id: string,
  input: UpdateOrderStatusInput,
): Promise<OrderDTO> {
  const current = await getById(env, id);
  if (!current) throw ApiError.notFound("Commande introuvable.");

  const willCancel =
    input.orderStatus === "cancelled" && current.order_status !== "cancelled" && !current.stock_released;

  if (willCancel) {
    await withTransaction(env, ctx, async (client) => {
      // Réapprovisionne le stock des variantes encore existantes.
      for (const item of current.items ?? []) {
        if (item.product_variant_id) {
          await client.query(
            "UPDATE product_variants SET stock = stock + $1 WHERE id = $2",
            [item.quantity, item.product_variant_id],
          );
        }
      }
      await client.query(
        `UPDATE orders SET
           order_status = 'cancelled',
           stock_released = true,
           cancelled_at = now(),
           payment_status = COALESCE($2, payment_status),
           internal_notes = COALESCE($3, internal_notes)
         WHERE id = $1`,
        [id, input.paymentStatus ?? null, input.internalNotes ?? null],
      );
    });
  } else {
    const confirming = input.orderStatus === "confirmed";
    await query(
      getSql(env),
      `UPDATE orders SET
         order_status = COALESCE($2, order_status),
         payment_status = COALESCE($3, payment_status),
         internal_notes = COALESCE($4, internal_notes),
         confirmed_at = CASE WHEN $5 AND confirmed_at IS NULL THEN now() ELSE confirmed_at END
       WHERE id = $1`,
      [id, input.orderStatus ?? null, input.paymentStatus ?? null, input.internalNotes ?? null, confirming],
    );
  }

  const updated = await getById(env, id);
  const dto = toOrderDTO(updated!);
  return { ...dto, internalNotes: updated!.internal_notes } as OrderDTO & { internalNotes: string };
}

/** Consultation publique par référence + jeton (sans notes internes ni données d'autrui). */
export async function getPublicOrder(
  env: Env,
  reference: string,
  token: string,
): Promise<OrderPublicDTO> {
  const row = await getByReference(env, reference);
  if (!row) throw ApiError.notFound("Commande introuvable.");

  const tokenHash = await sha256Hex(token);
  // Comparaison directe du hash (le jeton est un secret aléatoire de 24 octets).
  if (tokenHash !== row.lookup_token_hash) {
    throw ApiError.notFound("Commande introuvable.");
  }

  const dto = toOrderDTO(row);
  return {
    reference: dto.reference,
    customerName: dto.customerName,
    totalXaf: dto.totalXaf,
    currency: dto.currency,
    orderStatus: dto.orderStatus,
    paymentStatus: dto.paymentStatus,
    items: dto.items,
    createdAt: dto.createdAt,
    whatsappNumber: row.whatsapp_snapshot,
  };
}
