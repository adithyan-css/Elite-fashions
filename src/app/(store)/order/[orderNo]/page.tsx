import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Circle, FileText, MessageCircle, XCircle } from "lucide-react";
import { getSettings } from "@/lib/catalog";
import { billUrl, loadOrderForCustomer, statusUrl } from "@/lib/order-data";
import { customerSteps, STATUS_LABEL, STATUS_TONE } from "@/lib/orders";
import { formatPrice } from "@/lib/money";
import { orderMessage, waLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

const dateFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

async function OrderView({ params, searchParams }: PageProps<"/order/[orderNo]">) {
  const [{ orderNo }, sp] = await Promise.all([params, searchParams]);
  const t = typeof sp.t === "string" ? sp.t : undefined;
  const isNew = sp.new === "1";
  const [data, s] = await Promise.all([loadOrderForCustomer(orderNo, t), getSettings()]);

  if (!data)
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-plum">Order not found</h1>
        <p className="mt-2 text-muted">Please open the link exactly as we sent it, or message us on WhatsApp with your order number.</p>
        <a href={waLink(s.whatsapp, `Hi ${s.store_name}, I need help with my order ${orderNo}.`)} target="_blank" rel="noopener" className="btn-whatsapp mt-6">
          <MessageCircle className="h-4 w-4" /> Message us
        </a>
      </div>
    );

  const { order, items, events, invoice } = data;
  const msg = orderMessage({
    storeName: s.store_name,
    orderNo: order.orderNo,
    customerName: order.customerName,
    items,
    totalPaise: order.totalPaise,
    fulfilment: order.fulfilment,
    address: order.address,
    note: order.note,
    statusUrl: statusUrl(order.orderNo, order.viewToken),
  });
  const steps = customerSteps(order.status, order.fulfilment);

  return (
    <div className="mx-auto max-w-3xl">
      {isNew && order.status === "awaiting_payment" && (
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-white p-6 text-center ring-1 ring-emerald-200" data-testid="send-on-whatsapp">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h1 className="mt-3 text-2xl font-semibold text-plum">Order saved! One last step</h1>
          <p className="mt-1 text-muted">Send it to us on WhatsApp so we can confirm stock and share the UPI details.</p>
          <a href={waLink(s.whatsapp, msg)} target="_blank" rel="noopener" className="btn-whatsapp mt-5 h-12 px-8 text-base">
            <MessageCircle className="h-5 w-5" /> Send order on WhatsApp
          </a>
          <p className="mt-3 text-xs text-muted">Keep this page: it shows your order status and bill.</p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Order</p>
          <h2 className="text-3xl font-semibold text-plum" data-testid="order-no">
            {order.orderNo}
          </h2>
          <p className="mt-1 text-sm text-muted">Placed {dateFmt.format(order.createdAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${STATUS_TONE[order.status]}`} data-testid="order-status">
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      {order.status === "cancelled" ? (
        <p className="mt-6 flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-danger">
          <XCircle className="h-5 w-5" /> This order was cancelled. Message us if this is a mistake.
        </p>
      ) : (
        <ol className="mt-8 grid grid-cols-5 gap-1" aria-label="Order progress">
          {steps.map((st) => (
            <li key={st.status} className="flex flex-col items-center text-center">
              {st.done ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Circle className="h-6 w-6 text-sand" />}
              <span className={`mt-1.5 text-[11px] leading-tight sm:text-xs ${st.current ? "font-semibold text-ink" : "text-muted"}`}>{st.label}</span>
            </li>
          ))}
        </ol>
      )}

      {invoice && (
        <a href={billUrl(invoice.invoiceNo, order.viewToken)} className="btn-primary mt-8 w-full" data-testid="bill-link">
          <FileText className="h-4 w-4" /> Download bill {invoice.invoiceNo}
        </a>
      )}

      <section className="card mt-8 p-5">
        <h3 className="font-sans font-semibold">Items</h3>
        <ul className="mt-4 divide-y divide-sand/60">
          {items.map((i) => (
            <li key={i.id} className="flex gap-3 py-3">
              {i.imageUrl && (
                <div className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg bg-cream">
                  <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-cover object-top" />
                </div>
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{i.name}</p>
                <p className="text-xs text-muted">
                  D.No. {i.designNo} · Size {i.sizeLabel} · Qty {i.qty}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatPrice(i.unitPricePaise * i.qty)}</p>
            </li>
          ))}
        </ul>
        <div className="gold-rule my-3" />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span data-testid="order-total">{formatPrice(order.totalPaise)}</span>
        </div>
        <p className="mt-3 text-sm text-muted">{order.fulfilment === "pickup" ? `Store pickup · ${s.address_line}, ${s.city}` : `Delivery to: ${order.address}`}</p>
      </section>

      <section className="mt-6">
        <h3 className="font-sans font-semibold">Updates</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {[...events].reverse().map((e) => (
            <li key={e.id} className="flex justify-between gap-4 rounded-xl bg-white px-4 py-2.5 ring-1 ring-sand/60">
              <span>{STATUS_LABEL[e.status as keyof typeof STATUS_LABEL] ?? e.status}</span>
              <span className="text-muted">{dateFmt.format(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <a href={waLink(s.whatsapp, `Hi ${s.store_name}, about my order ${order.orderNo}:`)} target="_blank" rel="noopener" className="btn-outline">
          <MessageCircle className="h-4 w-4" /> Questions? Chat with us
        </a>
        <Link href="/shop" className="btn-outline">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

export default function OrderPage(props: PageProps<"/order/[orderNo]">) {
  return (
    <div className="container-x py-10">
      <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-3xl bg-sand/40" aria-hidden />}>
        <OrderView {...props} />
      </Suspense>
    </div>
  );
}
