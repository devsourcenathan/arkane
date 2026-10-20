import { Link, useParams } from "react-router-dom";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useDocumentMeta } from "@/lib/seo";
import { useLang } from "@/app/providers/LanguageProvider";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { SmartImage } from "@/components/ui/SmartImage";
import { ProjectCard } from "@/components/cards/ProjectCard";
import type { ArtistDetailDTO } from "@shared/types";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  spotify: "Spotify",
  appleMusic: "Apple Music",
  tiktok: "TikTok",
  x: "X",
};

export default function ArtistDetailPage() {
  const { slug = "" } = useParams();
  const { t, lang } = useLang();
  const { data, loading, error, reload } = useApi(
    () => api.get<ArtistDetailDTO>(`/artists/${encodeURIComponent(slug)}`),
    [slug, lang],
  );

  useDocumentMeta({
    title: data?.name,
    description: data?.bio?.slice(0, 180) || data?.roleTitle,
    image: data?.portrait?.url ?? null,
    type: "profile",
  });

  if (loading) return <LoadingState label={t("Chargement…", "Loading…")} />;
  if (error) {
    const notFound = error instanceof ApiClientError && error.status === 404;
    return (
      <div className="container-page py-32">
        <ErrorState
          message={notFound ? t("Cet artiste est introuvable.", "This artist could not be found.") : t("Impossible de charger le profil.", "Couldn't load the profile.")}
          onRetry={notFound ? undefined : reload}
        />
        <div className="mt-6 text-center">
          <Link to="/artistes" className="btn-outline">
            ← {t("Tous les artistes", "All artists")}
          </Link>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const socials = Object.entries(data.socials).filter(([, url]) => url);

  return (
    <div className="container-page pt-24 md:pt-28">
      <Link to="/artistes" className="text-sm text-fg-muted transition-colors hover:text-fg">
        ← {t("Artistes", "Artists")}
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div className="md:sticky md:top-28 md:self-start">
          <div className="overflow-hidden rounded-lg border border-border">
            <SmartImage media={data.portrait} alt={data.name} aspect="portrait" priority />
          </div>
        </div>

        <div>
          <h1 className="font-display text-[clamp(2rem,5vw,4rem)] font-black leading-[0.98] tracking-tightest">
            {data.name}
          </h1>
          {data.roleTitle && <p className="mt-3 text-lg text-fg-muted">{data.roleTitle}</p>}

          {data.bio && (
            <div className="mt-7 max-w-prose whitespace-pre-line text-base leading-relaxed text-fg-muted">
              {data.bio}
            </div>
          )}

          {socials.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {socials.map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline px-4 py-2 text-sm"
                >
                  {SOCIAL_LABELS[key] ?? key} ↗
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.projects.length > 0 && (
        <section className="mt-20 border-t border-border py-16">
          <h2 className="font-display text-2xl font-extrabold tracking-tightest md:text-3xl">{t("Productions", "Productions")}</h2>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {data.projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
