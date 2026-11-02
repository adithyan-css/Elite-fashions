import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { CATEGORIES } from "@/db/seed-data";
import type { ProductCard, ProductDetail } from "./catalog-types";

export const PRODUCTS_TAG = "products";
export const SETTINGS_TAG = "settings";

export function categoryName(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug.replace(/-/g, " ");
}

async function loadAll(includeHidden: boolean): Promise<ProductCard[]> {
  const [rows, imgs, sizes] = await Promise.all([
    db.select().from(s.products).orderBy(asc(s.products.id)),
    db.select().from(s.productImages).orderBy(asc(s.productImages.sortOrder), asc(s.productImages.id)),
    db.select().from(s.productSizes).orderBy(asc(s.productSizes.sortOrder), asc(s.productSizes.id)),
  ]);
  return rows
    .filter((r) => includeHidden || r.isActive)
    .map((r) => {
      const img = imgs.find((i) => i.productId === r.id);
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        designNo: r.designNo,
        brand: r.brand,
        category: r.category,
        colour: r.colour,
        pricePaise: r.pricePaise,
        mrpPaise: r.mrpPaise,
        tags: r.tags ? r.tags.split(",").filter(Boolean) : [],
        isFeatured: r.isFeatured,
        image: img?.url ?? "/brand/logo.png",
        imageAlt: img?.alt || r.name,
        sizes: sizes.filter((z) => z.productId === r.id).map((z) => ({ label: z.label, stock: z.stock })),
        createdAt: r.createdAt.getTime(),
        groupKey: r.groupKey,
      };
    });
}

/** All visible products, cached until a product changes. */
export async function getCatalog(): Promise<ProductCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(PRODUCTS_TAG);
  return loadAll(false);
}

export async function getProductDetail(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PRODUCTS_TAG);
  // Reuse the cached catalogue, then fetch only this dress's description and photos.
  const all = await getCatalog();
  const card = all.find((p) => p.slug === slug);
  if (!card) return null;
  const [[row], images] = await Promise.all([
    db.select({ description: s.products.description }).from(s.products).where(eq(s.products.id, card.id)),
    db
      .select()
      .from(s.productImages)
      .where(eq(s.productImages.productId, card.id))
      .orderBy(asc(s.productImages.sortOrder), asc(s.productImages.id)),
  ]);
  const variants = card.groupKey
    ? all.filter((p) => p.groupKey === card.groupKey).map((p) => ({ slug: p.slug, colour: p.colour, image: p.image, name: p.name }))
    : [];
  return {
    ...card,
    description: row?.description ?? "",
    images: images.length ? images.map((i) => ({ url: i.url, alt: i.alt || card.name })) : [{ url: card.image, alt: card.imageAlt }],
    variants,
  };
}

export async function getSettings(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("hours");
  cacheTag(SETTINGS_TAG);
  const rows = await db.select().from(s.settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export type Facets = {
  categories: { slug: string; name: string; count: number }[];
  brands: string[];
  colours: string[];
  sizes: string[];
  maxPrice: number;
};

export function facetsFor(all: ProductCard[]): Facets {
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))];
  return {
    categories: CATEGORIES.map((c) => ({ slug: c.slug, name: c.name, count: all.filter((p) => p.category === c.slug).length })).filter(
      (c) => c.count > 0,
    ),
    brands: uniq(all.map((p) => p.brand)).sort(),
    colours: uniq(all.map((p) => p.colour)).sort(),
    sizes: uniq(all.flatMap((p) => p.sizes.map((z) => z.label))).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
    maxPrice: Math.max(0, ...all.map((p) => Math.ceil(p.pricePaise / 100))),
  };
}

/** Uncached read used by admin screens and by server-side order pricing. */
export async function getAllProductsFresh(includeHidden = true) {
  return loadAll(includeHidden);
}
