// @vitest-environment node
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../worker/lib/password";
// @ts-expect-error — module JS sans types (miroir Node du hachage).
import { hashPassword as hashNode, verifyPassword as verifyNode } from "../scripts/_crypto.mjs";

describe("hachage de mot de passe (PBKDF2)", () => {
  it("round-trip : vérifie le bon mot de passe, rejette le mauvais", async () => {
    const stored = await hashPassword("M0tDeP@sseFort!");
    expect(await verifyPassword("M0tDeP@sseFort!", stored)).toBe(true);
    expect(await verifyPassword("mauvais", stored)).toBe(false);
  });

  it("format attendu pbkdf2$SHA-256$120000$...", async () => {
    const stored = await hashPassword("abc");
    const parts = stored.split("$");
    expect(parts[0]).toBe("pbkdf2");
    expect(parts[1]).toBe("SHA-256");
    expect(parts[2]).toBe("100000");
    expect(parts).toHaveLength(5);
  });

  it("compatibilité Worker <-> script Node (hachages interchangeables)", async () => {
    const pwd = "Pâss-wörd-123";
    const fromNode = await hashNode(pwd);
    expect(await verifyPassword(pwd, fromNode)).toBe(true);

    const fromWorker = await hashPassword(pwd);
    expect(await verifyNode(pwd, fromWorker)).toBe(true);
  });
});
