import { describe, it, expect } from "vitest";
import { buildOrderDraft, aggregateQuantities, type VariantPricing } from "./order-pricing";
import type { OrderItemInput } from "@shared/validation";

function variant(over: Partial<VariantPricing> & Pick<VariantPricing, "id">): VariantPricing {
  return {
    sku: "SKU-1",
    productName: "T-shirt Arkane",
    label: "L / Noir",
    effectivePrice: 10_000,
    stock: 5,
    orderable: true,
    ...over,
  };
}

function map(...variants: VariantPricing[]): Map<string, VariantPricing> {
  return new Map(variants.map((v) => [v.id, v]));
}

describe("buildOrderDraft", () => {
  it("rejette un panier vide", () => {
    const res = buildOrderDraft([], map());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("empty");
  });

  it("calcule le total à partir du prix SERVEUR (un prix client est impossible à injecter)", () => {
    // Le payload ne contient que variantId + quantity : aucun prix ne vient du client.
    const items: OrderItemInput[] = [{ variantId: "v1", quantity: 3 }];
    const res = buildOrderDraft(items, map(variant({ id: "v1", effectivePrice: 7_500, stock: 10 })));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.lines[0].unitPriceXaf).toBe(7_500);
      expect(res.lines[0].lineTotalXaf).toBe(22_500);
      expect(res.subtotalXaf).toBe(22_500);
      expect(res.totalXaf).toBe(22_500);
    }
  });

  it("refuse une variante introuvable", () => {
    const res = buildOrderDraft([{ variantId: "ghost", quantity: 1 }], map());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("variant_not_found");
  });

  it("refuse une variante indisponible (inactive ou produit non publié)", () => {
    const res = buildOrderDraft(
      [{ variantId: "v1", quantity: 1 }],
      map(variant({ id: "v1", orderable: false })),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("variant_unavailable");
  });

  it("refuse un stock insuffisant et renvoie le disponible", () => {
    const res = buildOrderDraft(
      [{ variantId: "v1", quantity: 9 }],
      map(variant({ id: "v1", stock: 4 })),
    );
    expect(res.ok).toBe(false);
    if (!res.ok && res.code === "insufficient_stock") {
      expect(res.requested).toBe(9);
      expect(res.available).toBe(4);
    } else {
      throw new Error("attendu insufficient_stock");
    }
  });

  it("agrège les quantités en double avant de vérifier le stock", () => {
    const quantities = aggregateQuantities([
      { variantId: "v1", quantity: 2 },
      { variantId: "v1", quantity: 2 },
    ]);
    expect(quantities.get("v1")).toBe(4);

    // 3 + 3 = 6 > stock 5 -> refus malgré deux lignes de 3.
    const res = buildOrderDraft(
      [
        { variantId: "v1", quantity: 3 },
        { variantId: "v1", quantity: 3 },
      ],
      map(variant({ id: "v1", stock: 5 })),
    );
    expect(res.ok).toBe(false);
  });

  it("construit des snapshots corrects (nom, variante, SKU, prix)", () => {
    const res = buildOrderDraft(
      [{ variantId: "v1", quantity: 2 }],
      map(
        variant({
          id: "v1",
          sku: "ARK-TS-L-BLK",
          productName: "Hoodie Arkane",
          label: "L / Noir",
          effectivePrice: 25_000,
          stock: 3,
        }),
      ),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.lines[0]).toMatchObject({
        sku: "ARK-TS-L-BLK",
        productName: "Hoodie Arkane",
        variantLabel: "L / Noir",
        unitPriceXaf: 25_000,
        quantity: 2,
        lineTotalXaf: 50_000,
      });
    }
  });

  it("additionne plusieurs lignes distinctes", () => {
    const res = buildOrderDraft(
      [
        { variantId: "v1", quantity: 1 },
        { variantId: "v2", quantity: 2 },
      ],
      map(
        variant({ id: "v1", effectivePrice: 10_000, stock: 5 }),
        variant({ id: "v2", effectivePrice: 5_000, stock: 5 }),
      ),
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.totalXaf).toBe(20_000);
  });
});
