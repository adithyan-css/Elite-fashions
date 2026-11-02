"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { MAX_QTY, useCart } from "@/store/cart";
import { formatPrice } from "@/lib/money";
import { WishButton } from "./WishButton";

type Props = {
  product: { id: number; slug: string; name: string; designNo: string; image: string; pricePaise: number };
  sizes: { label: string; stock: number }[];
};

export function ProductPurchase({ product, sizes }: Props) {
  const firstAvailable = sizes.find((s) => s.stock > 0)?.label ?? "";
  const [size, setSize] = useState(sizes.length === 1 ? firstAvailable : "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const add = useCart((s) => s.add);
  const router = useRouter();
  const chosen = sizes.find((s) => s.label === size);
  const maxQty = Math.min(MAX_QTY, chosen?.stock ?? MAX_QTY);
  const soldOut = sizes.every((s) => s.stock <= 0);
  const sizeBox = useRef<HTMLFieldSetElement>(null);
  const mainButtons = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  // Phones: keep "Add to cart" in reach while the shopper scrolls photos and details.
  useEffect(() => {
    const el = mainButtons.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting), { rootMargin: "0px 0px -90px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [soldOut]);
  // Reserve room under the page so the sticky bar never covers the footer.
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => (document.body.style.paddingBottom = mq.matches ? `${el.offsetHeight}px` : "");
    apply();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(apply);
    ro?.observe(el);
    mq.addEventListener("change", apply);
    return () => {
      ro?.disconnect();
      mq.removeEventListener("change", apply);
      document.body.style.paddingBottom = "";
    };
  }, [soldOut]);

  const barAdd = () => {
    if (doAdd()) return;
    sizeBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const doAdd = () => {
    if (!size) {
      setError("Please choose a size");
      return false;
    }
    add({ productId: product.id, slug: product.slug, name: product.name, designNo: product.designNo, image: product.image, sizeLabel: size, pricePaise: product.pricePaise }, qty);
    setAdded(true);
    setError("");
    return true;
  };

  return (
    <div ref={mainButtons} className="space-y-5">
      <fieldset ref={sizeBox} className="scroll-mt-24">
        <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold text-ink">
          <span>Size {size && <span className="font-normal text-muted">· {size}</span>}</span>
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose size">
          {sizes.map((s) => {
            const out = s.stock <= 0;
            const on = size === s.label;
            return (
              <button
                key={s.label}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={out}
                onClick={() => {
                  setSize(s.label);
                  setQty(1);
                  setError("");
                  setAdded(false);
                }}
                className={`relative h-11 min-w-14 rounded-xl border px-4 text-sm font-semibold transition ${
                  on ? "border-magenta bg-magenta text-white" : out ? "cursor-not-allowed border-sand bg-cream text-muted/60 line-through" : "border-sand bg-white text-ink hover:border-magenta"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {chosen && chosen.stock > 0 && chosen.stock <= 2 && <p className="mt-2 text-xs font-medium text-danger">Only {chosen.stock} left in size {chosen.label}</p>}
        {error && (
          <p className="mt-2 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
      </fieldset>

      {!soldOut && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Qty</span>
          <div className="flex items-center rounded-full border border-sand bg-white">
            <button type="button" aria-label="Decrease quantity" className="grid h-10 w-10 place-items-center disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-semibold" aria-live="polite">
              {qty}
            </span>
            <button type="button" aria-label="Increase quantity" className="grid h-10 w-10 place-items-center disabled:opacity-40" disabled={qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {soldOut ? (
        <p className="rounded-2xl bg-cream p-4 text-sm">This design is sold out right now. Ask us on WhatsApp, we may be restocking soon.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={doAdd} className="btn-primary h-12 text-base">
            {added ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
            {added ? "Added to cart" : "Add to cart"}
          </button>
          <button type="button" onClick={() => doAdd() && router.push("/checkout")} className="btn-gold h-12 text-base">
            <Zap className="h-5 w-5" /> Buy now
          </button>
        </div>
      )}
      {added && (
        <p className="text-sm text-success" role="status">
          Added size {size}.{" "}
          <Link href="/cart" className="font-semibold underline">
            View cart
          </Link>
        </p>
      )}
      {!soldOut && (
        <div
          ref={bar}
          className={`fixed inset-x-0 bottom-0 z-40 !m-0 border-t border-sand bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-200 lg:hidden ${
            showBar ? "translate-y-0" : "translate-y-full"
          }`}
          aria-hidden={!showBar}
          data-testid="sticky-buy-bar"
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted">{size ? `Size ${size}${qty > 1 ? ` × ${qty}` : ""}` : "Choose a size"}</p>
              <p className="text-lg leading-tight font-semibold text-plum">{formatPrice(product.pricePaise * qty)}</p>
            </div>
            <button type="button" tabIndex={showBar ? 0 : -1} onClick={barAdd} className="btn-primary h-12 shrink-0 px-6 text-base">
              {added ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
              {added ? "Added" : size ? "Add to cart" : "Select size"}
            </button>
            {added && (
              <Link href="/cart" tabIndex={showBar ? 0 : -1} className="btn-gold h-12 shrink-0 px-4 text-base">
                Cart
              </Link>
            )}
          </div>
        </div>
      )}
      <WishButton withLabel className="w-full" item={{ productId: product.id, slug: product.slug, name: product.name, image: product.image, pricePaise: product.pricePaise, designNo: product.designNo }} />
    </div>
  );
}
