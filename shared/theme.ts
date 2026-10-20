/** Thèmes et palettes autorisés — validés côté serveur avant persistance. */
export const ALLOWED_THEMES = ["dark", "light"] as const;
export type ThemeName = (typeof ALLOWED_THEMES)[number];

export const ALLOWED_PALETTES = ["default", "ink"] as const;
export type PaletteName = (typeof ALLOWED_PALETTES)[number];

export function isTheme(value: unknown): value is ThemeName {
  return typeof value === "string" && (ALLOWED_THEMES as readonly string[]).includes(value);
}

export function isPalette(value: unknown): value is PaletteName {
  return typeof value === "string" && (ALLOWED_PALETTES as readonly string[]).includes(value);
}
