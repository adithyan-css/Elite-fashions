import "server-only";
import { and, asc, count, desc, eq, gte, inArray, lte, ne, sql, sum } from "drizzle-orm";
import { db, schema as s } from "@/db";

/** Midnight IST for today and the first of this month, as UTC instants. */
function istBoundaries(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  const day = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 3600_000;
  const month = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 3600_000;
  return { today: new Date(day), month: new Date(month) };
}

const PAID_STATES = ["paid", "packed", "shipped", "ready_for_pickup", "delivered"] as const;

export async function dashboardStats() {
  const { today, month } = istBoundaries();
  const [todayOrders] = await db.select({ n: count() }).from(s.orders).where(gte(s.orders.createdAt, today));
  const [awaiting] = await db.select({ n: count() }).from(s.orders).where(eq(s.orders.status, "awaiting_payment"));
  const [toPack] = await db.select({ n: count() }).from(s.orders).where(eq(s.orders.status, "paid"));
  const [monthSales] = await db
    .select({ total: sum(s.payments.amountPaise), n: count() })
    .from(s.payments)
    .innerJoin(s.orders, eq(s.orders.id, s.payments.orderId))
    .where(and(gte(s.payments.receivedAt, month), ne(s.orders.status, "cancelled")));
  const lowStock = await db
    .select({ id: s.products.id, name: s.products.name, designNo: s.products.designNo, size: s.productSizes.label, stock: s.productSizes.stock })
    .from(s.productSizes)
    .innerJoin(s.products, eq(s.products.id, s.productSizes.productId))
    .where(and(lte(s.productSizes.stock, 1), eq(s.products.isActive, true)))
    .orderBy(asc(s.productSizes.stock), asc(s.products.name))
    .limit(8);
  const recent = await db.select().from(s.orders).orderBy(desc(s.orders.createdAt)).limit(6);
  return {
    todayOrders: todayOrders.n,
    awaiting: awaiting.n,
    toPack: toPack.n,
    monthSalesPaise: Number(monthSales.total ?? 0),
    monthPaidOrders: monthSales.n,
    lowStock,
    recent,
  };
}

export async function adminProducts() {
  const rows = await db.select().from(s.products).orderBy(desc(s.products.isFeatured), asc(s.products.name));
  const ids = rows.map((r) => r.id);
  const sizes = ids.length ? await db.select().from(s.productSizes).where(inArray(s.productSizes.productId, ids)) : [];
  const imgs = ids.length ? await db.select().from(s.productImages).where(inArray(s.productImages.productId, ids)).orderBy(asc(s.productImages.sortOrder)) : [];
  return rows.map((r) => ({
    ...r,
    image: imgs.find((i) => i.productId === r.id)?.url ?? "/brand/logo.png",
    stock: sizes.filter((z) => z.productId === r.id).reduce((t, z) => t + z.stock, 0),
    sizes: sizes.filter((z) => z.productId === r.id).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export async function adminProduct(id: number) {
  const [p] = await db.select().from(s.products).where(eq(s.products.id, id));
  if (!p) return null;
  const sizes = await db.select().from(s.productSizes).where(eq(s.productSizes.productId, id)).orderBy(asc(s.productSizes.sortOrder));
  const images = await db.select().from(s.productImages).where(eq(s.productImages.productId, id)).orderBy(asc(s.productImages.sortOrder));
  return { p, sizes, images };
}

export async function knownBrands(): Promise<string[]> {
  const rows = await db.selectDistinct({ b: s.products.brand }).from(s.products).where(ne(s.products.brand, ""));
  return rows.map((r) => r.b).sort();
}

export { PAID_STATES, sql };
