import { Link } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { useSettings } from "@/app/providers/SettingsProvider";
import { useLang } from "@/app/providers/LanguageProvider";

const YEAR = new Date().getFullYear();

interface Social {
  key: string;
  label: string;
  url: string;
}

export default function Footer() {
  const { settings } = useSettings();
  const { t } = useLang();
  const studioName = settings?.studioName ?? "Arkane Production";

  const motto = settings?.studio.rules?.at(-1) || "L'Arkane vaincra";

  const socials: Social[] = settings
    ? [
        { key: "instagram", label: "Instagram", url: settings.socials.instagram },
        { key: "youtube", label: "YouTube", url: settings.socials.youtube },
        { key: "facebook", label: "Facebook", url: settings.socials.facebook },
        { key: "tiktok", label: "TikTok", url: settings.socials.tiktok },
        { key: "spotify", label: "Spotify", url: settings.socials.spotify },
        { key: "x", label: "X", url: settings.socials.x },
      ].filter((s) => s.url)
    : [];

  const links = [
    { to: "/productions", label: t("Productions", "Productions") },
    { to: "/artistes", label: t("Artistes", "Artists") },
    { to: "/services", label: t("Services", "Services") },
    { to: "/merch", label: t("Boutique", "Shop") },
    { to: "/studio", label: t("Le studio", "The studio") },
  ];

  return (
    <footer className="mt-24 border-t border-border bg-bg-deep">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:py-20">
        <div className="max-w-sm">
          <Wordmark className="h-6 w-auto text-fg-strong" />
          <p className="mt-5 text-sm leading-relaxed text-fg-muted">
            {settings?.description || t("Studio de production musicale et audiovisuelle.", "Music and audiovisual production studio.")}
          </p>
          {socials.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              {socials.map((s) => (
                <li key={s.key}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm text-fg-muted transition-colors hover:text-fg">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label={t("Navigation du pied de page", "Footer navigation")}>
          <h2 className="eyebrow mb-4">{t("Explorer", "Explore")}</h2>
          <ul className="space-y-3 text-sm">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-fg-muted transition-colors hover:text-fg">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow mb-4">Contact</h2>
          <ul className="space-y-3 text-sm text-fg-muted">
            <li>
              <Link to="/contact" className="transition-colors hover:text-fg">
                {t("Nous écrire", "Write to us")}
              </Link>
            </li>
            {settings?.contactEmail && (
              <li>
                <a href={`mailto:${settings.contactEmail}`} className="transition-colors hover:text-fg">
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings?.contactPhone && <li className="text-fg-subtle">{settings.contactPhone}</li>}
            <li className="text-fg-subtle">{settings?.address || t("Cameroun", "Cameroon")}</li>
          </ul>
        </div>
      </div>

      {/* Signature de marque — la 5e règle, la plus importante. */}
      <div className="border-t border-border">
        <div className="container-page py-10">
          <p className="font-display text-2xl font-black uppercase tracking-tightest text-fg-strong md:text-4xl">
            {motto}
          </p>
        </div>
      </div>

      <div className="hairline">
        <div className="container-page flex flex-col items-start justify-between gap-3 py-6 text-xs text-fg-subtle sm:flex-row sm:items-center">
          <p>© {YEAR} {studioName}. {t("Tous droits réservés.", "All rights reserved.")}</p>
          <Link to="/admin" className="tracking-wide transition-colors hover:text-fg-muted">
            {t("Administration", "Admin")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
