import { Suspense } from "react";
import { getSettings } from "@/lib/catalog";
import { AnnouncementBar, Footer, Header } from "@/components/store/Chrome";
import { WhatsAppFab } from "@/components/store/WhatsAppFab";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const s = await getSettings();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <AnnouncementBar text={`${s.banner_title} · Order on WhatsApp · Pay by UPI`} />
      <Header storeName={s.store_name} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer s={s} />
      <Suspense fallback={null}>
        <WhatsAppFab number={s.whatsapp} storeName={s.store_name} />
      </Suspense>
    </>
  );
}
