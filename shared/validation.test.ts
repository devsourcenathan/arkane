import { describe, it, expect } from "vitest";
import { contactSchema, createOrderSchema, siteSettingsSchema } from "./validation";

describe("contactSchema", () => {
  it("accepte un message valide", () => {
    const r = contactSchema.safeParse({
      name: "Jean",
      subject: "Projet clip",
      message: "Bonjour, j'aimerais discuter.",
      turnstileToken: "tok",
    });
    expect(r.success).toBe(true);
  });
  it("refuse un sujet manquant", () => {
    const r = contactSchema.safeParse({ name: "Jean", message: "Bonjour ici", turnstileToken: "tok" });
    expect(r.success).toBe(false);
  });
  it("refuse sans jeton anti-robot", () => {
    const r = contactSchema.safeParse({ name: "Jean", subject: "Sujet", message: "Bonjour ici" });
    expect(r.success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  it("accepte des items (variantId + quantity uniquement)", () => {
    const r = createOrderSchema.safeParse({
      items: [{ variantId: "550e8400-e29b-41d4-a716-446655440000", quantity: 2 }],
      customer: { name: "Awa", phone: "237690000000" },
      turnstileToken: "tok",
    });
    expect(r.success).toBe(true);
  });
  it("ignore tout prix fourni par le client (non présent dans le schéma)", () => {
    const r = createOrderSchema.safeParse({
      items: [{ variantId: "550e8400-e29b-41d4-a716-446655440000", quantity: 1, priceXaf: 1 }],
      customer: { name: "Awa", phone: "237690000000" },
      turnstileToken: "tok",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.items[0]).not.toHaveProperty("priceXaf");
    }
  });
  it("refuse un panier vide", () => {
    const r = createOrderSchema.safeParse({ items: [], customer: { name: "Awa", phone: "237690000000" }, turnstileToken: "t" });
    expect(r.success).toBe(false);
  });
});

describe("siteSettingsSchema", () => {
  it("refuse un numéro WhatsApp avec un +", () => {
    const base = {
      studioName: "Arkane",
      theme: "dark",
      palette: "default",
      seoDefaultTitle: "Arkane",
    };
    expect(siteSettingsSchema.safeParse({ ...base, whatsappNumber: "+237690000000" }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ ...base, whatsappNumber: "237690000000" }).success).toBe(true);
  });
});
