import { useEffect, useRef } from "react";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __arkaneTurnstileLoading?: Promise<void>;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Clé de site : variable de build ; repli sur la clé de TEST en développement.
const SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ||
  (import.meta.env.DEV ? "1x00000000000000000000AA" : "");

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (window.__arkaneTurnstileLoading) return window.__arkaneTurnstileLoading;
  window.__arkaneTurnstileLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile introuvable"));
    document.head.appendChild(script);
  });
  return window.__arkaneTurnstileLoading;
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export function Turnstile({ onVerify, onExpire }: TurnstileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!SITE_KEY) return;

    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          callback: (token: string) => onVerify(token),
          "expired-callback": () => onExpire?.(),
          "error-callback": () => onExpire?.(),
        });
      })
      .catch(() => {
        /* script bloqué : le formulaire restera invérifiable, géré côté serveur */
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-fg-subtle">
        Protection anti-robot non configurée (VITE_TURNSTILE_SITE_KEY manquant).
      </p>
    );
  }

  return <div ref={ref} className="min-h-[65px]" />;
}
