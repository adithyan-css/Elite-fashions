import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/money";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/orders";

export const metadata: Metadata = { title: "Orders" };
const dt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const PAGE = 30;

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" && (ORDER_STATUSES as readonly string[]).includes(sp.status) ? (sp.status as OrderStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 40) : "";
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const conds: SQL[] = [];
  if (status) conds.push(eq(s.orders.status, status));
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    conds.push(or(ilike(s.orders.orderNo, like), ilike(s.orders.customerName, like), ilike(s.orders.phone, like))!);
  }
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }], counts] = await Promise.all([
    db.select().from(s.orders).where(where).orderBy(desc(s.orders.createdAt)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ n: count() }).from(s.orders).where(where),
    db.select({ status: s.orders.status, n: count() }).from(s.orders).groupBy(s.orders.status),
  ]);
  const cnt = (st: OrderStatus) => counts.find((c) => c.status === st)?.n ?? 0;
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { status, q: q || undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    return `/admin/orders${p.size ? `?${p}` : ""}`;
  };
  const tabs: (OrderStatus | undefined)[] = [undefined, "awaiting_payment", "paid", "packed", "shipped", "ready_for_pickup", "delivered", "cancelled"];
  return (
    <>
      <h1 className="text-2xl font-semibold text-plum sm:text-3xl">Orders</h1>
      <nav className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Filter by status">
        {tabs.map((t) => (
          <Link key={t ?? "all"} href={href({ status: t, page: undefined })} className={`chip shrink-0 px-3 py-1.5 text-sm ${status === t ? "border-magenta bg-magenta text-white" : ""}`}>
            {t ? STATUS_LABEL[t] : "All"} {t && cnt(t) ? <span className="ml-1 opacity-70">{cnt(t)}</span> : null}
          </Link>
        ))}
      </nav>
      <form className="mt-4" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} className="input max-w-sm" placeholder="Order no., name or phone" aria-label="Search orders" />
      </form>
      {rows.length === 0 ? (
        <p className="mt-10 text-center text-muted">No orders here yet.</p>
      ) : (
        <ul className="mt-5 grid gap-2">
          {rows.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="card flex items-center justify-between gap-3 p-4 hover:border-magenta/40" data-testid="admin-order">
                <span className="min-w-0">
                  <span className="block font-semibold">{o.orderNo}</span>
                  <span className="block truncate text-xs text-muted">
                    {o.customerName} · +91 {o.phone} · {dt.format(o.createdAt)} · {o.fulfilment === "pickup" ? "Pickup" : "Delivery"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold">{formatPrice(o.totalPaise)}</span>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {n > PAGE && (
        <div className="mt-6 flex justify-between text-sm">
          {page > 1 ? <Link href={href({ page: String(page - 1) })}>← Newer</Link> : <span />}
          <span className="text-muted">
            Page {page} of {Math.ceil(n / PAGE)}
          </span>
          {page * PAGE < n ? <Link href={href({ page: String(page + 1) })}>Older →</Link> : <span />}
        </div>
      )}
    </>
  );
}
