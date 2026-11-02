import "server-only";
import { timingSafeEqual } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";

export function tokenMatches(expected: string, given: string | undefined | null): boolean {
  if (!given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function loadOrder(orderNo: string) {
  if (!/^EF-\d{4}-\d{4,6}$/.test(orderNo)) return null;
  const [order] = await db.select().from(s.orders).where(eq(s.orders.orderNo, orderNo));
  if (!order) return null;
  const [items, events, invoice, payments] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id)).orderBy(asc(s.orderItems.id)),
    db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, order.id)).orderBy(asc(s.orderEvents.createdAt), asc(s.orderEvents.id)),
    db.select().from(s.invoices).where(eq(s.invoices.orderId, order.id)).then((r) => r[0] ?? null),
    db.select().from(s.payments).where(eq(s.payments.orderId, order.id)).orderBy(desc(s.payments.receivedAt)),
  ]);
  return { order, items, events, invoice, payments };
}

/** Customer view: only with the private token from their link. */
export async function loadOrderForCustomer(orderNo: string, token: string | undefined) {
  const data = await loadOrder(orderNo);
  if (!data || !tokenMatches(data.order.viewToken, token)) return null;
  return data;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function statusUrl(orderNo: string, token: string): string {
  return `${siteUrl()}/order/${orderNo}?t=${token}`;
}

export function billUrl(invoiceNo: string, token: string): string {
  return `${siteUrl()}/api/invoices/${encodeURIComponent(invoiceNo)}/pdf?t=${token}`;
}
