import { useState } from "react";
import { useLang } from "@/app/providers/LanguageProvider";

interface ParsedVideo {
  provider: "youtube" | "vimeo";
  embedUrl: string;
  thumbnail: string | null;
}

/** Analyse une URL YouTube/Vimeo et renvoie l'URL d'embed (nocookie quand possible). */
export function parseVideoUrl(url: string): ParsedVideo | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
      if (id) return youtube(id);
    }
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return youtube(id);
    }
    if (host === "youtube-nocookie.com") {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return youtube(id);
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) {
        return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}`, thumbnail: null };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function youtube(id: string): ParsedVideo {
  return {
    provider: "youtube",
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
    thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
  };
}

interface VideoEmbedProps {
  url: string;
  title?: string;
}

/** Lecteur vidéo différé : charge l'iframe au clic (perf + confidentialité). */
export function VideoEmbed({ url, title = "Vidéo" }: VideoEmbedProps) {
  const [active, setActive] = useState(false);
  const { t } = useLang();
  const parsed = parseVideoUrl(url);

  if (!parsed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-outline">
        {t("Voir la vidéo ↗", "Watch video ↗")}
      </a>
    );
  }

  if (active) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-bg-deep">
        <iframe
          src={parsed.embedUrl}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-deep"
      aria-label={t(`Lire la vidéo : ${title}`, `Play video: ${title}`)}
    >
      {parsed.thumbnail && (
        <img
          src={parsed.thumbnail}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity duration-[var(--dur)] group-hover:opacity-90"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <span className="absolute inset-0 bg-overlay/40" aria-hidden />
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-fg/60 bg-bg/30 backdrop-blur transition-transform duration-[var(--dur)] ease-premium group-hover:scale-110">
        <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-fg" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  );
}
