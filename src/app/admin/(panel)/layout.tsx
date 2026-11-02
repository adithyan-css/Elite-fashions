import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { getAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Elite Fashions" }, robots: { index: false, follow: false } };

async function WhoAmI() {
  const a = await getAdmin();
  return a ? <span className="text-xs text-white/60">Signed in as {a.name}</span> : null;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen bg-[#f6f2ec]">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-plum p-5 lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-2.5">
          <Image src="/brand/logo.png" alt="" width={36} height={36} className="rounded-full ring-2 ring-gold/60" />
          <span className="font-display text-lg font-semibold text-white">Elite Admin</span>
        </Link>
        <Suspense fallback={<div className="h-56" />}>
          <AdminNav variant="side" />
        </Suspense>
        <div className="mt-auto space-y-3">
          <Link href="/" target="_blank" className="flex items-center gap-2 text-xs text-gold-soft hover:text-white">
            View store <ExternalLink className="h-3 w-3" />
          </Link>
          <Suspense fallback={null}>
            <WhoAmI />
          </Suspense>
        </div>
      </aside>
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <header className="flex items-center justify-between bg-plum px-4 py-3 lg:hidden">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/brand/logo.png" alt="" width={30} height={30} className="rounded-full" />
            <span className="font-display font-semibold text-white">Elite Admin</span>
          </Link>
          <Link href="/" target="_blank" className="text-xs text-gold-soft">
            View store
          </Link>
        </header>
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-sand/40" aria-hidden />}>{children}</Suspense>
        </div>
      </div>
      <Suspense fallback={null}>
        <AdminNav variant="bottom" />
      </Suspense>
    </div>
  );
}
