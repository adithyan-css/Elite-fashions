"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { ShopQuery } from "@/lib/catalog-types";

type Props = { q: ShopQuery; sizes: string[]; brands: string[]; colours: string[]; maxPrice: number };

export function ShopFilters({ q, sizes, brands, colours, maxPrice }: Props) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);

  const apply = () => {
    const f = form.current;
    if (!f) return;
    const data = new FormData(f);
    const params = new URLSearchParams();
    for (const [k, v] of data.entries()) if (typeof v === "string" && v) params.set(k, v);
    router.push(`/shop${params.size ? `?${params}` : ""}`, { scroll: false });
  };

  const select = "input h-10 py-0 pr-8 text-sm";
  const priceSteps = [1000, 1500, 2000, 2500, 3000].filter((x) => x < maxPrice + 500);

  return (
    <form
      ref={form}
      method="get"
      action="/shop"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="flex flex-wrap items-center gap-2"
      aria-label="Filter dresses"
    >
      {q.category && <input type="hidden" name="category" value={q.category} />}
      {q.q && <input type="hidden" name="q" value={q.q} />}
      {q.tag && <input type="hidden" name="tag" value={q.tag} />}
      <span className="mr-1 hidden items-center gap-1.5 text-sm font-medium text-muted sm:inline-flex">
        <SlidersHorizontal className="h-4 w-4" /> Filter
      </span>
      <select name="size" defaultValue={q.size ?? ""} onChange={apply} className={`${select} w-auto`} aria-label="Size">
        <option value="">Any size</option>
        {sizes.map((s) => (
          <option key={s} value={s}>
            Size {s}
          </option>
        ))}
      </select>
      <select name="brand" defaultValue={q.brand ?? ""} onChange={apply} className={`${select} w-auto`} aria-label="Brand">
        <option value="">All brands</option>
        {brands.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <select name="colour" defaultValue={q.colour ?? ""} onChange={apply} className={`${select} w-auto`} aria-label="Colour">
        <option value="">All colours</option>
        {colours.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select name="max" defaultValue={q.max ? String(q.max) : ""} onChange={apply} className={`${select} w-auto`} aria-label="Maximum price">
        <option value="">Any price</option>
        {priceSteps.map((p) => (
          <option key={p} value={p}>
            Under ₹{p.toLocaleString("en-IN")}
          </option>
        ))}
      </select>
      <select name="sort" defaultValue={q.sort ?? "new"} onChange={apply} className={`${select} w-auto sm:ml-auto`} aria-label="Sort by">
        <option value="new">Featured & newest</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
      <noscript>
        <button className="btn-primary h-10" type="submit">
          Apply
        </button>
      </noscript>
    </form>
  );
}
