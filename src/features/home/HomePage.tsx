import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useDocumentMeta } from "@/lib/seo";
import { useSettings } from "@/app/providers/SettingsProvider";
import { useLang } from "@/app/providers/LanguageProvider";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/motion/Reveal";
import { Marquee } from "@/components/motion/Marquee";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { ArtistCard } from "@/components/cards/ArtistCard";
import { ProductCard } from "@/components/cards/ProductCard";
import type { ProjectSummaryDTO, ArtistSummaryDTO, ServiceDTO, ProductSummaryDTO } from "@shared/types";

interface HomeContent {
  featuredProjects: ProjectSummaryDTO[];
  artists: ArtistSummaryDTO[];
  services: ServiceDTO[];
  products: ProductSummaryDTO[];
}

export default function HomePage() {
  const { settings } = useSettings();
  const { t, lang } = useLang();
  const { data } = useApi(() => api.get<HomeContent>("/home-content"), [lang]);

  useDocumentMeta({
    description:
      settings?.seo.defaultDescription ||
      settings?.description ||
      t("Studio de production musicale et audiovisuelle basé au Cameroun.", "Music and audiovisual production studio based in Cameroon."),
    image: settings?.seo.ogImageUrl ?? null,
  });

  const tagline = settings?.tagline || t("Studio de production · Cameroun", "Production studio · Cameroon");

  const capabilities = [
    { n: "01", title: t("Production musicale", "Music production"), body: t("Enregistrement, arrangement, mixage.", "Recording, arrangement, mixing.") },
    { n: "02", title: t("Réalisation audiovisuelle", "Audiovisual production"), body: t("Clips, films de marque, captations.", "Music videos, brand films, live captures.") },
    { n: "03", title: t("Mixage & mastering", "Mixing & mastering"), body: t("Une finition précise, prête à diffuser.", "A precise, release-ready finish.") },
    { n: "04", title: t("Direction artistique", "Art direction"), body: t("Une vision cohérente, du son à l'image.", "A coherent vision, from sound to image.") },
  ];

  const marqueeItems = [t("Musique", "Music"), t("Image", "Image"), "Clip", "Mix", "Mastering", "Film", "Studio", t("Cameroun", "Cameroon")];

  return (
    <>
      {/* ----------------------------- HERO ----------------------------- */}
      <section className="relative isolate flex min-h-[92vh] items-end overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-bg-deep" />
        {/* Halo décoratif, repoussé vers la droite (loin du texte). */}
        <div aria-hidden className="absolute inset-0 -z-20 opacity-[0.12] animate-fade-in" style={{ backgroundImage: "radial-gradient(60% 50% at 82% 14%, rgb(var(--c-white)/0.5), transparent 70%), radial-gradient(55% 55% at 72% 58%, rgb(var(--c-white)/0.3), transparent 72%)" }} />
        <div aria-hidden className="absolute inset-0 -z-20 opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgb(var(--c-white)) 0 1px, transparent 1px 3px)" }} />
        {/* Voile sombre : garantit la lisibilité du texte (bas-gauche). */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-tr from-bg-deep from-20% via-bg-deep/65 via-55% to-transparent" />

        <div className="container-page pb-20 pt-28 md:pb-28">
          <p className="eyebrow animate-fade-in">{tagline}</p>
          <h1 className="mt-6 max-w-5xl font-display text-[clamp(2.75rem,8.5vw,7.5rem)] font-black leading-[0.9] tracking-tightest text-fg-strong animate-fade-up">
            {t("Le son et l'image,", "Sound and image,")}
            <br />
            {t("façonnés avec intention.", "shaped with intention.")}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-fg-muted animate-fade-up" style={{ animationDelay: "80ms" }}>
            {settings?.description ||
              t(
                "Arkane Production accompagne artistes et marques, de la création musicale à la réalisation audiovisuelle. Une signature cinématique, sans compromis.",
                "Arkane Production supports artists and brands, from music creation to audiovisual production. A cinematic signature, without compromise.",
              )}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: "160ms" }}>
            <Link to="/productions" className="btn-primary">{t("Voir les productions", "View productions")}</Link>
            <Link to="/contact" className="btn-outline">{t("Démarrer un projet", "Start a project")}</Link>
          </div>
        </div>

        {/* Indice de défilement */}
        <div aria-hidden className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-fg-subtle md:flex">
          <span className="text-[10px] uppercase tracking-[0.3em]">{t("Défiler", "Scroll")}</span>
          <span className="h-10 w-px animate-pulse bg-gradient-to-b from-fg-subtle to-transparent" />
        </div>
      </section>

      {/* ----------------------------- MARQUEE ----------------------------- */}
      <div className="border-y border-border bg-bg-deep py-5">
        <Marquee items={marqueeItems} />
      </div>

      {/* --------------------- PRODUCTIONS EN AVANT --------------------- */}
      {data && data.featuredProjects.length > 0 && (
        <section className="container-page border-b border-border py-20 md:py-28">
          <Reveal>
            <SectionHeader
              eyebrow={t("Sélection", "Selection")}
              title={t("Productions en avant", "Featured work")}
              action={<Link to="/productions" className="hidden text-sm text-fg-muted hover:text-fg sm:inline-flex">{t("Tout voir →", "View all →")}</Link>}
            />
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {data.featuredProjects.map((p, i) => (
              <Reveal key={p.id} delayMs={i * 60}><ProjectCard project={p} /></Reveal>
            ))}
          </div>
        </section>
      )}

      {/* --------------------------- MANIFESTE --------------------------- */}
      <section className="container-page border-b border-border py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
          <Reveal>
            <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tightest md:text-4xl lg:text-5xl">
              {t("Un studio, une exigence.", "One studio, one standard.")}
            </h2>
          </Reveal>
          <Reveal delayMs={80}>
            <div className="space-y-5 text-base leading-relaxed text-fg-muted md:text-lg">
              <p>
                {t(
                  "De l'enregistrement au mixage, du clip au film de marque, nous réunissons les métiers de la production sous un même toit. Chaque projet est traité comme une œuvre à part entière.",
                  "From recording to mixing, from music videos to brand films, we bring the crafts of production under one roof. Every project is treated as a work in its own right.",
                )}
              </p>
              <Link to="/studio" className="inline-flex items-center gap-2 text-fg transition-colors hover:text-fg-strong">
                {t("Découvrir le studio", "Discover the studio")} <span aria-hidden>→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------- SAVOIR-FAIRE (evergreen) --------------------------- */}
      <section className="container-page border-b border-border py-20 md:py-28">
        <Reveal>
          <SectionHeader eyebrow={t("Savoir-faire", "Expertise")} title={t("Ce que nous faisons", "What we do")} />
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((c, i) => (
            <Reveal key={c.n} delayMs={i * 70} className="h-full">
              <div className="flex h-full flex-col gap-4 bg-bg p-7 transition-colors duration-[var(--dur)] hover:bg-surface/50">
                <span className="font-display text-sm font-bold tracking-widest text-fg-subtle">{c.n}</span>
                <h3 className="font-display text-xl font-bold leading-tight tracking-tight text-fg-strong">{c.title}</h3>
                <p className="text-sm leading-relaxed text-fg-muted">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-8">
          <Link to="/services" className="btn-outline">{t("Tous les services", "All services")}</Link>
        </div>
      </section>

      {/* ------------------------------ ARTISTES ------------------------------ */}
      {data && data.artists.length > 0 && (
        <section className="container-page border-b border-border py-20 md:py-28">
          <Reveal>
            <SectionHeader
              eyebrow={t("Talents", "Talent")}
              title={t("Nos artistes", "Our artists")}
              action={<Link to="/artistes" className="hidden text-sm text-fg-muted hover:text-fg sm:inline-flex">{t("Tout voir →", "View all →")}</Link>}
            />
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {data.artists.map((a, i) => (
              <Reveal key={a.id} delayMs={i * 60}><ArtistCard artist={a} /></Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------ BOUTIQUE ------------------------------ */}
      {data && data.products.length > 0 && (
        <section className="container-page border-b border-border py-20 md:py-28">
          <Reveal>
            <SectionHeader
              eyebrow={t("Boutique", "Shop")}
              title={t("Merchandising", "Merchandise")}
              action={<Link to="/merch" className="hidden text-sm text-fg-muted hover:text-fg sm:inline-flex">{t("Tout voir →", "View all →")}</Link>}
            />
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
            {data.products.map((p, i) => (
              <Reveal key={p.id} delayMs={i * 60}><ProductCard product={p} /></Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------- CTA ------------------------------- */}
      <section className="container-page py-20 md:py-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-lg border border-border bg-surface px-6 py-16 text-center md:py-24">
            <div aria-hidden className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "repeating-linear-gradient(135deg, rgb(var(--c-white)) 0 1px, transparent 1px 10px)" }} />
            <h2 className="relative mx-auto max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tightest md:text-5xl">
              {t("Un projet en tête ?", "Got a project in mind?")}
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-fg-muted">
              {t("Parlons-en. Nous répondons rapidement et étudions chaque demande avec attention.", "Let's talk. We reply quickly and consider every request carefully.")}
            </p>
            <Link to="/contact" className="btn-primary relative mt-8">{t("Nous contacter", "Contact us")}</Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
