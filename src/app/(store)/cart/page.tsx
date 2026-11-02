import type { Metadata } from "next";
import { CartView } from "@/components/store/CartView";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-semibold text-plum sm:text-4xl">Your cart</h1>
      <div className="mt-8">
        <CartView />
      </div>
    </div>
  );
}
