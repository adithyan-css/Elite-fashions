export type ProductCard = {
  id: number;
  slug: string;
  name: string;
  designNo: string;
  brand: string;
  category: string;
  colour: string;
  pricePaise: number;
  mrpPaise: number | null;
  tags: string[];
  isFeatured: boolean;
  image: string;
  imageAlt: string;
  sizes: { label: string; stock: number }[];
  createdAt: number;
  groupKey: string | null;
};

export type ProductDetail = ProductCard & {
  description: string;
  images: { url: string; alt: string }[];
  variants: { slug: string; colour: string; image: string; name: string }[];
};

export type ShopQuery = {
  category?: string;
  brand?: string;
  size?: string;
  colour?: string;
  q?: string;
  sort?: "new" | "price-asc" | "price-desc";
  max?: number; // rupees
  tag?: string;
};

export function inStock(p: Pick<ProductCard, "sizes">): boolean {
  return p.sizes.some((s) => s.stock > 0);
}

export function filterProducts(all: ProductCard[], q: ShopQuery): ProductCard[] {
  const needle = (q.q ?? "").trim().toLowerCase();
  let list = all.filter((p) => {
    if (q.category && p.category !== q.category) return false;
    if (q.brand && p.brand !== q.brand) return false;
    if (q.colour && p.colour.toLowerCase() !== q.colour.toLowerCase()) return false;
    if (q.size && !p.sizes.some((s) => s.label === q.size && s.stock > 0)) return false;
    if (q.max && p.pricePaise > q.max * 100) return false;
    if (q.tag && !p.tags.includes(q.tag)) return false;
    if (needle) {
      const hay = `${p.name} ${p.designNo} ${p.brand} ${p.colour} ${p.category.replace(/-/g, " ")}`.toLowerCase();
      if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const sort = q.sort ?? "new";
  list = [...list].sort((a, b) => {
    if (sort === "price-asc") return a.pricePaise - b.pricePaise || a.id - b.id;
    if (sort === "price-desc") return b.pricePaise - a.pricePaise || a.id - b.id;
    return Number(b.isFeatured) - Number(a.isFeatured) || b.createdAt - a.createdAt || a.id - b.id;
  });
  return list;
}

export function parseShopQuery(sp: Record<string, string | string[] | undefined>): ShopQuery {
  const one = (k: string) => {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.length <= 80 ? s : undefined;
  };
  const sort = one("sort");
  const max = Number(one("max"));
  return {
    category: one("category"),
    brand: one("brand"),
    size: one("size"),
    colour: one("colour"),
    q: one("q"),
    tag: one("tag"),
    sort: sort === "price-asc" || sort === "price-desc" || sort === "new" ? sort : undefined,
    max: Number.isFinite(max) && max > 0 ? max : undefined,
  };
}
