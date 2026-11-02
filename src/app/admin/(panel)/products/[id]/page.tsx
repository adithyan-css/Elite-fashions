import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { adminProduct, knownBrands } from "@/lib/admin-data";
import { CATEGORIES } from "@/db/seed-data";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProduct(props: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [data, brands] = await Promise.all([adminProduct(id), knownBrands()]);
  if (!data) notFound();
  const { p, sizes, images } = data;
  return (
    <>
      <Link href="/admin/products" className="text-sm text-muted hover:text-magenta">
        ← Products
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-plum">{p.name}</h1>
      <ProductForm
        categories={[...CATEGORIES]}
        brands={brands}
        initial={{
          id: p.id,
          slug: p.slug,
          name: p.name,
          designNo: p.designNo,
          brand: p.brand,
          category: p.category,
          colour: p.colour,
          description: p.description,
          price: String(p.pricePaise / 100),
          mrp: p.mrpPaise ? String(p.mrpPaise / 100) : "",
          tags: p.tags.split(",").filter(Boolean),
          isFeatured: p.isFeatured,
          isActive: p.isActive,
          groupKey: p.groupKey ?? "",
          sizes: sizes.map((z) => ({ label: z.label, stock: String(z.stock) })),
          images: images.map((i) => ({ url: i.url, alt: i.alt })),
        }}
      />
    </>
  );
}
