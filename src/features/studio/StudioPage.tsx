import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useDocumentMeta } from "@/lib/seo";
import { useSettings } from "@/app/providers/SettingsProvider";
import { useLang } from "@/app/providers/LanguageProvider";
import { Reveal } from "@/components/motion/Reveal";
import { SmartImage } from "@/components/ui/SmartImage";
import type { TeamMemberDTO } from "@shared/types";

export default function StudioPage() {
  const { settings } = useSettings();
  const { t, lang } = useLang();
  const team = useApi(() => api.get<TeamMemberDTO[]>("/team"), [lang]);

  useDocumentMeta({
    title: t("Le studio", "The studio"),
    description:
      settings?.description ||
      t("Arkane Production — un studio qui réunit les métiers du son et de l'image.", "Arkane Production — a studio uniting the crafts of sound and image."),
  });

  const history = settings?.studio.history ?? "";
  const vision = settings?.studio.vision ?? "";
  const rules = settings?.studio.rules ?? [];

  const approach = [
    { title: t("Direction artistique", "Art direction"), body: t("Chaque son, chaque image sert une vision cohérente, pensée avec l'artiste.", "Every sound and image serves a coherent vision, shaped with the artist.") },
    { title: t("Production musicale", "Music production"), body: t("Un accompagnement complet, de la première prise au master.", "Full support, from the first take to the master.") },
    { title: t("Réalisation audiovisuelle", "Audiovisual production"), body: t("Une écriture cinématique au service du récit.", "A cinematic language serving the story.") },
  ];

  return (
    <div>
      {/* INTRO */}
      <section className="container-page pt-28 md:pt-36">
        <p className="eyebrow animate-fade-in">{t("Le studio", "The studio")}</p>
        <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.5rem,6vw,5.5rem)] font-black leading-[0.95] tracking-tightest animate-fade-up">
          {t("Façonner le son et l'image.", "Shaping sound and image.")}
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-fg-muted animate-fade-up">
          {settings?.description ||
            t(
              "Arkane Production réunit sous un même toit les métiers de la production musicale et audiovisuelle.",
              "Arkane Production brings together under one roof the crafts of music and audiovisual production.",
            )}
        </p>
      </section>

      {/* HISTOIRE */}
      {history && (
        <section className="container-page mt-20 border-t border-border py-16 md:mt-28 md:py-24">
          <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
            <Reveal>
              <p className="eyebrow mb-4">{t("Notre histoire", "Our story")}</p>
              <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tightest md:text-4xl">
                {t("D'où nous venons.", "Where we come from.")}
              </h2>
            </Reveal>
            <Reveal delayMs={80}>
              <div className="max-w-prose whitespace-pre-line text-base leading-relaxed text-fg-muted md:text-lg">{history}</div>
            </Reveal>
          </div>
        </section>
      )}

      {/* VISION */}
      {vision && (
        <section className="container-page border-t border-border py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
            <Reveal>
              <p className="eyebrow mb-4">{t("Notre vision", "Our vision")}</p>
              <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tightest md:text-4xl">
                {t("Où nous allons.", "Where we're headed.")}
              </h2>
            </Reveal>
            <Reveal delayMs={80}>
              <div className="max-w-prose whitespace-pre-line text-base leading-relaxed text-fg-muted md:text-lg">{vision}</div>
            </Reveal>
          </div>
        </section>
      )}

      {/* LES 5 RÈGLES */}
      {rules.length > 0 && (
        <section className="border-t border-border bg-bg-deep py-20 md:py-28">
          <div className="container-page">
            <Reveal>
              <p className="eyebrow mb-4">{t("Le code", "The code")}</p>
              <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tightest md:text-5xl">
                {t(`Nos ${rules.length} règles`, `Our ${rules.length} rules`)}
              </h2>
            </Reveal>

            <ol className="mt-12 divide-y divide-border border-y border-border">
              {rules.map((rule, i) => {
                const last = i === rules.length - 1;
                return (
                  <Reveal key={i} delayMs={i * 60}>
                    <li className={`flex items-baseline gap-5 py-6 md:gap-10 ${last ? "md:py-10" : ""}`}>
                      <span className={`font-display font-bold tabular-nums ${last ? "text-fg text-xl md:text-3xl" : "text-fg-subtle text-base"}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={
                          last
                            ? "font-display text-[clamp(1.75rem,5vw,3.75rem)] font-black leading-[0.98] tracking-tightest text-fg-strong"
                            : "font-display text-xl font-bold tracking-tight text-fg md:text-2xl"
                        }
                      >
                        {rule}
                        {last && (
                          <span className="ml-3 align-middle text-xs font-medium uppercase tracking-[0.2em] text-fg-subtle">
                            {t("· la plus importante", "· the most important")}
                          </span>
                        )}
                      </span>
                    </li>
                  </Reveal>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* ÉQUIPE */}
      {team.data && team.data.length > 0 && (
        <section className="container-page border-t border-border py-20 md:py-28">
          <Reveal>
            <p className="eyebrow mb-4">{t("L'équipe", "The team")}</p>
            <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tightest md:text-4xl">
              {t("Les visages d'Arkane.", "The faces of Arkane.")}
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {team.data.map((m, i) => (
              <Reveal key={m.id} delayMs={(i % 4) * 60}>
                <article>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <SmartImage media={m.photo} alt={m.name} aspect="portrait" className="grayscale transition-all duration-[var(--dur-slow)] hover:grayscale-0" />
                  </div>
                  <h3 className="mt-3 font-display text-base font-bold tracking-tight text-fg-strong">{m.name}</h3>
                  {m.roleTitle && <p className="text-sm text-fg-subtle">{m.roleTitle}</p>}
                  {m.bio && <p className="mt-2 text-xs leading-relaxed text-fg-muted">{m.bio}</p>}
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* APPROCHE (evergreen) */}
      <section className="container-page border-t border-border py-16 md:py-24">
        <Reveal>
          <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tightest md:text-4xl">
            {t("Une approche, pas une recette.", "An approach, not a formula.")}
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {approach.map((item, i) => (
            <Reveal key={item.title} delayMs={i * 80} className="h-full">
              <div className="h-full bg-bg p-8">
                <h3 className="font-display text-lg font-bold tracking-tight text-fg-strong">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10">
          <Link to="/contact" className="btn-primary">{t("Travailler avec nous", "Work with us")}</Link>
        </div>
      </section>
    </div>
  );
}
