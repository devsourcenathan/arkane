import { Link, useParams } from "react-router-dom";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useDocumentMeta } from "@/lib/seo";
import { useLang } from "@/app/providers/LanguageProvider";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { SmartImage } from "@/components/ui/SmartImage";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import type { ProjectDetailDTO } from "@shared/types";

export default function ProductionDetailPage() {
  const { slug = "" } = useParams();
  const { t, lang } = useLang();
  const { data, loading, error, reload } = useApi(
    () => api.get<ProjectDetailDTO>(`/projects/${encodeURIComponent(slug)}`),
    [slug, lang],
  );

  useDocumentMeta({
    title: data?.title,
    description: data?.description?.slice(0, 180),
    image: data?.cover?.url ?? null,
    type: "article",
  });

  if (loading) return <LoadingState label={t("Chargement…", "Loading…")} />;
  if (error) {
    const notFound = error instanceof ApiClientError && error.status === 404;
    return (
      <div className="container-page py-32">
        <ErrorState
          message={notFound ? t("Cette production est introuvable.", "This production could not be found.") : t("Impossible de charger la production.", "Couldn't load the production.")}
          onRetry={notFound ? undefined : reload}
        />
        <div className="mt-6 text-center">
          <Link to="/productions" className="btn-outline">
            ← {t("Toutes les productions", "All productions")}
          </Link>
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <article className="pt-24 md:pt-28">
      <div className="container-page">
        <Link to="/productions" className="text-sm text-fg-muted transition-colors hover:text-fg">
          ← {t("Productions", "Productions")}
        </Link>
        <header className="mt-6 max-w-4xl">
          {data.category && <p className="eyebrow">{data.category}</p>}
          <h1 className="mt-4 font-display text-[clamp(2rem,5vw,4.5rem)] font-black leading-[0.98] tracking-tightest">
            {data.title}
          </h1>
          {data.artists.length > 0 && (
            <p className="mt-4 text-lg text-fg-muted">
              {data.artists.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ", "}
                  <Link to={`/artistes/${a.slug}`} className="transition-colors hover:text-fg">
                    {a.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </header>
      </div>

      {data.videoUrl ? (
        <div className="container-page mt-10">
          <VideoEmbed url={data.videoUrl} title={data.title} />
        </div>
      ) : (
        data.cover && (
          <div className="container-page mt-10">
            <div className="overflow-hidden rounded-lg border border-border">
              <SmartImage media={data.cover} alt={data.title} aspect="wide" priority />
            </div>
          </div>
        )
      )}

      {data.description && (
        <div className="container-page mt-12 pb-20">
          <div className="max-w-prose whitespace-pre-line text-base leading-relaxed text-fg-muted md:text-lg">
            {data.description}
          </div>
        </div>
      )}
    </article>
  );
}
