/** Langues supportées. Le français est la langue par défaut (colonnes de base). */
export const SUPPORTED_LANGS = ["fr", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: Lang = "fr";

export function isLang(value: unknown): value is Lang {
  return value === "fr" || value === "en";
}

export function coerceLang(value: unknown): Lang {
  return isLang(value) ? value : DEFAULT_LANG;
}

/** Sac de traductions : { en: { champ: valeur } }. */
export type I18nBag = Partial<Record<Lang, Record<string, string>>>;

/**
 * Valeur localisée : si une traduction existe et n'est pas vide pour `lang`,
 * on l'utilise ; sinon on retombe sur `base` (français).
 */
export function localized(
  base: string,
  i18n: I18nBag | null | undefined,
  lang: Lang,
  field: string,
): string {
  if (lang === DEFAULT_LANG || !i18n) return base;
  const value = i18n[lang]?.[field];
  return value !== undefined && value.trim() !== "" ? value : base;
}

/** Champs traduisibles par entité (clés utilisées dans le sac i18n). */
export const TRANSLATABLE_FIELDS = {
  settings: ["tagline", "description", "seoDefaultTitle", "seoDefaultDesc", "studioHistory", "studioVision"],
  artist: ["roleTitle", "bio"],
  project: ["title", "description"],
  service: ["title", "summary", "description", "priceNote"],
  product: ["name", "description"],
  teamMember: ["roleTitle", "bio"],
} as const;
