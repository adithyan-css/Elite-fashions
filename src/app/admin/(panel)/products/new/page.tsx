import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { knownBrands } from "@/lib/admin-data";
import { CATEGORIES } from "@/db/seed-data";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProduct() {
  await requireAdmin();
  const brands = await knownBrands();
  return (
    <>
      <Link href="/admin/products" className="text-sm text-muted hover:text-magenta">
        ← Products
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold text-plum">Add product</h1>
      <ProductForm
        categories={[...CATEGORIES]}
        brands={brands}
        initial={{ name: "", designNo: "", brand: "", category: CATEGORIES[0].slug, colour: "", description: "", price: "", mrp: "", tags: ["new"], isFeatured: false, isActive: true, groupKey: "", sizes: [{ label: "", stock: "1" }], images: [] }}
      />
    </>
  );
}
