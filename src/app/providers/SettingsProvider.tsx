import { createContext, useContext, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useLang } from "@/app/providers/LanguageProvider";
import type { SiteSettingsDTO } from "@shared/types";

interface SettingsContextValue {
  settings: SiteSettingsDTO | null;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({ settings: null, loading: true });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const { data, loading } = useApi(() => api.get<SiteSettingsDTO>("/site-settings"), [lang]);

  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    root.dataset.theme = data.theme;
    if (data.palette && data.palette !== "default") {
      root.dataset.palette = data.palette;
    } else {
      delete root.dataset.palette;
    }
  }, [data]);

  return (
    <SettingsContext.Provider value={{ settings: data, loading }}>{children}</SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
