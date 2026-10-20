import { Link } from "react-router-dom";
import { useLang } from "@/app/providers/LanguageProvider";

export default function NotFoundPage() {
  const { t } = useLang();
  return (
    <section className="container-page flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">{t("Erreur 404", "Error 404")}</p>
      <h1 className="mt-5 font-display text-6xl font-black tracking-tightest md:text-8xl">{t("Page introuvable", "Page not found")}</h1>
      <p className="mt-5 max-w-md text-fg-muted">
        {t("La page que vous recherchez n'existe pas ou a été déplacée.", "The page you're looking for doesn't exist or has moved.")}
      </p>
      <Link to="/" className="btn-primary mt-8">{t("Retour à l'accueil", "Back home")}</Link>
    </section>
  );
}
