import type { Metadata } from "next";
import { getSettings } from "@/lib/catalog";
import { WishlistView } from "@/components/store/WishlistView";

export const metadata: Metadata = { title: "Your wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const s = await getSettings();
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-semibold text-plum sm:text-4xl">Your wishlist</h1>
      <div className="mt-6">
        <WishlistView whatsapp={s.whatsapp} storeName={s.store_name} siteUrl={process.env.NEXT_PUBLIC_SITE_URL || ""} />
      </div>
    </div>
  );
}
