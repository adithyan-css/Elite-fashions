import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { count, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as s from "../src/db/schema.ts";
import { SEED_PRODUCTS, DEFAULT_SETTINGS } from "../src/db/seed-data.ts";

const url = process.env.DATABASE_URL ?? "file:./data/store.db";
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
const db = drizzle(client, { schema: s });

// settings: insert missing keys only (never overwrite owner edits)
for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
  await db.insert(s.settings).values({ key, value }).onConflictDoNothing();
}

// products: only when the catalogue is empty
const [{ n }] = await db.select({ n: count() }).from(s.products);
if (n === 0) {
  for (const p of SEED_PRODUCTS) {
    const [row] = await db
      .insert(s.products)
      .values({
        slug: p.slug,
        name: p.name,
        designNo: p.designNo,
        brand: p.brand,
        category: p.category,
        colour: p.colour,
        description: p.description,
        pricePaise: p.price * 100,
        mrpPaise: p.mrp * 100,
        tags: p.tags.join(","),
        isFeatured: !!p.featured,
        groupKey: p.groupKey ?? null,
      })
      .returning({ id: s.products.id });
    await db.insert(s.productImages).values({ productId: row.id, url: `/products/${p.slug}.webp`, alt: `${p.name} (${p.designNo})`, sortOrder: 0 });
    await db.insert(s.productSizes).values(p.sizes.map((label, i) => ({ productId: row.id, label, stock: 3, sortOrder: i })));
  }
  console.log(`seeded ${SEED_PRODUCTS.length} products`);
} else {
  console.log(`catalogue has ${n} products, skipped product seed`);
}

// owner account
const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
if (email && password) {
  const existing = await db.select().from(s.adminUsers).where(eq(s.adminUsers.email, email));
  if (existing.length === 0) {
    if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");
    await db.insert(s.adminUsers).values({ email, name: "Sivaani", passwordHash: await bcrypt.hash(password, 12), role: "owner", mustChangePassword: true });
    console.log("owner account created for", email);
  } else console.log("owner account exists");
} else console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set, owner account not created");
client.close();
