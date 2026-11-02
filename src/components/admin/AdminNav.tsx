"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Settings, ShoppingCart, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/account", label: "Account", icon: UserRound },
];

export function AdminNav({ variant }: { variant: "side" | "bottom" }) {
  const path = usePathname();
  const active = (h: string, exact?: boolean) => (exact ? path === h : path === h || path.startsWith(h + "/"));
  if (variant === "bottom")
    return (
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-sand bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Admin">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(i.href, i.exact) ? "text-magenta" : "text-muted"}`}>
            <i.icon className="h-5 w-5" />
            {i.label}
          </Link>
        ))}
      </nav>
    );
  return (
    <nav className="space-y-1" aria-label="Admin">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active(i.href, i.exact) ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
        >
          <i.icon className="h-4 w-4" />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
