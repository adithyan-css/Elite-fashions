"use server";

import { randomBytes } from "node:crypto";
import { and, count, eq, gt, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { normalizeIndianMobile } from "@/lib/orders";

const itemSchema = z.object({
  productId: z.number().int().positive(),
  sizeLabel: z.string().trim().min(1).max(20),
  qty: z.number().int().min(1).max(10),
});

const orderSchema = z
  .object({
    customerName: z.string().trim().min(2, "Please enter your name").max(60),
    phone: z.string().trim().max(20),
    fulfilment: z.enum(["delivery", "pickup"]),
    address: z.string().trim().max(300).default(""),
    note: z.string().trim().max(300).default(""),
    company: z.string().max(0).optional(), // honeypot: bots fill every field
    items: z.array(itemSchema).min(1, "Your cart is empty").max(30),
  })
  .superRefine((v, ctx) => {
    if (!normalizeIndianMobile(v.phone)) ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid 10-digit mobile number" });
    if (v.fulfilment === "delivery" && v.address.length < 10) ctx.addIssue({ code: "custom", path: ["address"], message: "Please enter the full delivery address" });
  });

export type PlaceOrderInput = z.input<typeof orderSchema>;
export type PlaceOrderResult =
  | { ok: true; orderNo: string; token: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; unavailable?: string[] };

type PricedLine = { productId: number; name: string; designNo: string; sizeLabel: string; qty: number; unitPricePaise: number; imageUrl: string; key: string };

async function priceLines(items: z.infer<typeof itemSchema>[]) {
  const ids = [...new Set(items.map((i) => i.productId))];
  const prods = ids.length ? await db.select().from(s.products).where(inArray(s.products.id, ids)) : [];
  const sizes = ids.length ? await db.select().from(s.productSizes).where(inArray(s.productSizes.productId, ids)) : [];
  const imgs = ids.length ? await db.select().from(s.productImages).where(inArray(s.productImages.productId, ids)) : [];
  const lines: PricedLine[] = [];
  const unavailable: string[] = [];
  // merge duplicate lines of the same product + size
  const merged = new Map<string, z.infer<typeof itemSchema>>();
  for (const i of items) {
    const k = `${i.productId}:${i.sizeLabel}`;
    const prev = merged.get(k);
    merged.set(k, { ...i, qty: Math.min(10, (prev?.qty ?? 0) + i.qty) });
  }
  for (const [key, i] of merged) {
    const p = prods.find((x) => x.id === i.productId);
    const z = sizes.find((x) => x.productId === i.productId && x.label === i.sizeLabel);
    if (!p || !p.isActive || !z) {
      unavailable.push(key);
      continue;
    }
    if (z.stock < i.qty) {
      unavailable.push(key);
      continue;
    }
    const img = imgs.filter((x) => x.productId === p.id).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)[0];
    lines.push({ key, productId: p.id, name: p.name, designNo: p.designNo, sizeLabel: z.label, qty: i.qty, unitPricePaise: p.pricePaise, imageUrl: img?.url ?? "" });
  }
  return { lines, unavailable, prods, sizes };
}

/** Re-checks a cart against the database: current prices and which lines can no longer be bought. */
export async function refreshCart(items: { productId: number; sizeLabel: string; qty: number }[]) {
  const parsed = z.array(itemSchema).max(30).safeParse(items);
  if (!parsed.success) return { lines: [] as { key: string; pricePaise?: number; remove?: boolean; stock?: number }[] };
  const ids = [...new Set(parsed.data.map((i) => i.productId))];
  const prods = ids.length ? await db.select().from(s.products).where(inArray(s.products.id, ids)) : [];
  const sizes = ids.length ? await db.select().from(s.productSizes).where(inArray(s.productSizes.productId, ids)) : [];
  return {
    lines: parsed.data.map((i) => {
      const key = `${i.productId}:${i.sizeLabel}`;
      const p = prods.find((x) => x.id === i.productId);
      const z = sizes.find((x) => x.productId === i.productId && x.label === i.sizeLabel);
      if (!p || !p.isActive || !z) return { key, remove: true };
      return { key, pricePaise: p.pricePaise, stock: z.stock };
    }),
  };
}

async function nextOrderNo(): Promise<string> {
  const now = new Date(Date.now() + 5.5 * 3600 * 1000); // IST
  const yymm = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `order:${yymm}`;
  const [row] = await db
    .insert(s.counters)
    .values({ key, value: 1 })
    .onConflictDoUpdate({ target: s.counters.key, set: { value: sql`${s.counters.value} + 1` } })
    .returning({ value: s.counters.value });
  return `EF-${yymm}-${String(row.value).padStart(4, "0")}`;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const iss of parsed.error.issues) {
      const k = String(iss.path[0] ?? "form");
      if (!fieldErrors[k]) fieldErrors[k] = iss.message;
    }
    if (fieldErrors.company) return { ok: false, error: "Something went wrong. Please try again." };
    return { ok: false, error: fieldErrors.items ?? "Please check the highlighted fields.", fieldErrors };
  }
  const v = parsed.data;
  const phone = normalizeIndianMobile(v.phone);

  // abuse guard: at most 5 orders per phone per hour
  const [{ n }] = await db
    .select({ n: count() })
    .from(s.orders)
    .where(and(eq(s.orders.phone, phone), gt(s.orders.createdAt, new Date(Date.now() - 3600_000))));
  if (n >= 5) return { ok: false, error: "Too many orders from this number in the last hour. Please message us on WhatsApp." };

  const { lines, unavailable } = await priceLines(v.items);
  if (unavailable.length) return { ok: false, error: "Some items are no longer available in the size you picked. Your cart has been updated.", unavailable };
  if (!lines.length) return { ok: false, error: "Your cart is empty" };

  const subtotal = lines.reduce((t, l) => t + l.unitPricePaise * l.qty, 0);
  const orderNo = await nextOrderNo();
  const token = randomBytes(18).toString("base64url");

  await db.transaction(async (tx) => {
    const [o] = await tx
      .insert(s.orders)
      .values({
        orderNo,
        customerName: v.customerName,
        phone,
        fulfilment: v.fulfilment,
        address: v.fulfilment === "delivery" ? v.address : "",
        note: v.note,
        subtotalPaise: subtotal,
        discountPaise: 0,
        totalPaise: subtotal,
        viewToken: token,
      })
      .returning({ id: s.orders.id });
    await tx.insert(s.orderItems).values(
      lines.map((l) => ({ orderId: o.id, productId: l.productId, name: l.name, designNo: l.designNo, sizeLabel: l.sizeLabel, unitPricePaise: l.unitPricePaise, qty: l.qty, imageUrl: l.imageUrl })),
    );
    await tx.insert(s.orderEvents).values({ orderId: o.id, status: "awaiting_payment", note: "Placed on website" });
  });

  return { ok: true, orderNo, token };
}
