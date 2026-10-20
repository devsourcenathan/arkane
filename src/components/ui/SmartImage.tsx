import type { MediaDTO } from "@shared/types";

type Aspect = "square" | "video" | "portrait" | "wide" | "auto";

const ASPECT: Record<Aspect, string> = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
  wide: "aspect-[16/9]",
  auto: "",
};

interface SmartImageProps {
  media: MediaDTO | null | undefined;
  alt?: string;
  aspect?: Aspect;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/** Image responsive avec chargement différé et repli monochrome si absente. */
export function SmartImage({
  media,
  alt,
  aspect = "square",
  className = "",
  sizes,
  priority = false,
}: SmartImageProps) {
  const label = alt ?? media?.alt ?? "";
  return (
    <div className={`relative overflow-hidden bg-surface ${ASPECT[aspect]} ${className}`}>
      {media ? (
        <img
          src={media.url}
          alt={label}
          width={media.width ?? undefined}
          height={media.height ?? undefined}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center" aria-hidden>
          <svg viewBox="0 0 32 32" className="h-10 w-10 text-border-strong" fill="none">
            <path d="M4 27 L16 6 L28 27" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <line x1="10" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      )}
    </div>
  );
}
