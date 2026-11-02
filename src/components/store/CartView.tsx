"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { refreshCart } from "@/app/actions/order";
import { cartTotal, MAX_QTY, useCart } from "@/store/cart";
import { useHydrated } from "@/store/hydrated";
import { formatPrice } from "@/lib/money";

export function CartView() {
  const hydrated = useHydrated();
  const { lines, setQty, remove, sync } = useCart();
  const [stock, setStock] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!hydrated || !lines.length) return;
    let alive = true;
    refreshCart(lines.map((l) => ({ productId: l.productId, sizeLabel: l.sizeLabel, qty: l.qty }))).then((r) => {
      if (!alive) return;
      const removed = r.lines.filter((x) => x.remove).length;
      const changed = r.lines.some((x) => x.pricePaise && lines.find((l) => l.key === x.key)?.pricePaise !== x.pricePaise);
      sync(r.lines);
      setStock(Object.fromEntries(r.lines.filter((x) => x.stock !== undefined).map((x) => [x.key, x.stock!])));
      if (removed) setNotice(`${removed} item${removed > 1 ? "s are" : " is"} no longer available and ${removed > 1 ? "were" : "was"} removed.`);
      else if (changed) setNotice("Prices were updated to the latest.");
    });
    return () => {
      alive = false;
    };
    // run once per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-3xl bg-sand/40" aria-hidden />;

  if (!lines.length)
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <ShoppingBag className="h-12 w-12 text-muted" />
        <h2 className="mt-4 text-2xl font-semibold text-plum">Your cart is empty</h2>
        <p className="mt-1 text-muted">Find something lovely for her this festive season.</p>
        <Link href="/shop" className="btn-primary mt-6">
          Start shopping
        </Link>
      </div>
    );

  const total = cartTotal(lines);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        {notice && (
          <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            {notice}
          </p>
        )}
        <ul className="divide-y divide-sand/70 rounded-3xl border border-sand/70 bg-white">
          {lines.map((l) => {
            const max = Math.min(MAX_QTY, stock[l.key] ?? MAX_QTY);
            const short = stock[l.key] !== undefined && stock[l.key] < l.qty;
            return (
              <li key={l.key} className="flex gap-4 p-4" data-testid="cart-line">
                <Link href={`/product/${l.slug}`} className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-xl bg-cream sm:w-24">
                  <Image src={l.image} alt={l.name} fill sizes="96px" className="object-cover object-top" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/product/${l.slug}`} className="line-clamp-2 font-medium hover:text-magenta">
                        {l.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        D.No. {l.designNo} · Size {l.sizeLabel}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatPrice(l.pricePaise * l.qty)}</p>
                  </div>
                  {short && <p className="mt-1 text-xs font-medium text-danger">Only {stock[l.key]} left in this size</p>}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-full border border-sand">
                      <button className="grid h-9 w-9 place-items-center disabled:opacity-40" aria-label={`Decrease ${l.name}`} disabled={l.qty <= 1} onClick={() => setQty(l.key, l.qty - 1)}>
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-7 text-center text-sm font-semibold">{l.qty}</span>
                      <button className="grid h-9 w-9 place-items-center disabled:opacity-40" aria-label={`Increase ${l.name}`} disabled={l.qty >= max} onClick={() => setQty(l.key, l.qty + 1)}>
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button className="inline-flex items-center gap-1 text-sm text-muted hover:text-danger" onClick={() => remove(l.key)} aria-label={`Remove ${l.name}`}>
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <aside className="h-fit rounded-3xl border border-sand/70 bg-white p-6 lg:sticky lg:top-24">
        <h2 className="font-sans text-lg font-semibold">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Items ({lines.reduce((n, l) => n + l.qty, 0)})</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd className="text-muted">Confirmed on WhatsApp</dd>
          </div>
          <div className="gold-rule my-3" />
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd data-testid="cart-total">{formatPrice(total)}</dd>
          </div>
        </dl>
        <Link href="/checkout" className="btn-primary mt-6 h-12 w-full text-base">
          Checkout on WhatsApp
        </Link>
        <p className="mt-3 text-center text-xs text-muted">No online payment here. You pay by UPI after we confirm on WhatsApp.</p>
      </aside>
    </div>
  );
}
