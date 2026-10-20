import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/app/providers/CartProvider";
import { useLang } from "@/app/providers/LanguageProvider";
import { SmartImage } from "@/components/ui/SmartImage";
import { formatXAF } from "@shared/money";

export function CartDrawer() {
  const { items, isOpen, closeCart, setQuantity, remove, subtotalXaf, count } = useCart();
  const { t } = useLang();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!isOpen}>
      <div className={`absolute inset-0 bg-overlay/60 transition-opacity duration-[var(--dur)] ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={closeCart} />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-bg shadow-[var(--shadow-soft)] transition-transform duration-[var(--dur)] ease-premium ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label={t("Panier", "Cart")}
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="font-display text-xl font-bold tracking-tight">
            {t("Panier", "Cart")} {count > 0 && <span className="text-fg-subtle">({count})</span>}
          </h2>
          <button type="button" onClick={closeCart} className="btn-ghost -mr-2 px-2" aria-label={t("Fermer le panier", "Close cart")}>✕</button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-fg-muted">{t("Votre panier est vide.", "Your cart is empty.")}</p>
            <Link to="/merch" onClick={closeCart} className="btn-outline">{t("Découvrir la boutique", "Browse the shop")}</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-6">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-4 py-5">
                  <Link to={`/merch/${item.productSlug}`} onClick={closeCart} className="shrink-0">
                    <SmartImage media={item.image ? { id: "", url: item.image, alt: item.productName, width: null, height: null } : null} aspect="square" className="w-20 rounded-md" />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-fg-strong">{item.productName}</p>
                        <p className="text-xs text-fg-subtle">{item.variantLabel}</p>
                      </div>
                      <button type="button" onClick={() => remove(item.variantId)} className="text-fg-subtle hover:text-fg" aria-label={t(`Retirer ${item.productName}`, `Remove ${item.productName}`)}>✕</button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="inline-flex items-center rounded-md border border-border">
                        <button type="button" className="px-2.5 py-1 text-fg-muted hover:text-fg" onClick={() => setQuantity(item.variantId, item.quantity - 1)} aria-label={t("Diminuer la quantité", "Decrease quantity")}>−</button>
                        <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                        <button type="button" className="px-2.5 py-1 text-fg-muted hover:text-fg" onClick={() => setQuantity(item.variantId, item.quantity + 1)} aria-label={t("Augmenter la quantité", "Increase quantity")}>+</button>
                      </div>
                      <p className="text-sm font-medium">{formatXAF(item.unitPriceXaf * item.quantity)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="border-t border-border px-6 py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">{t("Sous-total", "Subtotal")}</span>
                <span className="font-display text-lg font-bold">{formatXAF(subtotalXaf)}</span>
              </div>
              <p className="mt-1 text-xs text-fg-subtle">
                {t("Montant confirmé à la commande. Paiement finalisé via WhatsApp.", "Amount confirmed at checkout. Payment finalised via WhatsApp.")}
              </p>
              <Link to="/commande" onClick={closeCart} className="btn-primary mt-4 w-full">{t("Passer la commande", "Checkout")}</Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
