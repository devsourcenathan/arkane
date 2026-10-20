import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useDocumentMeta } from "@/lib/seo";
import { useLang } from "@/app/providers/LanguageProvider";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { Reveal } from "@/components/motion/Reveal";
import { ServiceCard } from "@/components/cards/ServiceCard";
import type { ServiceDTO } from "@shared/types";

export default function ServicesPage() {
  const { t, lang } = useLang();
  const { data, loading, error, reload } = useApi(() => api.get<ServiceDTO[]>("/services"), [lang]);
  useDocumentMeta({
    title: t("Services", "Services"),
    description: t("Les prestations proposées par Arkane Production.", "The services offered by Arkane Production."),
  });

  return (
    <div className="container-page pt-28 md:pt-36">
      <p className="eyebrow">{t("Savoir-faire", "Expertise")}</p>
      <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,5vw,4.5rem)] font-black leading-[0.98] tracking-tightest">
        {t("Nos services", "Our services")}
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-fg-muted md:text-lg">
        {t(
          "Des prestations pensées pour accompagner les artistes et les marques à chaque étape.",
          "Services designed to support artists and brands at every step.",
        )}
      </p>

      <div className="mt-14 pb-8">
        {loading && <LoadingState label={t("Chargement…", "Loading…")} />}
        {error && <ErrorState message={t("Impossible de charger les services.", "Couldn't load services.")} onRetry={reload} />}
        {data && data.length === 0 && (
          <EmptyState title={t("Bientôt disponible", "Coming soon")} description={t("Les services seront publiés prochainement.", "Services will be published soon.")} />
        )}
        {data && data.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.map((service, i) => (
              <Reveal key={service.id} delayMs={(i % 3) * 70}>
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      <section className="mt-8 border-t border-border py-16 text-center">
        <h2 className="font-display text-2xl font-extrabold tracking-tightest md:text-3xl">{t("Un besoin spécifique ?", "A specific need?")}</h2>
        <p className="mx-auto mt-3 max-w-md text-fg-muted">
          {t("Parlez-nous de votre projet, nous construirons une proposition sur mesure.", "Tell us about your project and we'll build a tailored proposal.")}
        </p>
        <Link to="/contact" className="btn-primary mt-6">{t("Demander un devis", "Request a quote")}</Link>
      </section>
    </div>
  );
}
