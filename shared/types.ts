/**
 * DTO renvoyés par l'API (formes sérialisées JSON).
 * Partagés entre le Worker (production) et le frontend (consommation).
 */
export type ContentStatus = "draft" | "published" | "archived";
export type OrderStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type VariantStatus = "active" | "inactive";
export type MessageStatus = "new" | "read" | "archived";

export interface MediaDTO {
  id: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  contentType?: string;
  filename?: string;
  sizeBytes?: number;
  createdAt?: string;
}

export interface SocialLinks {
  instagram: string;
  youtube: string;
  facebook: string;
  tiktok: string;
  x: string;
  spotify: string;
  appleMusic?: string;
}

export interface SiteSettingsDTO {
  studioName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  whatsappConfigured: boolean;
  address: string;
  socials: SocialLinks;
  theme: "dark" | "light";
  palette: "default" | "ink";
  seo: { defaultTitle: string; defaultDescription: string; ogImageUrl: string | null };
  studio: { history: string; vision: string; rules: string[] };
}

export interface TeamMemberDTO {
  id: string;
  name: string;
  roleTitle: string;
  bio: string;
  photo: MediaDTO | null;
}

export interface ArtistSummaryDTO {
  id: string;
  slug: string;
  name: string;
  roleTitle: string;
  portrait: MediaDTO | null;
}

export interface ArtistDetailDTO extends ArtistSummaryDTO {
  bio: string;
  socials: { instagram: string; youtube: string; spotify: string; appleMusic: string; tiktok: string; x: string };
  status: ContentStatus;
  projects: ProjectSummaryDTO[];
}

export interface ProjectSummaryDTO {
  id: string;
  slug: string;
  title: string;
  category: string;
  cover: MediaDTO | null;
  releaseDate: string | null;
  featured: boolean;
  artists: { id: string; slug: string; name: string }[];
}

export interface ProjectDetailDTO extends ProjectSummaryDTO {
  description: string;
  videoUrl: string;
  status: ContentStatus;
}

export interface ServiceDTO {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  priceFromXaf: number | null;
  priceNote: string;
  cover: MediaDTO | null;
  status: ContentStatus;
}

export interface ProductVariantDTO {
  id: string;
  sku: string;
  optionSize: string;
  optionColor: string;
  label: string;
  priceXaf: number;
  stock: number;
  status: VariantStatus;
  available: boolean;
}

export interface ProductSummaryDTO {
  id: string;
  slug: string;
  name: string;
  category: string;
  cover: MediaDTO | null;
  fromPriceXaf: number;
  inStock: boolean;
}

export interface ProductDetailDTO extends ProductSummaryDTO {
  description: string;
  basePriceXaf: number;
  images: MediaDTO[];
  variants: ProductVariantDTO[];
  status: ContentStatus;
}

export interface OrderItemDTO {
  id: string;
  productName: string;
  variantLabel: string;
  sku: string;
  unitPriceXaf: number;
  quantity: number;
  lineTotalXaf: number;
}

export interface OrderDTO {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNote: string;
  subtotalXaf: number;
  totalXaf: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItemDTO[];
  createdAt: string;
}

/** Vue publique d'une commande (consultation par référence + jeton) — sans notes internes. */
export interface OrderPublicDTO {
  reference: string;
  customerName: string;
  totalXaf: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItemDTO[];
  createdAt: string;
  whatsappNumber: string;
}

/** Résultat de création de commande renvoyé au client. */
export interface OrderCreatedDTO {
  reference: string;
  lookupToken: string;
  totalXaf: number;
  currency: string;
  whatsappNumber: string;
  items: OrderItemDTO[];
}

export interface ContactMessageDTO {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: MessageStatus;
  createdAt: string;
  readAt: string | null;
}

export interface AdminUserDTO {
  id: string;
  email: string;
  displayName: string | null;
  lastLoginAt: string | null;
}

export interface DashboardDTO {
  counts: {
    projects: number;
    artists: number;
    team: number;
    services: number;
    products: number;
    ordersPending: number;
    messagesNew: number;
  };
  lowStock: { productName: string; sku: string; label: string; stock: number }[];
  recentOrders: Pick<OrderDTO, "id" | "reference" | "customerName" | "totalXaf" | "orderStatus" | "paymentStatus" | "createdAt">[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Enveloppe d'erreur standard de l'API. */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
