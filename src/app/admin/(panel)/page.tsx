import Link from "next/link";
import { AlertTriangle, Clock, IndianRupee, PackageCheck, ShoppingCart } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { dashboardStats } from "@/lib/admin-data";
import { formatPrice } from "@/lib/money";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/orders";

const dt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function Dashboard() {
  const admin = await requireAdmin();
  const d = await dashboardStats();
  const tiles = [
    { label: "Orders today", value: String(d.todayOrders), icon: ShoppingCart, href: "/admin/orders" },
    { label: "Awaiting payment", value: String(d.awaiting), icon: Clock, href: "/admin/orders?status=awaiting_payment" },
    { label: "Paid, to pack", value: String(d.toPack), icon: PackageCheck, href: "/admin/orders?status=paid" },
    { label: "Sales this month", value: formatPrice(d.monthSalesPaise), icon: IndianRupee, href: "/admin/orders?status=paid", sub: `${d.monthPaidOrders} paid orders` },
  ];
  return (
    <>
      <h1 className="text-2xl font-semibold text-plum sm:text-3xl">Vanakkam, {admin.name}</h1>
      <p className="text-sm text-muted">Here&apos;s how the shop is doing.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card p-4 transition hover:border-magenta/40">
            <t.icon className="h-5 w-5 text-magenta" />
            <p className="mt-3 text-2xl font-semibold text-ink" data-testid={`stat-${t.label}`}>
              {t.value}
            </p>
            <p className="text-xs text-muted">{t.sub ?? t.label}</p>
            {t.sub && <p className="text-xs text-muted">{t.label}</p>}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-base font-semibold">Latest orders</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-magenta">
              All orders
            </Link>
          </div>
          {d.recent.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No orders yet. Share the store link on Instagram and WhatsApp to get the first one.</p>
          ) : (
            <ul className="mt-3 divide-y divide-sand/60">
              {d.recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-magenta">
                    <span className="min-w-0">
                      <span className="block font-medium">{o.orderNo}</span>
                      <span className="block truncate text-xs text-muted">
                        {o.customerName} · {dt.format(o.createdAt)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold">{formatPrice(o.totalPaise)}</span>
                      <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-sans text-base font-semibold">
            <AlertTriangle className="h-4 w-4 text-gold" /> Low stock
          </h2>
          {d.lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-muted">All sizes have 2 or more pieces.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {d.lowStock.map((x) => (
                <li key={`${x.id}-${x.size}`} className="flex justify-between gap-2">
                  <Link href={`/admin/products/${x.id}`} className="truncate hover:text-magenta">
                    {x.name} · size {x.size}
                  </Link>
                  <span className={`shrink-0 font-semibold ${x.stock === 0 ? "text-danger" : "text-gold"}`}>{x.stock === 0 ? "Sold out" : `${x.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
