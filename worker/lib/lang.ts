import type { Context } from "hono";
import { coerceLang, type Lang } from "@shared/i18n";

/** Langue demandée : en-tête X-Lang, à défaut le paramètre ?lang, sinon français. */
export function getLang(c: Context): Lang {
  return coerceLang(c.req.header("x-lang") || c.req.query("lang") || undefined);
}

export type { Lang };
