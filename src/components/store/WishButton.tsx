"use client";

import { Heart } from "lucide-react";
import { useWishlist, type WishItem } from "@/store/wishlist";
import { useHydrated } from "@/store/hydrated";

export function WishButton({ item, className = "", withLabel = false }: { item: WishItem; className?: string; withLabel?: boolean }) {
  const hydrated = useHydrated();
  const toggle = useWishlist((s) => s.toggle);
  const saved = useWishlist((s) => s.items.some((i) => i.productId === item.productId)) && hydrated;

  if (withLabel) {
    return (
      <button type="button" onClick={() => toggle(item)} aria-pressed={saved} className={`btn-outline ${className}`}>
        <Heart className={`h-4 w-4 ${saved ? "fill-magenta" : ""}`} />
        {saved ? "Saved to wishlist" : "Add to wishlist"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}
      className={`grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-110 ${className}`}
    >
      <Heart className={`h-[18px] w-[18px] ${saved ? "fill-magenta text-magenta" : "text-ink"}`} />
    </button>
  );
}
