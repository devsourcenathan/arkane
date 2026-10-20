import { useState } from "react";
import { api, qs } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useDocumentMeta } from "@/lib/seo";
import { useLang } from "@/app/providers/LanguageProvider";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { Reveal } from "@/components/motion/Reveal";
import { ProductCard } from "@/components/cards/ProductCard";
import type { Paginated, ProductSummaryDTO } from "@shared/types";

const PAGE_SIZE = 12;

export default function MerchPage() {
  const { t, lang } = useLang();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | null>(null);

  useDocumentMeta({
    title: t("Boutique", "Shop"),
    description: t("Le merchandising officiel d'Arkane Production.", "Official Arkane Production merchandise."),
  });

  const categories = useApi(() => api.get<string[]>("/product-categories"), []);
  const list = useApi(
    () => api.get<Paginated<ProductSummaryDTO>>(`/products${qs({ page, pageSize: PAGE_SIZE, category: category ?? undefined })}`),
    [page, category, lang],
  );

  const onCategory = (value: string | null) => {
    setCategory(value);
    setPage(1);
  };

  return (
    <div className="container-page pt-28 md:pt-36">
      <p className="eyebrow">{t("Boutique", "Shop")}</p>
      <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,5vw,4.5rem)] font-black leading-[0.98] tracking-tightest">
        {t("Merchandising", "Merchandise")}
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-fg-muted">
        {t(
          "Pièces en édition limitée. Commande confirmée et finalisée via WhatsApp.",
          "Limited-edition pieces. Order confirmed and finalised via WhatsApp.",
        )}
      </p>

      {categories.data && categories.data.length > 0 && (
        <div className="mt-10">
          <FilterBar options={categories.data} active={category} onChange={onCategory} allLabel={t("Tout", "All")} />
        </div>
      )}

      <div className="mt-10 pb-8">
        {list.loading && <LoadingState label={t("Chargement…", "Loading…")} />}
        {list.error && <ErrorState message={t("Impossible de charger la boutique.", "Couldn't load the shop.")} onRetry={list.reload} />}
        {list.data && list.data.items.length === 0 && (
          <EmptyState title={t("Boutique en préparation", "Shop coming soon")} description={t("Les produits seront disponibles prochainement.", "Products will be available soon.")} />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
              {list.data.items.map((p, i) => (
                <Reveal key={p.id} delayMs={(i % 4) * 60}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
            <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
