import { Link } from "react-router-dom";
import { SmartImage } from "@/components/ui/SmartImage";
import type { ArtistSummaryDTO } from "@shared/types";

export function ArtistCard({ artist }: { artist: ArtistSummaryDTO }) {
  return (
    <Link to={`/artistes/${artist.slug}`} className="group block">
      <div className="overflow-hidden rounded-lg border border-border">
        <SmartImage
          media={artist.portrait}
          alt={artist.name}
          aspect="portrait"
          className="grayscale transition-all duration-[var(--dur-slow)] ease-premium group-hover:scale-[1.03] group-hover:grayscale-0"
        />
      </div>
      <div className="mt-3">
        <h3 className="font-display text-base font-bold tracking-tight text-fg-strong">{artist.name}</h3>
        {artist.roleTitle && <p className="mt-0.5 text-sm text-fg-subtle">{artist.roleTitle}</p>}
      </div>
    </Link>
  );
}
