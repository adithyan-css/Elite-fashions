import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { categoryName, facetsFor, getCatalog } from "@/lib/catalog";
import { filterProducts, parseShopQuery, type ShopQuery } from "@/lib/catalog-types";
import { ProductCard } from "@/components/store/ProductCard";
import { ShopFilters } from "@/components/store/ShopFilters";

export const metadata: Metadata = {
  title: "Shop festive & party wear for girls",
  description: "Lehenga cholis, sharara sets, jacket palazzo sets and skirt sets for girls. Filter by size, colour and price.",
};

function href(q: ShopQuery, patch: Partial<ShopQuery>) {
  const next = { ...q, ...patch };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return `/shop${s ? `?${s}` : ""}`;
}

async function Results({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const q = parseShopQuery(await searchParams);
  const all = await getCatalog();
  const facets = facetsFor(all);
  const list = filterProducts(all, q);
  const title = q.q ? `Results for “${q.q}”` : q.category ? categoryName(q.category) : q.tag === "new" ? "New arrivals" : "All dresses";
  const active = [q.size && `Size ${q.size}`, q.brand, q.colour, q.max && `Under ₹${q.max.toLocaleString("en-IN")}`].filter(Boolean);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-plum sm:text-4xl">{title}</h1>
          <p className="mt-1 text-sm text-muted" data-testid="result-count">
            {list.length} {list.length === 1 ? "style" : "styles"}
            {active.length ? ` · ${active.join(" · ")}` : ""}
          </p>
        </div>
      </div>

      <nav className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Categories">
        <Link href={href(q, { category: undefined })} className={`chip shrink-0 px-4 py-2 text-sm ${!q.category ? "border-magenta bg-magenta text-white" : "hover:border-magenta"}`}>
          All
        </Link>
        {facets.categories.map((c) => (
          <Link
            key={c.slug}
            href={href(q, { category: c.slug })}
            aria-current={q.category === c.slug ? "page" : undefined}
            className={`chip shrink-0 px-4 py-2 text-sm ${q.category === c.slug ? "border-magenta bg-magenta text-white" : "hover:border-magenta"}`}
          >
            {c.name} <span className="ml-1.5 opacity-70">{c.count}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-4 border-y border-sand/70 py-3">
        <ShopFilters key={JSON.stringify(q)} q={q} sizes={facets.sizes} brands={facets.brands} colours={facets.colours} maxPrice={facets.maxPrice} />
      </div>

      {list.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <SearchX className="h-10 w-10 text-muted" />
          <p className="mt-3 text-lg font-medium">No dresses match these filters</p>
          <p className="mt-1 text-sm text-muted">Try another size or colour, or ask us on WhatsApp. New stock arrives often.</p>
          <Link href="/shop" className="btn-primary mt-6">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
          {list.map((p, i) => (
            <ProductCard key={p.id} p={p} priority={i < 4} />
          ))}
        </div>
      )}
    </>
  );
}

function GridSkeleton() {
  return (
    <div aria-hidden>
      <div className="h-10 w-56 animate-pulse rounded-xl bg-sand/60" />
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-[var(--radius-card)] bg-sand/50" />
        ))}
      </div>
    </div>
  );
}

export default function ShopPage(props: PageProps<"/shop">) {
  return (
    <div className="container-x py-10">
      <Suspense fallback={<GridSkeleton />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
