import type { Env } from "../types";
import { getSql, query, queryOne } from "../db/client";
import { toMediaDTO, type MediaRow } from "../lib/media-url";
import { localized, type I18nBag, type Lang } from "@shared/i18n";
import type { SiteSettingsDTO } from "@shared/types";
import type { SiteSettingsInput } from "@shared/validation";

interface SettingsRow {
  studio_name: string;
  tagline: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  address: string;
  social_instagram: string;
  social_youtube: string;
  social_facebook: string;
  social_tiktok: string;
  social_x: string;
  social_spotify: string;
  theme: "dark" | "light";
  palette: "default" | "ink";
  seo_default_title: string;
  seo_default_desc: string;
  og_image_media_id: string | null;
  studio_history: string;
  studio_vision: string;
  studio_rules: { fr: string; en: string }[];
  i18n: I18nBag;
}

async function fetchRow(env: Env): Promise<SettingsRow> {
  const sql = getSql(env);
  let row = await queryOne<SettingsRow>(sql, "SELECT * FROM site_settings WHERE id = 1");
  if (!row) {
    await query(sql, "INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING");
    row = await queryOne<SettingsRow>(sql, "SELECT * FROM site_settings WHERE id = 1");
  }
  if (!row) throw new Error("site_settings introuvable");
  return row;
}

export async function getPublicSettings(env: Env, lang: Lang): Promise<SiteSettingsDTO> {
  const row = await fetchRow(env);
  let ogUrl: string | null = null;
  if (row.og_image_media_id) {
    const og = await queryOne<MediaRow>(getSql(env), "SELECT * FROM media WHERE id = $1", [
      row.og_image_media_id,
    ]);
    ogUrl = og ? toMediaDTO(env, og)!.url : null;
  }
  return {
    studioName: row.studio_name,
    tagline: localized(row.tagline, row.i18n, lang, "tagline"),
    description: localized(row.description, row.i18n, lang, "description"),
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    whatsappNumber: row.whatsapp_number,
    whatsappConfigured: row.whatsapp_number.length > 0,
    address: row.address,
    socials: {
      instagram: row.social_instagram,
      youtube: row.social_youtube,
      facebook: row.social_facebook,
      tiktok: row.social_tiktok,
      x: row.social_x,
      spotify: row.social_spotify,
    },
    theme: row.theme,
    palette: row.palette,
    seo: {
      defaultTitle: localized(row.seo_default_title, row.i18n, lang, "seoDefaultTitle"),
      defaultDescription: localized(row.seo_default_desc, row.i18n, lang, "seoDefaultDesc"),
      ogImageUrl: ogUrl,
    },
    studio: {
      history: localized(row.studio_history, row.i18n, lang, "studioHistory"),
      vision: localized(row.studio_vision, row.i18n, lang, "studioVision"),
      rules: (row.studio_rules ?? [])
        .map((r) => (lang === "en" && r.en?.trim() ? r.en : r.fr))
        .filter((r) => r.trim() !== ""),
    },
  };
}

/** Objet éditable (camelCase) pour l'administration. */
export async function getAdminSettings(env: Env) {
  const row = await fetchRow(env);
  let ogImage = null;
  if (row.og_image_media_id) {
    const og = await queryOne<MediaRow>(getSql(env), "SELECT * FROM media WHERE id = $1", [
      row.og_image_media_id,
    ]);
    ogImage = toMediaDTO(env, og);
  }
  return {
    ogImage,
    studioName: row.studio_name,
    tagline: row.tagline,
    description: row.description,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    whatsappNumber: row.whatsapp_number,
    address: row.address,
    socialInstagram: row.social_instagram,
    socialYoutube: row.social_youtube,
    socialFacebook: row.social_facebook,
    socialTiktok: row.social_tiktok,
    socialX: row.social_x,
    socialSpotify: row.social_spotify,
    theme: row.theme,
    palette: row.palette,
    seoDefaultTitle: row.seo_default_title,
    seoDefaultDesc: row.seo_default_desc,
    ogImageMediaId: row.og_image_media_id,
    studioHistory: row.studio_history,
    studioVision: row.studio_vision,
    studioRules: row.studio_rules ?? [],
    i18n: row.i18n ?? {},
  };
}

export async function getWhatsappNumber(env: Env): Promise<string> {
  const row = await fetchRow(env);
  return row.whatsapp_number;
}

export async function updateSettings(env: Env, input: SiteSettingsInput): Promise<void> {
  const sql = getSql(env);
  await fetchRow(env); // garantit l'existence de la ligne
  await query(
    sql,
    `UPDATE site_settings SET
       studio_name = $1, tagline = $2, description = $3,
       contact_email = $4, contact_phone = $5, whatsapp_number = $6, address = $7,
       social_instagram = $8, social_youtube = $9, social_facebook = $10,
       social_tiktok = $11, social_x = $12, social_spotify = $13,
       theme = $14, palette = $15, seo_default_title = $16, seo_default_desc = $17,
       og_image_media_id = $18, studio_history = $19, studio_vision = $20,
       studio_rules = $21::jsonb, i18n = $22::jsonb
     WHERE id = 1`,
    [
      input.studioName,
      input.tagline ?? "",
      input.description ?? "",
      input.contactEmail ?? "",
      input.contactPhone ?? "",
      input.whatsappNumber ?? "",
      input.address ?? "",
      input.socialInstagram ?? "",
      input.socialYoutube ?? "",
      input.socialFacebook ?? "",
      input.socialTiktok ?? "",
      input.socialX ?? "",
      input.socialSpotify ?? "",
      input.theme,
      input.palette,
      input.seoDefaultTitle,
      input.seoDefaultDesc ?? "",
      input.ogImageMediaId ?? null,
      input.studioHistory ?? "",
      input.studioVision ?? "",
      JSON.stringify(input.studioRules ?? []),
      JSON.stringify(input.i18n ?? {}),
    ],
  );
}
