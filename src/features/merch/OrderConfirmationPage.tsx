import { useMemo } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useDocumentMeta } from "@/lib/seo";
import { useSettings } from "@/app/providers/SettingsProvider";
import { useLang } from "@/app/providers/LanguageProvider";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { buildOrderMessage, buildWhatsappUrl } from "@/lib/whatsapp";
import { formatXAF } from "@shared/money";
import type { OrderCreatedDTO, OrderPublicDTO, OrderItemDTO } from "@shared/types";

interface OrderView {
  reference: string;
  items: OrderItemDTO[];
  totalXaf: number;
  whatsappNumber: string;
  orderStatus?: string;
  paymentStatus?: string;
}

export default function OrderConfirmationPage() {
  const { reference = "" } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const { settings } = useSettings();
  const { t, lang } = useLang();
  const token = params.get("token") ?? "";

  useDocumentMeta({ title: t("Commande enregistrée", "Order saved") });

  const orderLabel = (s: string) =>
    ({
      pending: t("En attente", "Pending"),
      confirmed: t("Confirmée", "Confirmed"),
      fulfilled: t("Honorée", "Fulfilled"),
      cancelled: t("Annulée", "Cancelled"),
    })[s] ?? s;
  const paymentLabel = (s: string) =>
    ({
      unpaid: t("Non payé", "Unpaid"),
      paid: t("Payé", "Paid"),
      refunded: t("Remboursé", "Refunded"),
    })[s] ?? s;

  const cached = useMemo<OrderCreatedDTO | null>(() => {
    const state = location.state as { created?: OrderCreatedDTO } | null;
    if (state?.created?.reference === reference) return state.created;
    try {
      const raw = sessionStorage.getItem(`order:${reference}`);
      if (raw) {
        const parsed = JSON.parse(raw) as OrderCreatedDTO;
        if (parsed.reference === reference) return parsed;
      }
    } catch {
      /* ignore */
    }
    return null;
  }, [reference, location.state]);

  const { data, loading, error } = useApi<OrderView>(async () => {
    if (cached) {
      return { reference: cached.reference, items: cached.items, totalXaf: cached.totalXaf, whatsappNumber: cached.whatsappNumber };
    }
    if (!token) throw new Error("Lien de consultation invalide.");
    const pub = await api.get<OrderPublicDTO>(`/orders/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`);
    return {
      reference: pub.reference,
      items: pub.items,
      totalXaf: pub.totalXaf,
      whatsappNumber: pub.whatsappNumber,
      orderStatus: pub.orderStatus,
      paymentStatus: pub.paymentStatus,
    };
  }, [reference, token, cached]);

  if (loading) return <LoadingState label={t("Chargement…", "Loading…")} />;
  if (error || !data) {
    return (
      <div className="container-page py-32">
        <ErrorState message={t("Cette commande est introuvable ou le lien a expiré.", "This order could not be found or the link has expired.")} />
        <div className="mt-6 text-center">
          <Link to="/merch" className="btn-outline">{t("Retour à la boutique", "Back to shop")}</Link>
        </div>
      </div>
    );
  }

  const studioName = settings?.studioName || "Arkane Production";
  const waNumber = data.whatsappNumber || settings?.whatsappNumber || "";
  const waUrl = buildWhatsappUrl(
    waNumber,
    buildOrderMessage({ reference: data.reference, items: data.items, totalXaf: data.totalXaf, studioName }, lang),
  );

  return (
    <div className="container-page pt-28 md:pt-36">
      <div className="mx-auto max-w-2xl pb-20">
        <p className="eyebrow">{t("Commande enregistrée", "Order saved")}</p>
        <h1 className="mt-5 font-display text-[clamp(2rem,5vw,3.5rem)] font-black leading-[1] tracking-tightest">
          {t("Merci pour votre commande.", "Thank you for your order.")}
        </h1>
        <p className="mt-5 text-fg-muted">
          {t("Votre référence :", "Your reference:")} <span className="font-mono text-fg-strong">{data.reference}</span>.{" "}
          {t("Finalisez la confirmation et le paiement avec le studio via WhatsApp.", "Finalise the confirmation and payment with the studio via WhatsApp.")}
        </p>

        {(data.orderStatus || data.paymentStatus) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {data.orderStatus && <span className="rounded-full border border-border px-3 py-1 text-xs text-fg-muted">{t("Commande", "Order")} : {orderLabel(data.orderStatus)}</span>}
            {data.paymentStatus && <span className="rounded-full border border-border px-3 py-1 text-xs text-fg-muted">{t("Paiement", "Payment")} : {paymentLabel(data.paymentStatus)}</span>}
          </div>
        )}

        <div className="mt-8 rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {data.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-fg-strong">{item.productName}</p>
                  <p className="text-xs text-fg-subtle">{item.variantLabel} · {item.quantity}× {formatXAF(item.unitPriceXaf)}</p>
                </div>
                <span className="text-sm">{formatXAF(item.lineTotalXaf)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-5 py-4">
            <span className="text-sm text-fg-muted">Total</span>
            <span className="font-display text-xl font-bold">{formatXAF(data.totalXaf)}</span>
          </div>
        </div>

        <div className="mt-8">
          {waUrl ? (
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full sm:w-auto">{t("Confirmer via WhatsApp", "Confirm via WhatsApp")}</a>
          ) : (
            <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-fg-subtle">
              {t("Le studio vous contactera pour finaliser la commande.", "The studio will contact you to finalise the order.")}
            </p>
          )}
          <p className="mt-3 text-xs text-fg-subtle">
            {t(
              "Conservez votre référence. Ouvrir WhatsApp ne vaut pas paiement : le studio confirme les modalités et valide le règlement.",
              "Keep your reference. Opening WhatsApp is not a payment: the studio confirms the terms and validates the payment.",
            )}
          </p>
        </div>

        <div className="mt-10">
          <Link to="/merch" className="text-sm text-fg-muted transition-colors hover:text-fg">← {t("Continuer mes achats", "Continue shopping")}</Link>
        </div>
      </div>
    </div>
  );
}
