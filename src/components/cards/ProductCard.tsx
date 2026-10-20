import { Link } from "react-router-dom";
import { SmartImage } from "@/components/ui/SmartImage";
import { useLang } from "@/app/providers/LanguageProvider";
import { formatXAF } from "@shared/money";
import type { ProductSummaryDTO } from "@shared/types";

export function ProductCard({ product }: { product: ProductSummaryDTO }) {
  const { t } = useLang();
  return (
    <Link to={`/merch/${product.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-lg border border-border">
        <SmartImage
          media={product.cover}
          alt={product.name}
          aspect="square"
          className="transition-transform duration-[var(--dur-slow)] ease-premium group-hover:scale-[1.03]"
        />
        {!product.inStock && (
          <span className="absolute left-3 top-3 rounded-full bg-bg/80 px-3 py-1 text-xs font-medium uppercase tracking-wider text-fg-muted backdrop-blur">
            {t("Épuisé", "Sold out")}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          {product.category && <p className="eyebrow mb-1">{product.category}</p>}
          <h3 className="font-display text-base font-bold leading-tight tracking-tight text-fg-strong">
            {product.name}
          </h3>
        </div>
        <p className="shrink-0 text-sm font-medium text-fg">{formatXAF(product.fromPriceXaf)}</p>
      </div>
    </Link>
  );
}
