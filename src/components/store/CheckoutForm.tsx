"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock, MessageCircle, Store, Truck } from "lucide-react";
import { placeOrder } from "@/app/actions/order";
import { cartTotal, useCart } from "@/store/cart";
import { useHydrated } from "@/store/hydrated";
import { formatPrice } from "@/lib/money";

export function CheckoutForm({ storeAddress }: { storeAddress: string }) {
  const hydrated = useHydrated();
  const { lines, clear, sync } = useCart();
  const router = useRouter();
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">("pickup");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, start] = useTransition();

  if (!hydrated) return <div className="h-96 animate-pulse rounded-3xl bg-sand/40" aria-hidden />;
  if (!lines.length)
    return (
      <div className="py-16 text-center">
        {formError && (
          <p className="mx-auto mb-6 max-w-md rounded-xl bg-rose-50 px-4 py-3 text-sm text-danger" role="alert">
            {formError}
          </p>
        )}
        <p className="text-lg font-medium">Your cart is empty.</p>
        <Link href="/shop" className="btn-primary mt-6">
          Browse dresses
        </Link>
      </div>
    );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // onSubmit (not a form action) so React does not reset the fields after a failed attempt
    const fd = new FormData(e.currentTarget);
    setErrors({});
    setFormError("");
    start(async () => {
      const res = await placeOrder({
        customerName: String(fd.get("customerName") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        fulfilment,
        address: String(fd.get("address") ?? ""),
        note: String(fd.get("note") ?? ""),
        company: String(fd.get("company") ?? ""),
        items: lines.map((l) => ({ productId: l.productId, sizeLabel: l.sizeLabel, qty: l.qty })),
      });
      if (res.ok) {
        clear();
        router.replace(`/order/${res.orderNo}?t=${res.token}&new=1`);
        return;
      }
      setFormError(res.error);
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.unavailable?.length) sync(res.unavailable.map((key) => ({ key, remove: true })));
    });
  };

  const err = (k: string) =>
    errors[k] ? (
      <p className="mt-1 text-xs font-medium text-danger" id={`${k}-err`}>
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_380px]" noValidate>
      <div className="space-y-6">
        <section className="card p-5 sm:p-6">
          <h2 className="font-sans text-lg font-semibold">Your details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="customerName">
                Full name
              </label>
              <input className="input" id="customerName" name="customerName" autoComplete="name" required maxLength={60} aria-invalid={!!errors.customerName} aria-describedby="customerName-err" />
              {err("customerName")}
            </div>
            <div>
              <label className="label" htmlFor="phone">
                WhatsApp number
              </label>
              <div className="flex">
                <span className="grid place-items-center rounded-l-xl border border-r-0 border-sand bg-cream px-3 text-sm text-muted">+91</span>
                <input
                  className="input rounded-l-none"
                  id="phone"
                  name="phone"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  required
                  maxLength={16}
                  aria-invalid={!!errors.phone}
                  aria-describedby="phone-err"
                />
              </div>
              {err("phone")}
            </div>
          </div>
          {/* honeypot */}
          <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-sans text-lg font-semibold">How would you like to get it?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Pickup or delivery">
            {(
              [
                { v: "pickup", icon: Store, t: "Store pickup", d: storeAddress },
                { v: "delivery", icon: Truck, t: "Home delivery", d: "Delivery charge, if any, is confirmed on WhatsApp" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={fulfilment === o.v}
                onClick={() => setFulfilment(o.v)}
                className={`flex gap-3 rounded-2xl border p-4 text-left transition ${fulfilment === o.v ? "border-magenta bg-magenta-50 ring-1 ring-magenta" : "border-sand bg-white hover:border-magenta/50"}`}
              >
                <o.icon className="mt-0.5 h-5 w-5 shrink-0 text-magenta" />
                <span>
                  <span className="block font-semibold">{o.t}</span>
                  <span className="block text-xs text-muted">{o.d}</span>
                </span>
              </button>
            ))}
          </div>
          {fulfilment === "delivery" && (
            <div className="mt-4">
              <label className="label" htmlFor="address">
                Delivery address
              </label>
              <textarea className="input min-h-24" id="address" name="address" autoComplete="street-address" maxLength={300} aria-invalid={!!errors.address} aria-describedby="address-err" placeholder="House no., street, area, city, PIN code" />
              {err("address")}
            </div>
          )}
          <div className="mt-4">
            <label className="label" htmlFor="note">
              Note for the shop <span className="font-normal text-muted">(optional)</span>
            </label>
            <input className="input" id="note" name="note" maxLength={300} placeholder="e.g. Needed before Saturday" />
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-3xl border border-sand/70 bg-white p-5 sm:p-6 lg:sticky lg:top-24">
        <h2 className="font-sans text-lg font-semibold">Your order</h2>
        <ul className="mt-4 space-y-3">
          {lines.map((l) => (
            <li key={l.key} className="flex gap-3">
              <div className="relative aspect-[3/4] w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                <Image src={l.image} alt="" fill sizes="48px" className="object-cover object-top" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="line-clamp-1 font-medium">{l.name}</p>
                <p className="text-xs text-muted">
                  Size {l.sizeLabel} · Qty {l.qty}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatPrice(l.pricePaise * l.qty)}</p>
            </li>
          ))}
        </ul>
        <div className="gold-rule my-4" />
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatPrice(cartTotal(lines))}</span>
        </div>
        {formError && (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-danger" role="alert">
            {formError}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-whatsapp mt-5 h-12 w-full text-base">
          <MessageCircle className="h-5 w-5" /> {pending ? "Placing order…" : "Place order on WhatsApp"}
        </button>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          We save your order, then open WhatsApp with it typed out. Pay by UPI once we confirm. No card details needed.
        </p>
      </aside>
    </form>
  );
}
