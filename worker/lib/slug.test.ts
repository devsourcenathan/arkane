import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("met en minuscules et remplace les espaces", () => {
    expect(slugify("Mon Projet")).toBe("mon-projet");
  });
  it("retire les accents", () => {
    expect(slugify("Été à Yaoundé")).toBe("ete-a-yaounde");
  });
  it("supprime les caractères spéciaux", () => {
    expect(slugify("L'Album #1 !!!")).toBe("l-album-1");
  });
  it("gère une chaîne vide", () => {
    expect(slugify("   ")).toBe("element");
  });
});
