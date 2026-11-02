import Image from "next/image";
import Link from "next/link";
import type { ProductCard as P } from "@/lib/catalog-types";
import { inStock } from "@/lib/catalog-types";
import { discountPercent, formatPrice } from "@/lib/money";
import { WishButton } from "./WishButton";

export function ProductCard({ p, priority = false }: { p: P; priority?: boolean }) {
  const off = discountPercent(p.pricePaise, p.mrpPaise);
  const available = inStock(p);
  return (
    <article className="group relative" data-testid="product-card">
      <Link href={`/product/${p.slug}`} className="block overflow-hidden rounded-[var(--radius-card)] bg-cream">
        <div className="relative aspect-[3/4]">
          <Image
            src={p.image}
            alt={p.imageAlt}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
            className={`object-cover object-top transition duration-500 group-hover:scale-[1.04] ${available ? "" : "opacity-60 grayscale-[30%]"}`}
            priority={priority}
          />
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
            {p.tags.includes("new") && <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold tracking-wider text-magenta uppercase shadow-sm">New</span>}
            {off > 0 && <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold tracking-wider text-white uppercase shadow-sm">{off}% off</span>}
            {!available && <span className="rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white uppercase">Sold out</span>}
          </div>
        </div>
      </Link>
      <WishButton
        item={{ productId: p.id, slug: p.slug, name: p.name, image: p.image, pricePaise: p.pricePaise, designNo: p.designNo }}
        className="absolute top-2.5 right-2.5"
      />
      <div className="px-1 pt-3">
        <p className="text-[11px] font-medium tracking-wider text-muted uppercase">
          {p.brand} · D.No. {p.designNo}
        </p>
        <h3 className="mt-1 line-clamp-2 font-sans text-sm leading-snug font-medium text-ink sm:text-[15px]">
          <Link href={`/product/${p.slug}`} className="hover:text-magenta">
            {p.name}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="text-base font-semibold text-plum">{formatPrice(p.pricePaise)}</span>
          {off > 0 && p.mrpPaise && <span className="text-xs text-muted line-through">{formatPrice(p.mrpPaise)}</span>}
        </p>
      </div>
    </article>
  );
}
