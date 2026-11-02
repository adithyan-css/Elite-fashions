import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { adminProducts } from "@/lib/admin-data";
import { categoryName, getSettings } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { ToggleActive } from "@/components/admin/ProductRowActions";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage(props: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase().slice(0, 60) : "";
  const [all, settings] = await Promise.all([adminProducts(), getSettings()]);
  const list = q ? all.filter((p) => `${p.name} ${p.designNo} ${p.brand} ${p.colour}`.toLowerCase().includes(q)) : all;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-plum sm:text-3xl">Products</h1>
          <p className="text-sm text-muted">
            {all.length} products · {all.filter((p) => p.isActive).length} live
          </p>
        </div>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add product
        </Link>
      </div>
      {settings.prices_are_placeholders === "1" && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The starting catalogue has <strong>placeholder prices and stock (3 per size)</strong>. Open each product and set the real price and stock before launch, then turn this notice off in Settings.
        </p>
      )}
      <form className="mt-5" role="search">
        <input name="q" defaultValue={q} className="input max-w-sm" placeholder="Search name, design no., colour" aria-label="Search products" />
      </form>
      <ul className="mt-5 grid gap-3">
        {list.map((p) => (
          <li key={p.id} className="card flex items-center gap-3 p-3" data-testid="admin-product">
            <div className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg bg-cream">
              <Image src={p.image} alt="" fill sizes="56px" className="object-cover object-top" />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/admin/products/${p.id}`} className="line-clamp-1 font-medium hover:text-magenta">
                {p.name}
              </Link>
              <p className="text-xs text-muted">
                D.No. {p.designNo || "—"} · {p.brand || "—"} · {categoryName(p.category)}
              </p>
              <p className="mt-0.5 text-xs">
                {p.sizes.map((z) => (
                  <span key={z.id} className={`mr-2 ${z.stock === 0 ? "text-danger line-through" : z.stock <= 1 ? "text-gold" : "text-muted"}`}>
                    {z.label}:{z.stock}
                  </span>
                ))}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-sm font-semibold">{formatPrice(p.pricePaise)}</span>
              <ToggleActive id={p.id} active={p.isActive} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
