import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Owner sign in", robots: { index: false, follow: false } };

async function Gate({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  if (await getAdmin()) redirect("/admin");
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/admin") ? sp.next : "";
  return <LoginForm next={next} />;
}

export default function LoginPage(props: PageProps<"/admin/login">) {
  return (
    <main className="festive-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-ivory p-7 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/brand/logo.png" alt="" width={56} height={56} className="rounded-full ring-2 ring-gold/60" />
          <h1 className="mt-3 text-2xl font-semibold text-plum">Elite Fashions</h1>
          <p className="text-sm text-muted">Owner sign in</p>
        </div>
        <Suspense fallback={<div className="h-56 animate-pulse rounded-2xl bg-sand/40" />}>
          <Gate searchParams={props.searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
