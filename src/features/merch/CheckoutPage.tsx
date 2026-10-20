import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiClientError } from "@/lib/api";
import { useDocumentMeta } from "@/lib/seo";
import { useCart } from "@/app/providers/CartProvider";
import { useLang } from "@/app/providers/LanguageProvider";
import { Turnstile } from "@/components/Turnstile";
import { Spinner, EmptyState } from "@/components/ui/states";
import { SmartImage } from "@/components/ui/SmartImage";
import { formatXAF } from "@shared/money";
import type { OrderCreatedDTO } from "@shared/types";

export default function CheckoutPage() {
  const { items, subtotalXaf, setQuantity, remove, clear } = useCart();
  const navigate = useNavigate();
  const { t } = useLang();
  useDocumentMeta({ title: t("Commande", "Checkout"), description: t("Finalisez votre commande.", "Complete your order.") });

  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "" });
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || form.phone.trim().length < 6) {
      setError(t("Nom et numéro de téléphone requis.", "Name and phone number required."));
      return;
    }
    if (!token) {
      setError(t("Veuillez compléter la vérification anti-robot.", "Please complete the anti-robot check."));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        customer: { name: form.name, phone: form.phone, email: form.email, note: form.note },
        turnstileToken: token,
      };
      const created = await api.post<OrderCreatedDTO>("/orders", payload);
      clear();
      try {
        sessionStorage.setItem(`order:${created.reference}`, JSON.stringify(created));
      } catch {
        /* ignore */
      }
      navigate(`/commande/${created.reference}?token=${encodeURIComponent(created.lookupToken)}`, { state: { created } });
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof ApiClientError ? err.message : t("La commande n'a pas pu être enregistrée.", "The order couldn't be saved."));
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-page pt-28 md:pt-36">
        <h1 className="font-display text-3xl font-black tracking-tightest md:text-5xl">{t("Votre commande", "Your order")}</h1>
        <div className="mt-10 pb-20">
          <EmptyState title={t("Votre panier est vide", "Your cart is empty")} description={t("Ajoutez des articles depuis la boutique.", "Add items from the shop.")} />
          <div className="mt-6 text-center">
            <Link to="/merch" className="btn-primary">{t("Aller à la boutique", "Go to shop")}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page pt-28 md:pt-36">
      <h1 className="font-display text-[clamp(2rem,5vw,4rem)] font-black leading-[0.98] tracking-tightest">
        {t("Finaliser la commande", "Complete your order")}
      </h1>

      <div className="mt-10 grid gap-12 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <form onSubmit={onSubmit} className="order-2 space-y-5 lg:order-1" noValidate>
          <h2 className="font-display text-xl font-bold tracking-tight">{t("Vos coordonnées", "Your details")}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="field-label">{t("Nom complet", "Full name")} *</label>
              <input id="c-name" className="field-input" value={form.name} onChange={set("name")} required maxLength={120} />
            </div>
            <div>
              <label htmlFor="c-phone" className="field-label">{t("Téléphone (WhatsApp)", "Phone (WhatsApp)")} *</label>
              <input id="c-phone" className="field-input" value={form.phone} onChange={set("phone")} required maxLength={30} />
            </div>
          </div>
          <div>
            <label htmlFor="c-email" className="field-label">Email</label>
            <input id="c-email" type="email" className="field-input" value={form.email} onChange={set("email")} maxLength={180} />
          </div>
          <div>
            <label htmlFor="c-note" className="field-label">{t("Note (facultatif)", "Note (optional)")}</label>
            <textarea id="c-note" className="field-input min-h-[90px] resize-y" value={form.note} onChange={set("note")} maxLength={1000} />
          </div>

          <Turnstile onVerify={setToken} onExpire={() => setToken("")} />
          {error && <p className="text-sm text-fg-strong">{error}</p>}

          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
            {submitting ? <Spinner className="h-4 w-4" /> : t("Enregistrer la commande", "Save order")}
          </button>
          <p className="text-xs text-fg-subtle">
            {t(
              "Votre commande sera enregistrée, puis finalisée via WhatsApp. Le montant est confirmé par le studio avant tout paiement.",
              "Your order will be saved, then finalised via WhatsApp. The amount is confirmed by the studio before any payment.",
            )}
          </p>
        </form>

        <aside className="order-1 lg:order-2">
          <div className="rounded-lg border border-border bg-surface/40 p-6">
            <h2 className="font-display text-lg font-bold tracking-tight">{t("Récapitulatif", "Summary")}</h2>
            <ul className="mt-5 divide-y divide-border">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-4 py-4">
                  <SmartImage media={item.image ? { id: "", url: item.image, alt: item.productName, width: null, height: null } : null} aspect="square" className="w-16 rounded-md" />
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm font-medium text-fg-strong">{item.productName}</p>
                    <p className="text-xs text-fg-subtle">{item.variantLabel}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center rounded border border-border text-sm">
                        <button type="button" className="px-2 py-0.5 text-fg-muted hover:text-fg" onClick={() => setQuantity(item.variantId, item.quantity - 1)} aria-label={t("Diminuer", "Decrease")}>−</button>
                        <span className="w-7 text-center tabular-nums">{item.quantity}</span>
                        <button type="button" className="px-2 py-0.5 text-fg-muted hover:text-fg" onClick={() => setQuantity(item.variantId, item.quantity + 1)} aria-label={t("Augmenter", "Increase")}>+</button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{formatXAF(item.unitPriceXaf * item.quantity)}</span>
                        <button type="button" className="text-fg-subtle hover:text-fg" onClick={() => remove(item.variantId)} aria-label={t("Retirer", "Remove")}>✕</button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
              <span className="text-sm text-fg-muted">{t("Sous-total estimé", "Estimated subtotal")}</span>
              <span className="font-display text-xl font-bold">{formatXAF(subtotalXaf)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
