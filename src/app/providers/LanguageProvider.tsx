import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { coerceLang, DEFAULT_LANG, type Lang } from "@shared/i18n";
import { setApiLang } from "@/lib/api";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Renvoie la chaîne selon la langue courante : t('français', 'english'). */
  t: (fr: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "arkane_lang";

function detectInitial(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return coerceLang(stored);
  } catch {
    /* ignore */
  }
  try {
    if (navigator.language?.toLowerCase().startsWith("en")) return "en";
  } catch {
    /* ignore */
  }
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitial);

  // Rend la langue disponible pour le client API dès le premier rendu.
  setApiLang(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setApiLang(next);
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((fr: string, en: string) => (lang === "en" ? en : fr), [lang]);

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang doit être utilisé dans un LanguageProvider");
  return ctx;
}
