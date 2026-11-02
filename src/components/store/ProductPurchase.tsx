"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { MAX_QTY, useCart } from "@/store/cart";
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
    <div className="space-y-5">
      <fieldset>
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
      <WishButton withLabel className="w-full" item={{ productId: product.id, slug: product.slug, name: product.name, image: product.image, pricePaise: product.pricePaise, designNo: product.designNo }} />
    </div>
  );
}
