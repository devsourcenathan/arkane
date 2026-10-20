import { useEffect } from "react";

interface MetaOptions {
  title?: string;
  description?: string;
  image?: string | null;
  type?: string;
}

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

const SUFFIX = "Arkane Production";

/**
 * Gère les métadonnées de la page (titre + description + Open Graph) côté client.
 * Pour les crawlers exécutant JS (dont Google), elles sont lues après rendu.
 */
export function useDocumentMeta({ title, description, image, type = "website" }: MetaOptions): void {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SUFFIX}` : SUFFIX;
    document.title = fullTitle;

    if (description) setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    if (description) setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", type);
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", SUFFIX);
    if (image) setMeta('meta[property="og:image"]', "property", "og:image", image);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", image ? "summary_large_image" : "summary");
  }, [title, description, image, type]);
}
