import { useState } from "react";
import { api, qs } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useDocumentMeta } from "@/lib/seo";
import { useLang } from "@/app/providers/LanguageProvider";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { Reveal } from "@/components/motion/Reveal";
import { ProjectCard } from "@/components/cards/ProjectCard";
import type { Paginated, ProjectSummaryDTO } from "@shared/types";

const PAGE_SIZE = 12;

export default function ProductionsPage() {
  const { t, lang } = useLang();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | null>(null);

  useDocumentMeta({
    title: t("Productions", "Productions"),
    description: t("Le catalogue des productions d'Arkane Production.", "The Arkane Production catalogue."),
  });

  const categories = useApi(() => api.get<string[]>("/project-categories"), []);
  const list = useApi(
    () => api.get<Paginated<ProjectSummaryDTO>>(`/projects${qs({ page, pageSize: PAGE_SIZE, category: category ?? undefined })}`),
    [page, category, lang],
  );

  const onCategory = (value: string | null) => {
    setCategory(value);
    setPage(1);
  };

  return (
    <div className="container-page pt-28 md:pt-36">
      <p className="eyebrow">{t("Catalogue", "Catalogue")}</p>
      <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,5vw,4.5rem)] font-black leading-[0.98] tracking-tightest">
        {t("Productions", "Productions")}
      </h1>

      {categories.data && categories.data.length > 0 && (
        <div className="mt-10">
          <FilterBar options={categories.data} active={category} onChange={onCategory} allLabel={t("Toutes", "All")} />
        </div>
      )}

      <div className="mt-10 pb-8">
        {list.loading && <LoadingState label={t("Chargement…", "Loading…")} />}
        {list.error && <ErrorState message={t("Impossible de charger les productions.", "Couldn't load productions.")} onRetry={list.reload} />}
        {list.data && list.data.items.length === 0 && (
          <EmptyState title={t("Aucune production", "No productions")} description={t("Revenez bientôt pour découvrir nos projets.", "Check back soon for our projects.")} />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
              {list.data.items.map((p, i) => (
                <Reveal key={p.id} delayMs={(i % 4) * 60}>
                  <ProjectCard project={p} />
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
