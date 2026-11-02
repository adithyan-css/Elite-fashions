import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    designNo: text("design_no").notNull().default(""),
    brand: text("brand").notNull().default(""),
    category: text("category").notNull(),
    colour: text("colour").notNull().default(""),
    description: text("description").notNull().default(""),
    pricePaise: integer("price_paise").notNull(),
    mrpPaise: integer("mrp_paise"),
    tags: text("tags").notNull().default(""), // comma separated: new,sale,diwali
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    groupKey: text("group_key"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [uniqueIndex("products_slug_uq").on(t.slug), index("products_category_idx").on(t.category)],
);

export const productImages = sqliteTable(
  "product_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productSizes = sqliteTable(
  "product_sizes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    stock: integer("stock").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("product_sizes_uq").on(t.productId, t.label)],
);

export const ORDER_STATUSES = [
  "awaiting_payment",
  "paid",
  "packed",
  "shipped",
  "ready_for_pickup",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderNo: text("order_no").notNull(),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("awaiting_payment"),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    fulfilment: text("fulfilment", { enum: ["delivery", "pickup"] }).notNull(),
    address: text("address").notNull().default(""),
    note: text("note").notNull().default(""),
    subtotalPaise: integer("subtotal_paise").notNull(),
    discountPaise: integer("discount_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull(),
    viewToken: text("view_token").notNull(),
    stockApplied: integer("stock_applied", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [uniqueIndex("orders_no_uq").on(t.orderNo), index("orders_status_idx").on(t.status)],
);

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  designNo: text("design_no").notNull().default(""),
  sizeLabel: text("size_label").notNull(),
  unitPricePaise: integer("unit_price_paise").notNull(),
  qty: integer("qty").notNull(),
  imageUrl: text("image_url").notNull().default(""),
});

export const orderEvents = sqliteTable("order_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  note: text("note").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: text("method", { enum: ["upi", "cash", "card", "bank"] }).notNull(),
  amountPaise: integer("amount_paise").notNull(),
  reference: text("reference").notNull().default(""),
  receivedAt: integer("received_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    invoiceNo: text("invoice_no").notNull(),
    fy: text("fy").notNull(),
    seq: integer("seq").notNull(),
    snapshot: text("snapshot").notNull(), // frozen JSON of everything printed on the bill
    issuedAt: integer("issued_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [
    uniqueIndex("invoices_no_uq").on(t.invoiceNo),
    uniqueIndex("invoices_fy_seq_uq").on(t.fy, t.seq),
    uniqueIndex("invoices_order_uq").on(t.orderId),
  ],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const adminUsers = sqliteTable(
  "admin_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["owner", "staff"] }).notNull().default("owner"),
    sessionVersion: integer("session_version").notNull().default(1),
    mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [uniqueIndex("admin_users_email_uq").on(t.email)],
);

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ip: text("ip").notNull(),
    email: text("email").notNull(),
    success: integer("success", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [index("login_attempts_ip_idx").on(t.ip, t.createdAt), index("login_attempts_email_idx").on(t.email, t.createdAt)],
);

export const counters = sqliteTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});

export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
