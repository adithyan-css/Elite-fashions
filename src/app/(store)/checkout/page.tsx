import type { Metadata } from "next";
import { getSettings } from "@/lib/catalog";
import { CheckoutForm } from "@/components/store/CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const s = await getSettings();
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-semibold text-plum sm:text-4xl">Checkout</h1>
      <p className="mt-1 text-muted">Two quick steps: your details here, then send the order on WhatsApp.</p>
      <div className="mt-8">
        <CheckoutForm storeAddress={`${s.address_line}, ${s.city}`} />
      </div>
    </div>
  );
}
