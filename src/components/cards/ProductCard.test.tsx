import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProductCard } from "./ProductCard";
import { LanguageProvider } from "@/app/providers/LanguageProvider";
import type { ProductSummaryDTO } from "@shared/types";

beforeEach(() => {
  // Langue figée en français pour des assertions déterministes.
  try {
    localStorage.setItem("arkane_lang", "fr");
  } catch {
    /* ignore */
  }
});

function renderCard(over: Partial<ProductSummaryDTO> = {}) {
  const product: ProductSummaryDTO = {
    id: "p1",
    slug: "tee-arkane",
    name: "Tee Arkane",
    category: "Vêtements",
    cover: null,
    fromPriceXaf: 15000,
    inStock: true,
    ...over,
  };
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

describe("ProductCard", () => {
  it("affiche le nom et le prix", () => {
    renderCard();
    expect(screen.getByText("Tee Arkane")).toBeInTheDocument();
    expect(screen.getByText(/15\s?000\s?FCFA/)).toBeInTheDocument();
  });

  it("pointe vers la fiche produit", () => {
    renderCard();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/merch/tee-arkane");
  });

  it("affiche un badge « épuisé » quand hors stock (FR ou EN)", () => {
    renderCard({ inStock: false });
    expect(screen.getByText(/Épuisé|Sold out/)).toBeInTheDocument();
  });
});
