import { describe, it, expect } from "vitest";
import { buildWhatsappUrl, buildOrderMessage } from "./whatsapp";

describe("buildWhatsappUrl", () => {
  it("construit une URL wa.me", () => {
    expect(buildWhatsappUrl("237690000000", "salut")).toBe("https://wa.me/237690000000?text=salut");
  });
  it("nettoie le numéro (retire +, espaces)", () => {
    expect(buildWhatsappUrl("+237 690 00 00 00", "x")).toContain("wa.me/23769000000");
  });
  it("renvoie null sans numéro", () => {
    expect(buildWhatsappUrl("", "x")).toBeNull();
  });
});

describe("buildOrderMessage", () => {
  it("inclut la référence et le total", () => {
    const msg = buildOrderMessage({
      reference: "ARK-ABCD1234",
      studioName: "Arkane",
      totalXaf: 30000,
      items: [
        { id: "1", productName: "Tee", variantLabel: "L", sku: "S1", unitPriceXaf: 15000, quantity: 2, lineTotalXaf: 30000 },
      ],
    });
    expect(msg).toContain("ARK-ABCD1234");
    expect(msg).toContain("Tee");
    expect(msg).toMatch(/30\s?000\s?FCFA/);
  });
});
