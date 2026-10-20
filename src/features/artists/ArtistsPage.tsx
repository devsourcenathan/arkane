import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useDocumentMeta } from "@/lib/seo";
import { useLang } from "@/app/providers/LanguageProvider";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { Reveal } from "@/components/motion/Reveal";
import { ArtistCard } from "@/components/cards/ArtistCard";
import type { ArtistSummaryDTO } from "@shared/types";

export default function ArtistsPage() {
  const { t, lang } = useLang();
  const { data, loading, error, reload } = useApi(() => api.get<ArtistSummaryDTO[]>("/artists"), [lang]);
  useDocumentMeta({
    title: t("Artistes", "Artists"),
    description: t("Les artistes accompagnés par Arkane Production.", "The artists supported by Arkane Production."),
  });

  return (
    <div className="container-page pt-28 md:pt-36">
      <p className="eyebrow">{t("Talents", "Talent")}</p>
      <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,5vw,4.5rem)] font-black leading-[0.98] tracking-tightest">
        {t("Nos artistes", "Our artists")}
      </h1>

      <div className="mt-14 pb-16">
        {loading && <LoadingState label={t("Chargement…", "Loading…")} />}
        {error && <ErrorState message={t("Impossible de charger les artistes.", "Couldn't load artists.")} onRetry={reload} />}
        {data && data.length === 0 && (
          <EmptyState title={t("Bientôt", "Soon")} description={t("Les profils d'artistes seront publiés prochainement.", "Artist profiles will be published soon.")} />
        )}
        {data && data.length > 0 && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {data.map((artist, i) => (
              <Reveal key={artist.id} delayMs={(i % 4) * 60}>
                <ArtistCard artist={artist} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
