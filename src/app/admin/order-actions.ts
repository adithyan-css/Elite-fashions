"use server";

import { updateTag } from "next/cache";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import type { OrderStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings, PRODUCTS_TAG } from "@/lib/catalog";
import { financialYear } from "@/lib/gst";
import { buildSnapshot, formatInvoiceNo } from "@/lib/invoice";
import { canMove, STATUS_LABEL } from "@/lib/orders";

type Result = { ok: true } | { ok: false; error: string };

const paidSchema = z.object({
  orderId: z.number().int().positive(),
  method: z.enum(["upi", "cash", "card", "bank"]),
  amount: z.coerce.number().positive().max(10_000_000),
  reference: z.string().trim().max(80).default(""),
});

/** Records payment, takes stock out, and issues a numbered bill, all in one transaction. */
export async function markPaid(input: z.input<typeof paidSchema>): Promise<Result> {
  await requireAdmin();
  const p = paidSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Check the payment details" };
  const v = p.data;
  const settings = await getSettings();
  try {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(s.orders).where(eq(s.orders.id, v.orderId)).for("update");
      if (!order) throw new Error("Order not found");
      if (order.status !== "awaiting_payment") throw new Error(`This order is already ${STATUS_LABEL[order.status].toLowerCase()}`);
      const amountPaise = Math.round(v.amount * 100);
      if (amountPaise !== order.totalPaise) throw new Error(`Amount should match the order total`);
      const items = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id));

      // take stock out; refuse if a size ran out in the meantime
      for (const it of items) {
        if (!it.productId) continue;
        const done = await tx
          .update(s.productSizes)
          .set({ stock: sql`${s.productSizes.stock} - ${it.qty}` })
          .where(and(eq(s.productSizes.productId, it.productId), eq(s.productSizes.label, it.sizeLabel), gte(s.productSizes.stock, it.qty)))
          .returning({ id: s.productSizes.id });
        if (!done.length) throw new Error(`Not enough stock: ${it.name} size ${it.sizeLabel}. Update stock first, or cancel the order.`);
      }

      const now = new Date();
      await tx.insert(s.payments).values({ orderId: order.id, method: v.method, amountPaise, reference: v.reference, receivedAt: now });
      await tx.update(s.orders).set({ status: "paid", stockApplied: true, updatedAt: now }).where(eq(s.orders.id, order.id));
      await tx.insert(s.orderEvents).values({ orderId: order.id, status: "paid", note: `${v.method.toUpperCase()}${v.reference ? ` · ${v.reference}` : ""}` });

      const fy = financialYear(now);
      const [ctr] = await tx
        .insert(s.counters)
        .values({ key: `inv:${fy}`, value: 1 })
        .onConflictDoUpdate({ target: s.counters.key, set: { value: sql`${s.counters.value} + 1` } })
        .returning({ value: s.counters.value });
      const invoiceNo = formatInvoiceNo(fy, ctr.value);
      const snapshot = buildSnapshot({ invoiceNo, issuedAt: now, settings, order, items, payment: { method: v.method, reference: v.reference, amountPaise } });
      await tx.insert(s.invoices).values({ orderId: order.id, invoiceNo, fy, seq: ctr.value, snapshot: JSON.stringify(snapshot), issuedAt: now });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not mark as paid" };
  }
  updateTag(PRODUCTS_TAG); // stock changed
  return { ok: true };
}

const statusSchema = z.object({
  orderId: z.number().int().positive(),
  to: z.enum(["packed", "shipped", "ready_for_pickup", "delivered", "cancelled"]),
  note: z.string().trim().max(200).default(""),
});

export async function setOrderStatus(input: z.input<typeof statusSchema>): Promise<Result> {
  await requireAdmin();
  const p = statusSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Bad request" };
  const v = p.data;
  let restocked = false;
  try {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(s.orders).where(eq(s.orders.id, v.orderId)).for("update");
      if (!order) throw new Error("Order not found");
      if (!canMove(order.status, v.to as OrderStatus)) throw new Error(`Can't move from ${STATUS_LABEL[order.status]} to ${STATUS_LABEL[v.to as OrderStatus]}`);
      if (v.to === "cancelled" && order.stockApplied) {
        const items = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id));
        for (const it of items) {
          if (!it.productId) continue;
          await tx
            .update(s.productSizes)
            .set({ stock: sql`${s.productSizes.stock} + ${it.qty}` })
            .where(and(eq(s.productSizes.productId, it.productId), eq(s.productSizes.label, it.sizeLabel)));
        }
        restocked = true;
      }
      await tx
        .update(s.orders)
        .set({ status: v.to as OrderStatus, stockApplied: restocked ? false : order.stockApplied, updatedAt: new Date() })
        .where(eq(s.orders.id, order.id));
      await tx.insert(s.orderEvents).values({ orderId: order.id, status: v.to, note: [v.note, restocked ? "stock returned" : ""].filter(Boolean).join(" · ") });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update" };
  }
  if (restocked) updateTag(PRODUCTS_TAG);
  return { ok: true };
}
