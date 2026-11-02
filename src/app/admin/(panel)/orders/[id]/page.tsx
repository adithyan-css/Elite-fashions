import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { MessageCircle, Phone } from "lucide-react";
import { db, schema as s } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/catalog";
import { formatExact, formatPrice } from "@/lib/money";
import { billUrl, loadOrder, statusUrl } from "@/lib/order-data";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/orders";
import { billMessage, paymentRequestMessage, statusUpdateMessage, waLink } from "@/lib/whatsapp";
import { OrderActions } from "@/components/admin/OrderActions";

export const metadata: Metadata = { title: "Order" };
const dt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default async function AdminOrder(props: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [row] = await db.select({ orderNo: s.orders.orderNo }).from(s.orders).where(eq(s.orders.id, id));
  if (!row) notFound();
  const [data, st] = await Promise.all([loadOrder(row.orderNo), getSettings()]);
  if (!data) notFound();
  const { order, items, events, invoice, payments } = data;
  const custWa = `91${order.phone}`;
  const track = statusUrl(order.orderNo, order.viewToken);
  const links = {
    paymentRequest: waLink(custWa, paymentRequestMessage({ customerName: order.customerName, orderNo: order.orderNo, totalPaise: order.totalPaise, upiId: st.upi_id, upiName: st.upi_name, storeName: st.store_name })),
    billPdf: invoice ? billUrl(order.orderNo, order.viewToken) : undefined,
    bill: invoice
      ? waLink(custWa, billMessage({ customerName: order.customerName, orderNo: order.orderNo, invoiceNo: invoice.invoiceNo, billUrl: billUrl(order.orderNo, order.viewToken), storeName: st.store_name }))
      : undefined,
    statusUpdate: waLink(custWa, statusUpdateMessage({ customerName: order.customerName, orderNo: order.orderNo, statusLabel: STATUS_LABEL[order.status], statusUrl: track, storeName: st.store_name })),
  };

  return (
    <>
      <Link href="/admin/orders" className="text-sm text-muted hover:text-magenta">
        ← Orders
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-plum sm:text-3xl" data-testid="admin-order-no">
          {order.orderNo}
        </h1>
        <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${STATUS_TONE[order.status]}`} data-testid="admin-order-status">
          {STATUS_LABEL[order.status]}
        </span>
      </div>
      <p className="text-sm text-muted">Placed {dt.format(order.createdAt)}</p>
      {!st.upi_id && order.status === "awaiting_payment" && (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Add your UPI ID in <Link className="underline" href="/admin/settings">Settings</Link> so it goes into the payment request message.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-sans font-semibold">Customer</h2>
            <p className="mt-2 font-medium">{order.customerName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={`tel:+91${order.phone}`} className="chip gap-1.5 px-3 py-1.5">
                <Phone className="h-3.5 w-3.5" /> +91 {order.phone}
              </a>
              <a href={waLink(custWa, `Hi ${order.customerName}, this is ${st.store_name} about your order ${order.orderNo}.`)} target="_blank" rel="noopener" className="chip gap-1.5 px-3 py-1.5 text-[#1f9d55]">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </div>
            <p className="mt-3 text-sm text-muted">{order.fulfilment === "pickup" ? "Store pickup" : `Delivery: ${order.address}`}</p>
            {order.note && <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-sm">Note: {order.note}</p>}
          </section>

          <section className="card p-5">
            <h2 className="font-sans font-semibold">Items</h2>
            <ul className="mt-3 divide-y divide-sand/60">
              {items.map((i) => (
                <li key={i.id} className="flex gap-3 py-3">
                  {i.imageUrl && (
                    <div className="relative aspect-[3/4] w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                      <Image src={i.imageUrl} alt="" fill sizes="48px" className="object-cover object-top" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted">
                      D.No. {i.designNo} · Size {i.sizeLabel} · {i.qty} × {formatPrice(i.unitPricePaise)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(i.unitPricePaise * i.qty)}</p>
                </li>
              ))}
            </ul>
            <div className="gold-rule my-3" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatExact(order.totalPaise)}</span>
            </div>
            {invoice && <p className="mt-2 text-sm text-muted">Bill {invoice.invoiceNo}</p>}
            {payments.map((p) => (
              <p key={p.id} className="text-sm text-muted">
                Paid {formatExact(p.amountPaise)} by {p.method.toUpperCase()}
                {p.reference ? ` · ${p.reference}` : ""} · {dt.format(p.receivedAt)}
              </p>
            ))}
          </section>

          <section className="card p-5">
            <h2 className="font-sans font-semibold">Timeline</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {[...events].reverse().map((e) => (
                <li key={e.id} className="flex justify-between gap-4">
                  <span>
                    <span className="font-medium">{STATUS_LABEL[e.status as keyof typeof STATUS_LABEL] ?? e.status}</span>
                    {e.note && <span className="text-muted"> · {e.note}</span>}
                  </span>
                  <span className="shrink-0 text-muted">{dt.format(e.createdAt)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside>
          <OrderActions orderId={order.id} status={order.status} totalRupees={order.totalPaise / 100} links={links} />
          <a href={track} target="_blank" rel="noopener" className="mt-4 block text-center text-xs text-muted underline">
            Open customer&apos;s status page
          </a>
        </aside>
      </div>
    </>
  );
}
