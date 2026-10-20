import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useDocumentMeta } from "@/lib/seo";
import { useLang } from "@/app/providers/LanguageProvider";
import { useCart } from "@/app/providers/CartProvider";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { SmartImage } from "@/components/ui/SmartImage";
import { formatXAF } from "@shared/money";
import type { ProductDetailDTO, ProductVariantDTO, MediaDTO } from "@shared/types";

export default function MerchDetailPage() {
  const { slug = "" } = useParams();
  const { t, lang } = useLang();
  const { add } = useCart();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  const { data, loading, error, reload } = useApi(
    () => api.get<ProductDetailDTO>(`/products/${encodeURIComponent(slug)}`),
    [slug, lang],
  );

  useDocumentMeta({
    title: data?.name,
    description: data?.description?.slice(0, 180),
    image: data?.cover?.url ?? null,
    type: "product",
  });

  if (loading) return <LoadingState label={t("Chargement…", "Loading…")} />;
  if (error) {
    const notFound = error instanceof ApiClientError && error.status === 404;
    return (
      <div className="container-page py-32">
        <ErrorState
          message={notFound ? t("Ce produit est introuvable.", "This product could not be found.") : t("Impossible de charger le produit.", "Couldn't load the product.")}
          onRetry={notFound ? undefined : reload}
        />
        <div className="mt-6 text-center">
          <Link to="/merch" className="btn-outline">← {t("Retour à la boutique", "Back to shop")}</Link>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const gallery: MediaDTO[] = data.images.length > 0 ? data.images : data.cover ? [data.cover] : [];
  const selected: ProductVariantDTO | undefined = data.variants.find((v) => v.id === variantId);
  const price = selected ? selected.priceXaf : data.fromPriceXaf;
  const maxQty = selected ? selected.stock : 0;
  const canAdd = !!selected && selected.available && quantity >= 1 && quantity <= selected.stock;

  const onAdd = () => {
    if (!selected || !canAdd) return;
    add(
      {
        variantId: selected.id,
        productSlug: data.slug,
        productName: data.name,
        variantLabel: selected.label,
        unitPriceXaf: selected.priceXaf,
        image: gallery[0]?.url ?? null,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="container-page pt-24 md:pt-28">
      <Link to="/merch" className="text-sm text-fg-muted transition-colors hover:text-fg">← {t("Boutique", "Shop")}</Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-14">
        <div>
          <div className="overflow-hidden rounded-lg border border-border">
            <SmartImage media={gallery[activeImage] ?? null} alt={data.name} aspect="square" priority />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-3">
              {gallery.map((img, i) => (
                <button key={img.id || i} type="button" onClick={() => setActiveImage(i)} className={`overflow-hidden rounded-md border ${i === activeImage ? "border-fg" : "border-border"}`} aria-label={`${t("Image", "Image")} ${i + 1}`}>
                  <SmartImage media={img} aspect="square" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:sticky md:top-28 md:self-start">
          {data.category && <p className="eyebrow">{data.category}</p>}
          <h1 className="mt-3 font-display text-[clamp(1.75rem,4vw,3rem)] font-black leading-[1] tracking-tightest">{data.name}</h1>
          <p className="mt-4 font-display text-2xl font-bold">{formatXAF(price)}</p>

          {data.description && (
            <p className="mt-6 max-w-prose whitespace-pre-line text-sm leading-relaxed text-fg-muted">{data.description}</p>
          )}

          {data.variants.length > 0 ? (
            <div className="mt-8">
              <p className="field-label">{t("Choisir une option", "Choose an option")}</p>
              <div className="flex flex-wrap gap-2">
                {data.variants.map((v) => {
                  const isSel = v.id === variantId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!v.available}
                      onClick={() => { setVariantId(v.id); setQuantity(1); }}
                      className={`rounded-md border px-4 py-2 text-sm transition-colors ${isSel ? "border-fg bg-fg text-fg-inverted" : "border-border text-fg hover:border-fg-muted"} ${!v.available ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                      aria-pressed={isSel}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>

              {selected && (
                <p className="mt-3 text-xs text-fg-subtle">
                  {selected.available ? t(`${selected.stock} en stock`, `${selected.stock} in stock`) : t("Épuisé", "Sold out")}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center rounded-md border border-border">
                  <button type="button" className="px-3 py-2.5 text-fg-muted hover:text-fg disabled:opacity-40" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={!selected || quantity <= 1} aria-label={t("Diminuer", "Decrease")}>−</button>
                  <span className="w-10 text-center text-sm tabular-nums">{quantity}</span>
                  <button type="button" className="px-3 py-2.5 text-fg-muted hover:text-fg disabled:opacity-40" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={!selected || quantity >= maxQty} aria-label={t("Augmenter", "Increase")}>+</button>
                </div>
                <button type="button" onClick={onAdd} disabled={!canAdd} className="btn-primary flex-1 sm:flex-none">
                  {added ? t("Ajouté ✓", "Added ✓") : selected ? t("Ajouter au panier", "Add to cart") : t("Choisir une option", "Choose an option")}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-8 rounded-md border border-dashed border-border px-4 py-3 text-sm text-fg-subtle">
              {t("Ce produit n'a pas encore de variante disponible.", "This product has no available variant yet.")}
            </p>
          )}

          <p className="mt-6 text-xs text-fg-subtle">
            {t(
              "La commande est enregistrée puis finalisée via WhatsApp. Le montant est confirmé par le studio.",
              "The order is saved then finalised via WhatsApp. The amount is confirmed by the studio.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
