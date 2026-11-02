import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
import { CATEGORIES } from "@/db/seed-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const products = await getCatalog();
  return [
    { url: `${site}/`, changeFrequency: "daily", priority: 1 },
    { url: `${site}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/about`, changeFrequency: "monthly", priority: 0.6 },
    ...CATEGORIES.map((c) => ({ url: `${site}/shop?category=${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${site}/product/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8, images: [`${site}${p.image}`] })),
  ];
}
