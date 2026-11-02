import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
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
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    groupKey: text("group_key"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("products_slug_uq").on(t.slug), index("products_category_idx").on(t.category)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productSizes = pgTable(
  "product_sizes",
  {
    id: serial("id").primaryKey(),
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

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
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
    stockApplied: boolean("stock_applied").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("orders_no_uq").on(t.orderNo), index("orders_status_idx").on(t.status), index("orders_created_idx").on(t.createdAt)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
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
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: text("method", { enum: ["upi", "cash", "card", "bank"] }).notNull(),
    amountPaise: integer("amount_paise").notNull(),
    reference: text("reference").notNull().default(""),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    invoiceNo: text("invoice_no").notNull(),
    fy: text("fy").notNull(),
    seq: integer("seq").notNull(),
    snapshot: text("snapshot").notNull(), // frozen JSON of everything printed on the bill
    issuedAt: timestamp("issued_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("invoices_no_uq").on(t.invoiceNo),
    uniqueIndex("invoices_fy_seq_uq").on(t.fy, t.seq),
    uniqueIndex("invoices_order_uq").on(t.orderId),
  ],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["owner", "staff"] }).notNull().default("owner"),
    sessionVersion: integer("session_version").notNull().default(1),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("admin_users_email_uq").on(t.email)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    ip: text("ip").notNull(),
    email: text("email").notNull(),
    success: boolean("success").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("login_attempts_ip_idx").on(t.ip, t.createdAt), index("login_attempts_email_idx").on(t.email, t.createdAt)],
);

export const counters = pgTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});

export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
