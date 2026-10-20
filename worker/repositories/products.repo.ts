import type { Env } from "../types";
import { getSql, query, queryOne, withTransaction, type PoolClient } from "../db/client";
import { toMediaDTO, type MediaRow } from "../lib/media-url";
import { ensureUniqueSlug } from "../lib/slug";
import { offset, paginated } from "../lib/http";
import { localized, type I18nBag, type Lang } from "@shared/i18n";
import type {
  ProductSummaryDTO,
  ProductDetailDTO,
  ProductVariantDTO,
  Paginated,
  ContentStatus,
} from "@shared/types";
import type { ProductInput, ProductVariantInput } from "@shared/validation";

interface VariantRow {
  id: string;
  sku: string;
  option_size: string;
  option_color: string;
  price_xaf: number | null;
  stock: number;
  status: "active" | "inactive";
  sort_order: number;
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  base_price_xaf: number;
  status: ContentStatus;
  sort_order?: number;
  cover_media_id?: string | null;
  cover: MediaRow | null;
  from_price?: number;
  in_stock?: boolean;
  images?: MediaRow[];
  variants?: VariantRow[];
  i18n: I18nBag;
}

export function variantLabel(size: string, color: string): string {
  const parts = [size, color].map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts.join(" / ") : "Standard";
}

function toVariantDTO(basePrice: number, v: VariantRow): ProductVariantDTO {
  const price = v.price_xaf ?? basePrice;
  return {
    id: v.id,
    sku: v.sku,
    optionSize: v.option_size,
    optionColor: v.option_color,
    label: variantLabel(v.option_size, v.option_color),
    priceXaf: price,
    stock: v.stock,
    status: v.status,
    available: v.status === "active" && v.stock > 0,
  };
}

const COVER_JSON = "(SELECT to_jsonb(m) FROM media m WHERE m.id = p.cover_media_id) AS cover";

function toSummary(env: Env, r: ProductRow, lang: Lang): ProductSummaryDTO {
  return {
    id: r.id,
    slug: r.slug,
    name: localized(r.name, r.i18n, lang, "name"),
    category: r.category,
    cover: toMediaDTO(env, r.cover),
    fromPriceXaf: r.from_price ?? r.base_price_xaf,
    inStock: r.in_stock ?? false,
  };
}

export async function listPublic(
  env: Env,
  opts: { page: number; pageSize: number; category?: string; lang: Lang },
): Promise<Paginated<ProductSummaryDTO>> {
  const sql = getSql(env);
  const conds = ["p.status = 'published'"];
  const params: unknown[] = [];
  if (opts.category) {
    params.push(opts.category);
    conds.push(`p.category = $${params.length}`);
  }
  const where = `WHERE ${conds.join(" AND ")}`;
  params.push(opts.pageSize, offset(opts.page, opts.pageSize));

  const rows = await query<ProductRow>(
    sql,
    `SELECT p.id, p.slug, p.name, p.category, p.base_price_xaf, p.i18n, ${COVER_JSON},
       COALESCE((SELECT min(COALESCE(v.price_xaf, p.base_price_xaf))
                 FROM product_variants v WHERE v.product_id = p.id AND v.status = 'active'),
                p.base_price_xaf) AS from_price,
       EXISTS(SELECT 1 FROM product_variants v
              WHERE v.product_id = p.id AND v.status = 'active' AND v.stock > 0) AS in_stock
     FROM products p ${where}
     ORDER BY p.sort_order ASC, p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const totalRow = await queryOne<{ count: string }>(
    sql,
    `SELECT count(*)::text AS count FROM products p ${where}`,
    params.slice(0, opts.category ? 1 : 0),
  );
  return paginated(rows.map((r) => toSummary(env, r, opts.lang)), opts.page, opts.pageSize, Number(totalRow?.count ?? 0));
}

export async function listCategories(env: Env): Promise<string[]> {
  const rows = await query<{ category: string }>(
    getSql(env),
    `SELECT DISTINCT category FROM products WHERE status = 'published' AND category <> '' ORDER BY category ASC`,
  );
  return rows.map((r) => r.category);
}

const DETAIL_SELECT = `
  SELECT p.id, p.slug, p.name, p.description, p.category, p.base_price_xaf, p.status, p.sort_order, p.cover_media_id, p.i18n,
    ${COVER_JSON},
    COALESCE((SELECT json_agg(to_jsonb(m) ORDER BY pi.sort_order)
              FROM product_images pi JOIN media m ON m.id = pi.media_id
              WHERE pi.product_id = p.id), '[]'::json) AS images,
    COALESCE((SELECT json_agg(to_jsonb(v) ORDER BY v.sort_order, v.sku)
              FROM product_variants v WHERE v.product_id = p.id), '[]'::json) AS variants
  FROM products p`;

export async function getPublicBySlug(env: Env, slug: string, lang: Lang): Promise<ProductDetailDTO | null> {
  const r = await queryOne<ProductRow>(getSql(env), `${DETAIL_SELECT} WHERE p.slug = $1 AND p.status = 'published' LIMIT 1`, [
    slug,
  ]);
  if (!r) return null;
  const variants = (r.variants ?? [])
    .filter((v) => v.status === "active")
    .map((v) => toVariantDTO(r.base_price_xaf, v));
  const images = (r.images ?? []).map((m) => toMediaDTO(env, m)!).filter(Boolean);
  const fromPrice = variants.length ? Math.min(...variants.map((v) => v.priceXaf)) : r.base_price_xaf;
  return {
    ...toSummary(env, { ...r, from_price: fromPrice, in_stock: variants.some((v) => v.available) }, lang),
    description: localized(r.description ?? "", r.i18n, lang, "description"),
    basePriceXaf: r.base_price_xaf,
    images,
    variants,
    status: r.status,
  };
}

/* ----------------------------- Administration ----------------------------- */

export async function adminList(
  env: Env,
  opts: { page: number; pageSize: number; status?: string; search?: string },
): Promise<Paginated<ProductSummaryDTO & { status: ContentStatus; stockTotal: number }>> {
  const sql = getSql(env);
  const conds: string[] = [];
  const params: unknown[] = [];
  if (opts.status) {
    params.push(opts.status);
    conds.push(`p.status = $${params.length}`);
  }
  if (opts.search) {
    params.push(`%${opts.search}%`);
    conds.push(`p.name ILIKE $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  params.push(opts.pageSize, offset(opts.page, opts.pageSize));

  const rows = await query<ProductRow & { stock_total: number }>(
    sql,
    `SELECT p.id, p.slug, p.name, p.category, p.base_price_xaf, p.status, p.i18n, ${COVER_JSON},
       COALESCE((SELECT min(COALESCE(v.price_xaf, p.base_price_xaf)) FROM product_variants v
                 WHERE v.product_id = p.id AND v.status='active'), p.base_price_xaf) AS from_price,
       COALESCE((SELECT sum(v.stock) FROM product_variants v WHERE v.product_id = p.id), 0) AS stock_total,
       EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.status='active' AND v.stock>0) AS in_stock
     FROM products p ${where}
     ORDER BY p.sort_order ASC, p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const totalRow = await queryOne<{ count: string }>(
    sql,
    `SELECT count(*)::text AS count FROM products p ${where}`,
    params.slice(0, conds.length),
  );
  const items = rows.map((r) => ({ ...toSummary(env, r, "fr"), status: r.status, stockTotal: Number(r.stock_total) }));
  return paginated(items, opts.page, opts.pageSize, Number(totalRow?.count ?? 0));
}

export async function adminGet(env: Env, id: string) {
  const r = await queryOne<ProductRow>(getSql(env), `${DETAIL_SELECT} WHERE p.id = $1 LIMIT 1`, [id]);
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description ?? "",
    category: r.category,
    basePriceXaf: r.base_price_xaf,
    coverMediaId: r.cover_media_id ?? null,
    cover: toMediaDTO(env, r.cover),
    imageMediaIds: (r.images ?? []).map((m) => m.id),
    images: (r.images ?? []).map((m) => toMediaDTO(env, m)!),
    status: r.status,
    sortOrder: r.sort_order ?? 0,
    i18n: r.i18n ?? {},
    variants: (r.variants ?? []).map((v) => ({
      id: v.id,
      sku: v.sku,
      optionSize: v.option_size,
      optionColor: v.option_color,
      priceXaf: v.price_xaf,
      stock: v.stock,
      status: v.status,
      sortOrder: v.sort_order,
    })),
  };
}

async function syncImages(client: PoolClient, productId: string, imageIds: string[]): Promise<void> {
  await client.query("DELETE FROM product_images WHERE product_id = $1", [productId]);
  let i = 0;
  for (const mediaId of imageIds) {
    await client.query(
      "INSERT INTO product_images (product_id, media_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [productId, mediaId, i++],
    );
  }
}

async function syncVariants(client: PoolClient, productId: string, variants: ProductVariantInput[]): Promise<void> {
  const existing = await client.query("SELECT id FROM product_variants WHERE product_id = $1", [productId]);
  const existingIds = new Set((existing.rows as { id: string }[]).map((r) => r.id));
  const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id as string));

  for (const id of existingIds) {
    if (!keepIds.has(id)) {
      await client.query("DELETE FROM product_variants WHERE id = $1", [id]);
    }
  }
  let i = 0;
  for (const v of variants) {
    if (v.id && existingIds.has(v.id)) {
      await client.query(
        `UPDATE product_variants SET sku=$1, option_size=$2, option_color=$3, price_xaf=$4,
           stock=$5, status=$6, sort_order=$7 WHERE id=$8`,
        [v.sku, v.optionSize ?? "", v.optionColor ?? "", v.priceXaf ?? null, v.stock, v.status, i++, v.id],
      );
    } else {
      await client.query(
        `INSERT INTO product_variants (product_id, sku, option_size, option_color, price_xaf, stock, status, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [productId, v.sku, v.optionSize ?? "", v.optionColor ?? "", v.priceXaf ?? null, v.stock, v.status, i++],
      );
    }
  }
}

export async function create(env: Env, input: ProductInput): Promise<string> {
  const sql = getSql(env);
  const slug = await ensureUniqueSlug(sql, "products", input.slug || input.name);
  return withTransaction(env, undefined, async (client) => {
    const res = await client.query(
      `INSERT INTO products (slug, name, description, category, base_price_xaf, cover_media_id, status, sort_order, i18n)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING id`,
      [
        slug,
        input.name,
        input.description ?? "",
        input.category ?? "",
        input.basePriceXaf,
        input.coverMediaId ?? null,
        input.status,
        input.sortOrder ?? 0,
        JSON.stringify(input.i18n ?? {}),
      ],
    );
    const productId = res.rows[0].id as string;
    await syncImages(client, productId, input.imageMediaIds ?? []);
    await syncVariants(client, productId, input.variants ?? []);
    return productId;
  });
}

export async function update(env: Env, id: string, input: ProductInput): Promise<boolean> {
  const sql = getSql(env);
  const slug = await ensureUniqueSlug(sql, "products", input.slug || input.name, id);
  return withTransaction(env, undefined, async (client) => {
    const res = await client.query(
      `UPDATE products SET slug=$1, name=$2, description=$3, category=$4, base_price_xaf=$5,
         cover_media_id=$6, status=$7, sort_order=$8, i18n=$9::jsonb WHERE id=$10 RETURNING id`,
      [
        slug,
        input.name,
        input.description ?? "",
        input.category ?? "",
        input.basePriceXaf,
        input.coverMediaId ?? null,
        input.status,
        input.sortOrder ?? 0,
        JSON.stringify(input.i18n ?? {}),
        id,
      ],
    );
    if (res.rows.length === 0) return false;
    await syncImages(client, id, input.imageMediaIds ?? []);
    await syncVariants(client, id, input.variants ?? []);
    return true;
  });
}

export async function updateVariantStock(env: Env, variantId: string, stock: number): Promise<boolean> {
  const rows = await query(
    getSql(env),
    "UPDATE product_variants SET stock = $1 WHERE id = $2 RETURNING id",
    [stock, variantId],
  );
  return rows.length > 0;
}

export async function setStatus(env: Env, id: string, status: ContentStatus): Promise<boolean> {
  const rows = await query(getSql(env), "UPDATE products SET status = $1 WHERE id = $2 RETURNING id", [
    status,
    id,
  ]);
  return rows.length > 0;
}

export async function remove(env: Env, id: string): Promise<boolean> {
  const rows = await query(getSql(env), "DELETE FROM products WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}
