/**
 * Logique de tarification/validation d'une commande — PURE (sans I/O).
 * Facile à tester unitairement. Points clés de sécurité :
 *  - le prix unitaire provient TOUJOURS des données serveur (jamais du client) ;
 *  - un stock insuffisant rejette la commande ;
 *  - chaque ligne embarque un snapshot (nom, variante, SKU, prix).
 */
import type { OrderItemInput } from "@shared/validation";

export interface VariantPricing {
  id: string;
  sku: string;
  productName: string;
  label: string;
  /** Prix effectif (variante ou prix de base produit) — source serveur. */
  effectivePrice: number;
  stock: number;
  /** Variante active ET produit publié. */
  orderable: boolean;
}

export interface OrderDraftLine {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  unitPriceXaf: number;
  quantity: number;
  lineTotalXaf: number;
}

export type OrderDraftError =
  | { ok: false; code: "empty"; message: string }
  | { ok: false; code: "variant_not_found"; message: string; variantId: string }
  | { ok: false; code: "variant_unavailable"; message: string; variantId: string }
  | {
      ok: false;
      code: "insufficient_stock";
      message: string;
      variantId: string;
      requested: number;
      available: number;
    };

export type OrderDraftResult =
  | { ok: true; lines: OrderDraftLine[]; subtotalXaf: number; totalXaf: number }
  | OrderDraftError;

/** Agrège les quantités par variante (gère les doublons dans le panier). */
export function aggregateQuantities(items: OrderItemInput[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.variantId, (map.get(item.variantId) ?? 0) + item.quantity);
  }
  return map;
}

export function buildOrderDraft(
  items: OrderItemInput[],
  variants: Map<string, VariantPricing>,
): OrderDraftResult {
  if (items.length === 0) {
    return { ok: false, code: "empty", message: "Le panier est vide." };
  }

  const quantities = aggregateQuantities(items);
  const lines: OrderDraftLine[] = [];
  let subtotal = 0;

  for (const [variantId, quantity] of quantities) {
    const v = variants.get(variantId);
    if (!v) {
      return { ok: false, code: "variant_not_found", message: "Article introuvable.", variantId };
    }
    if (!v.orderable) {
      return {
        ok: false,
        code: "variant_unavailable",
        message: `« ${v.productName} » (${v.label}) n'est plus disponible.`,
        variantId,
      };
    }
    if (v.stock < quantity) {
      return {
        ok: false,
        code: "insufficient_stock",
        message: `Stock insuffisant pour « ${v.productName} » (${v.label}) : ${v.stock} restant(s).`,
        variantId,
        requested: quantity,
        available: v.stock,
      };
    }

    const unitPrice = v.effectivePrice; // source serveur
    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;
    lines.push({
      variantId,
      productName: v.productName,
      variantLabel: v.label,
      sku: v.sku,
      unitPriceXaf: unitPrice,
      quantity,
      lineTotalXaf: lineTotal,
    });
  }

  return { ok: true, lines, subtotalXaf: subtotal, totalXaf: subtotal };
}
