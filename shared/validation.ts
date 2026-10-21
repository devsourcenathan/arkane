import { z } from "zod";
import { ALLOWED_THEMES, ALLOWED_PALETTES } from "./theme";

/* ============================================================================
 * Primitives réutilisables
 * ========================================================================== */
export const CONTENT_STATUS = ["draft", "published", "archived"] as const;
export const statusSchema = z.enum(CONTENT_STATUS);

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide (minuscules, chiffres et tirets).");

// Slug optionnel : vide ("") = génération automatique depuis le nom/titre.
export const optionalSlugSchema = z.union([slugSchema, z.literal("")]).optional();

export const uuidSchema = z.string().uuid();

/** Pagination bornée pour toutes les listes. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  // Plafond à 200 : certains sélecteurs admin (ex. choix d'artiste dans le formulaire
  // Projet) chargent la liste complète en une requête. Payload borné, reste raisonnable.
  pageSize: z.coerce.number().int().min(1).max(200).default(24),
});

/** URL vidéo : http(s) uniquement, longueur bornée (anti-abus). */
export const videoUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "URL vidéo invalide (http/https).")
  .optional()
  .default("");

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Lien invalide (http/https).")
  .optional()
  .default("");

const emailOptional = z.union([z.string().trim().email().max(180), z.literal("")]).optional();
const price = z.number().int().min(0).max(100_000_000);

/** Traductions : { en: { champ: valeur } }. Le français vit dans les colonnes de base. */
export const i18nInputSchema = z
  .object({
    en: z.record(z.string(), z.string().max(10000)).optional(),
  })
  .optional()
  .default({});

/* ============================================================================
 * Formulaires publics
 * ========================================================================== */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court.").max(120),
  email: z.union([z.string().trim().email("Email invalide."), z.literal("")]).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  subject: z.string().trim().min(2, "Sujet trop court.").max(160),
  message: z.string().trim().min(5, "Message trop court.").max(4000),
  turnstileToken: z.string().min(1, "Vérification anti-robot requise.").max(4096),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const orderItemInputSchema = z.object({
  variantId: uuidSchema,
  quantity: z.number().int().min(1).max(99),
});
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

/**
 * Création de commande : AUCUN prix n'est fourni par le client.
 * Le serveur relit prix et stocks depuis la base et calcule les totaux.
 */
export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "Panier vide.").max(50),
  customer: z.object({
    name: z.string().trim().min(2, "Nom trop court.").max(120),
    phone: z.string().trim().min(6, "Téléphone requis.").max(30),
    email: z.union([z.string().trim().email("Email invalide."), z.literal("")]).optional().default(""),
    note: z.string().trim().max(1000).optional().default(""),
  }),
  turnstileToken: z.string().min(1, "Vérification anti-robot requise.").max(4096),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/* ============================================================================
 * Authentification admin
 * ========================================================================== */
export const loginSchema = z.object({
  email: z.string().trim().email("Email invalide.").max(180),
  password: z.string().min(1, "Mot de passe requis.").max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

/* ============================================================================
 * Entrées CRUD admin
 * ========================================================================== */
const socialLinks = {
  socialInstagram: optionalUrl,
  socialYoutube: optionalUrl,
  socialSpotify: optionalUrl,
  socialAppleMusic: optionalUrl,
  socialTiktok: optionalUrl,
  socialX: optionalUrl,
};

export const artistInputSchema = z.object({
  slug: optionalSlugSchema,
  name: z.string().trim().min(1, "Nom requis.").max(160),
  roleTitle: z.string().trim().max(160).optional().default(""),
  bio: z.string().trim().max(8000).optional().default(""),
  portraitMediaId: z.union([uuidSchema, z.null()]).optional(),
  ...socialLinks,
  i18n: i18nInputSchema,
  status: statusSchema.default("draft"),
  sortOrder: z.number().int().min(0).max(100000).optional().default(0),
});
export type ArtistInput = z.infer<typeof artistInputSchema>;

export const projectInputSchema = z.object({
  slug: optionalSlugSchema,
  title: z.string().trim().min(1, "Titre requis.").max(200),
  category: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(10000).optional().default(""),
  coverMediaId: z.union([uuidSchema, z.null()]).optional(),
  videoUrl: videoUrlSchema,
  releaseDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)."), z.literal(""), z.null()])
    .optional(),
  status: statusSchema.default("draft"),
  featured: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).max(100000).optional().default(0),
  artistIds: z.array(uuidSchema).max(50).optional().default([]),
  i18n: i18nInputSchema,
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const serviceInputSchema = z.object({
  slug: optionalSlugSchema,
  title: z.string().trim().min(1, "Titre requis.").max(200),
  summary: z.string().trim().max(400).optional().default(""),
  description: z.string().trim().max(10000).optional().default(""),
  priceFromXaf: z.union([price, z.null()]).optional(),
  priceNote: z.string().trim().max(160).optional().default(""),
  coverMediaId: z.union([uuidSchema, z.null()]).optional(),
  i18n: i18nInputSchema,
  status: statusSchema.default("draft"),
  sortOrder: z.number().int().min(0).max(100000).optional().default(0),
});
export type ServiceInput = z.infer<typeof serviceInputSchema>;

export const productVariantInputSchema = z.object({
  id: uuidSchema.optional(),
  sku: z.string().trim().min(1, "SKU requis.").max(80),
  optionSize: z.string().trim().max(40).optional().default(""),
  optionColor: z.string().trim().max(40).optional().default(""),
  priceXaf: z.union([price, z.null()]).optional(),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  status: z.enum(["active", "inactive"]).default("active"),
  sortOrder: z.number().int().min(0).max(100000).optional().default(0),
});
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;

export const productInputSchema = z.object({
  slug: optionalSlugSchema,
  name: z.string().trim().min(1, "Nom requis.").max(200),
  description: z.string().trim().max(10000).optional().default(""),
  category: z.string().trim().max(80).optional().default(""),
  basePriceXaf: price,
  coverMediaId: z.union([uuidSchema, z.null()]).optional(),
  imageMediaIds: z.array(uuidSchema).max(12).optional().default([]),
  status: statusSchema.default("draft"),
  sortOrder: z.number().int().min(0).max(100000).optional().default(0),
  variants: z.array(productVariantInputSchema).max(60).optional().default([]),
  i18n: i18nInputSchema,
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const orderStatusSchema = z.enum(["pending", "confirmed", "fulfilled", "cancelled"]);
export const paymentStatusSchema = z.enum(["unpaid", "paid", "refunded"]);

export const updateOrderStatusSchema = z.object({
  orderStatus: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  internalNotes: z.string().trim().max(5000).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const messageStatusSchema = z.enum(["new", "read", "archived"]);
export const updateMessageSchema = z.object({ status: messageStatusSchema });

export const mediaUpdateSchema = z.object({ alt: z.string().trim().max(300) });

export const siteSettingsSchema = z.object({
  studioName: z.string().trim().min(1).max(160),
  tagline: z.string().trim().max(240).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  contactEmail: emailOptional.default(""),
  contactPhone: z.string().trim().max(40).optional().default(""),
  whatsappNumber: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^\d{6,18}$/.test(v), "Numéro WhatsApp : chiffres uniquement, format international sans +.")
    .optional()
    .default(""),
  address: z.string().trim().max(400).optional().default(""),
  socialInstagram: optionalUrl,
  socialYoutube: optionalUrl,
  socialFacebook: optionalUrl,
  socialTiktok: optionalUrl,
  socialX: optionalUrl,
  socialSpotify: optionalUrl,
  theme: z.enum(ALLOWED_THEMES),
  palette: z.enum(ALLOWED_PALETTES),
  seoDefaultTitle: z.string().trim().min(1).max(160),
  seoDefaultDesc: z.string().trim().max(320).optional().default(""),
  ogImageMediaId: z.union([uuidSchema, z.null()]).optional(),
  studioHistory: z.string().trim().max(6000).optional().default(""),
  studioVision: z.string().trim().max(6000).optional().default(""),
  studioRules: z
    .array(z.object({ fr: z.string().trim().max(200), en: z.string().trim().max(200).optional().default("") }))
    .max(12)
    .optional()
    .default([]),
  i18n: i18nInputSchema,
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

export const teamMemberInputSchema = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(160),
  roleTitle: z.string().trim().max(160).optional().default(""),
  bio: z.string().trim().max(4000).optional().default(""),
  photoMediaId: z.union([uuidSchema, z.null()]).optional(),
  status: statusSchema.default("draft"),
  sortOrder: z.number().int().min(0).max(100000).optional().default(0),
  i18n: i18nInputSchema,
});
export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;
