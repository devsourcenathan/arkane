import { useLang } from "@/app/providers/LanguageProvider";
import { SUPPORTED_LANGS } from "@shared/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`inline-flex items-center rounded-full border border-border ${className}`} role="group" aria-label="Langue">
      {SUPPORTED_LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
            lang === l ? "bg-fg text-fg-inverted" : "text-fg-muted hover:text-fg"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
