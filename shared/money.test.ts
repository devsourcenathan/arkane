import { describe, it, expect } from "vitest";
import { formatXAF } from "./money";

describe("formatXAF", () => {
  it("formate un entier en FCFA", () => {
    expect(formatXAF(25000)).toMatch(/25\s?000\s?FCFA/);
  });
  it("gère zéro", () => {
    expect(formatXAF(0)).toMatch(/0\s?FCFA/);
  });
  it("arrondit les valeurs non entières", () => {
    expect(formatXAF(1500.6)).toMatch(/1\s?501\s?FCFA/);
  });
});
