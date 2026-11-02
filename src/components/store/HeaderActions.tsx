"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import { cartCount, useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useHydrated } from "@/store/hydrated";
import { NAV } from "./nav";

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function HeaderActions() {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const wish = useWishlist((s) => s.items);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");

  // While the menu is open: no background scrolling, Esc closes it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const router = useRouter();

  const cartN = hydrated ? cartCount(lines) : 0;
  const wishN = hydrated ? wish.length : 0;

  return (
    <>
      <div className="flex shrink-0 items-center gap-0 min-[390px]:gap-1 sm:gap-2">
        <button
          type="button"
          aria-label="Search"
          onClick={() => setSearching((v) => !v)}
          className="relative grid h-9 w-9 place-items-center min-[390px]:h-10 min-[390px]:w-10 rounded-full text-ink hover:bg-magenta-50"
        >
          <Search className="h-5 w-5" />
        </button>
        <Link
          href="/wishlist"
          aria-label={`Wishlist, ${wishN} items`}
          className="relative grid h-9 w-9 place-items-center min-[390px]:h-10 min-[390px]:w-10 rounded-full text-ink hover:bg-magenta-50"
        >
          <Heart className="h-5 w-5" />
          <Badge n={wishN} />
        </Link>
        <Link
          href="/cart"
          aria-label={`Cart, ${cartN} items`}
          className="relative grid h-9 w-9 place-items-center min-[390px]:h-10 min-[390px]:w-10 rounded-full text-ink hover:bg-magenta-50"
        >
          <ShoppingBag className="h-5 w-5" />
          <Badge n={cartN} />
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-magenta-50 min-[390px]:h-10 min-[390px]:w-10 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {searching && (
        <form
          role="search"
          className="absolute inset-x-0 top-full border-b border-sand bg-white/95 py-3 backdrop-blur"
          onSubmit={(e) => {
            e.preventDefault();
            setSearching(false);
            router.push(
              q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop",
            );
          }}
        >
          <div className="container-x flex gap-2">
            <input
              autoFocus
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search dresses, colours or design no. (e.g. 7870)"
              aria-label="Search the collection"
              maxLength={60}
            />
            <button className="btn-primary shrink-0" type="submit">
              Search
            </button>
          </div>
        </form>
      )}

      {open &&
        createPortal(
          // Rendered on <body>: the header's blur would otherwise trap this panel inside the header strip.
          <div
            className="fixed inset-0 z-[70] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <button
              className="absolute inset-0 bg-plum/60 backdrop-blur-sm"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <nav className="absolute top-0 right-0 flex h-dvh w-[82%] max-w-sm flex-col gap-1 overflow-y-auto bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-xl font-semibold text-plum">
                  Menu
                </span>
                <button
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-magenta-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-ink hover:bg-magenta-50"
                >
                  {n.label}
                </Link>
              ))}
              <div className="gold-rule my-4" />
              <Link
                href="/wishlist"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-base text-ink hover:bg-magenta-50"
              >
                Wishlist {wishN ? `(${wishN})` : ""}
              </Link>
              <Link
                href="/cart"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-base text-ink hover:bg-magenta-50"
              >
                Cart {cartN ? `(${cartN})` : ""}
              </Link>
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
