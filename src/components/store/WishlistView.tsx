"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { useWishlist } from "@/store/wishlist";
import { useHydrated } from "@/store/hydrated";
import { formatPrice } from "@/lib/money";
import { waLink } from "@/lib/whatsapp";

export function WishlistView({ whatsapp, storeName, siteUrl }: { whatsapp: string; storeName: string; siteUrl: string }) {
  const hydrated = useHydrated();
  const { items, remove } = useWishlist();
  if (!hydrated) return <div className="h-64 animate-pulse rounded-3xl bg-sand/40" aria-hidden />;
  if (!items.length)
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Heart className="h-12 w-12 text-muted" />
        <h2 className="mt-4 text-2xl font-semibold text-plum">No favourites yet</h2>
        <p className="mt-1 text-muted">Tap the heart on any dress to save it here.</p>
        <Link href="/shop" className="btn-primary mt-6">
          Browse dresses
        </Link>
      </div>
    );
  const msg = [`Hi ${storeName}! I liked these dresses:`, "", ...items.map((i, k) => `${k + 1}. ${i.name} (D.No. ${i.designNo}) - ${siteUrl}/product/${i.slug}`), "", "Are they available?"].join(
    "\n",
  );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{items.length} saved</p>
        <a href={waLink(whatsapp, msg)} target="_blank" rel="noopener" className="btn-whatsapp">
          <MessageCircle className="h-4 w-4" /> Ask about all on WhatsApp
        </a>
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
        {items.map((i) => (
          <li key={i.productId} data-testid="wish-item">
            <Link href={`/product/${i.slug}`} className="relative block aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-cream">
              <Image src={i.image} alt={i.name} fill sizes="(min-width: 1280px) 22vw, 45vw" className="object-cover object-top" />
            </Link>
            <p className="mt-3 line-clamp-2 text-sm font-medium">{i.name}</p>
            <p className="mt-1 font-semibold text-plum">{formatPrice(i.pricePaise)}</p>
            <div className="mt-2 flex gap-2">
              <Link href={`/product/${i.slug}`} className="btn-primary flex-1 px-3 py-2 text-xs">
                Choose size
              </Link>
              <button onClick={() => remove(i.productId)} className="btn-outline px-3 py-2" aria-label={`Remove ${i.name} from wishlist`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
