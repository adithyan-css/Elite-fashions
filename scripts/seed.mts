import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { pgOptions } from "../src/db/options.ts";
import { count, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as s from "../src/db/schema.ts";
import { SEED_PRODUCTS, DEFAULT_SETTINGS } from "../src/db/seed-data.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = postgres(url, { ...pgOptions(url), max: 1 });
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
const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sbSecret = process.env.SUPABASE_SECRET_KEY;
if (email && password && sbUrl && sbSecret) {
  // Supabase Auth mode: create the login in Supabase (idempotent) so the owner can sign in
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(sbUrl, sbSecret, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error && !/already/i.test(error.message)) throw new Error(`Supabase user: ${error.message}`);
  console.log(error ? "Supabase login already exists for " + email : "Supabase login created for " + email);
  const bucket = process.env.SUPABASE_BUCKET ?? "product-images";
  const b = await admin.storage.createBucket(bucket, { public: true, fileSizeLimit: "8MB", allowedMimeTypes: ["image/webp"] });
  console.log(b.error ? `storage bucket "${bucket}": ${b.error.message}` : `storage bucket "${bucket}" created`);
}
if (email && password) {
  const existing = await db.select().from(s.adminUsers).where(eq(s.adminUsers.email, email));
  if (existing.length === 0) {
    if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");
    await db.insert(s.adminUsers).values({ email, name: "Sivaani", passwordHash: await bcrypt.hash(password, 12), role: "owner", mustChangePassword: true });
    console.log("owner account created for", email);
  } else console.log("owner account exists");
} else console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set, owner account not created");
await client.end();
