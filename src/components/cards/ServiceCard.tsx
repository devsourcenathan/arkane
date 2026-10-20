import { SmartImage } from "@/components/ui/SmartImage";
import { formatXAF } from "@shared/money";
import type { ServiceDTO } from "@shared/types";

export function ServiceCard({ service }: { service: ServiceDTO }) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-surface/40 p-6 transition-colors duration-[var(--dur)] hover:border-border-strong">
      {service.cover && (
        <div className="mb-5 overflow-hidden rounded-md">
          <SmartImage media={service.cover} alt={service.title} aspect="wide" />
        </div>
      )}
      <h3 className="font-display text-xl font-bold tracking-tight text-fg-strong">{service.title}</h3>
      {service.summary && <p className="mt-2 text-sm leading-relaxed text-fg-muted">{service.summary}</p>}
      {service.description && service.description !== service.summary && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg-subtle">{service.description}</p>
      )}
      {(service.priceFromXaf !== null || service.priceNote) && (
        <p className="mt-auto pt-5 text-sm text-fg">
          {service.priceFromXaf !== null && (
            <span className="font-medium">À partir de {formatXAF(service.priceFromXaf)}</span>
          )}
          {service.priceNote && <span className="text-fg-subtle"> · {service.priceNote}</span>}
        </p>
      )}
    </article>
  );
}
