"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { changePassword, login, logout, requireAdmin } from "@/lib/auth";
import { PRODUCTS_TAG } from "@/lib/catalog";
import { CATEGORIES } from "@/db/seed-data";

/* ---------------- auth ---------------- */

export async function loginAction(_prev: { error?: string } | undefined, fd: FormData): Promise<{ error?: string }> {
  const res = await login(String(fd.get("email") ?? ""), String(fd.get("password") ?? ""));
  if (!res.ok) return { error: res.error };
  const next = String(fd.get("next") ?? "");
  redirect(res.mustChangePassword ? "/admin/account?first=1" : next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction(fd: FormData) {
  await logout(fd.get("everywhere") === "1");
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: { error?: string; ok?: boolean } | undefined, fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const next = String(fd.get("next") ?? "");
  if (next !== String(fd.get("confirm") ?? "")) return { error: "The new passwords do not match" };
  const res = await changePassword(String(fd.get("current") ?? ""), next);
  return res.ok ? { ok: true } : { error: res.error };
}

/* ---------------- products ---------------- */

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const rupees = z.coerce.number().min(1, "Enter a price").max(500000);

const productSchema = z
  .object({
    id: z.number().int().positive().optional(),
    name: z.string().trim().min(3, "Name is too short").max(120),
    designNo: z.string().trim().max(40).default(""),
    brand: z.string().trim().max(60).default(""),
    category: z.enum(CATEGORIES.map((c) => c.slug) as [string, ...string[]]),
    colour: z.string().trim().max(40).default(""),
    description: z.string().trim().max(2000).default(""),
    price: rupees,
    mrp: z.union([z.literal(""), z.coerce.number().min(0).max(500000)]).optional(),
    tags: z.array(z.enum(["new", "sale", "diwali"])).default([]),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    groupKey: z.string().trim().max(40).default(""),
    sizes: z
      .array(z.object({ label: z.string().trim().min(1).max(20), stock: z.coerce.number().int().min(0).max(9999) }))
      .min(1, "Add at least one size")
      .max(20),
    images: z
      .array(z.object({ url: z.string().trim().max(500).regex(/^(\/(products|uploads)\/|https:\/\/)/, "Bad image URL"), alt: z.string().trim().max(160).default("") }))
      .max(6, "Up to 6 photos"),
  })
  .superRefine((v, ctx) => {
    const labels = v.sizes.map((x) => x.label.toLowerCase());
    if (new Set(labels).size !== labels.length) ctx.addIssue({ code: "custom", path: ["sizes"], message: "Each size can only be listed once" });
    if (typeof v.mrp === "number" && v.mrp > 0 && v.mrp < v.price) ctx.addIssue({ code: "custom", path: ["mrp"], message: "MRP should be more than the selling price" });
  });

export type ProductInput = z.input<typeof productSchema>;
export type SaveResult = { ok: true; id: number; slug: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function saveProduct(input: ProductInput): Promise<SaveResult> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Please fix the highlighted fields", fieldErrors };
  }
  const v = parsed.data;
  const values = {
    name: v.name,
    designNo: v.designNo,
    brand: v.brand,
    category: v.category,
    colour: v.colour,
    description: v.description,
    pricePaise: Math.round(v.price * 100),
    mrpPaise: typeof v.mrp === "number" && v.mrp > 0 ? Math.round(v.mrp * 100) : null,
    tags: v.tags.join(","),
    isFeatured: v.isFeatured,
    isActive: v.isActive,
    groupKey: v.groupKey || null,
    updatedAt: new Date(),
  };

  // unique, readable slug
  const base = slugify(`${v.name} ${v.designNo}`) || "dress";
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await db
      .select({ id: s.products.id })
      .from(s.products)
      .where(v.id ? and(eq(s.products.slug, slug), ne(s.products.id, v.id)) : eq(s.products.slug, slug));
    if (!clash.length) break;
    slug = `${base}-${i}`;
  }

  const id = await db.transaction(async (tx) => {
    let pid = v.id;
    if (pid) {
      const [existing] = await tx.select({ slug: s.products.slug }).from(s.products).where(eq(s.products.id, pid));
      if (!existing) throw new Error("Product not found");
      await tx.update(s.products).set({ ...values, slug: existing.slug }).where(eq(s.products.id, pid)); // keep URLs stable on edit
    } else {
      const [row] = await tx.insert(s.products).values({ ...values, slug }).returning({ id: s.products.id });
      pid = row.id;
    }
    await tx.delete(s.productImages).where(eq(s.productImages.productId, pid));
    if (v.images.length) await tx.insert(s.productImages).values(v.images.map((im, i) => ({ productId: pid!, url: im.url, alt: im.alt || v.name, sortOrder: i })));
    // sizes: upsert to keep ids, delete the removed ones
    const existing = await tx.select().from(s.productSizes).where(eq(s.productSizes.productId, pid));
    for (const [i, z1] of v.sizes.entries()) {
      const hit = existing.find((e) => e.label.toLowerCase() === z1.label.toLowerCase());
      if (hit) await tx.update(s.productSizes).set({ label: z1.label, stock: z1.stock, sortOrder: i }).where(eq(s.productSizes.id, hit.id));
      else await tx.insert(s.productSizes).values({ productId: pid, label: z1.label, stock: z1.stock, sortOrder: i });
    }
    for (const e of existing) if (!v.sizes.some((z1) => z1.label.toLowerCase() === e.label.toLowerCase())) await tx.delete(s.productSizes).where(eq(s.productSizes.id, e.id));
    return pid;
  });

  updateTag(PRODUCTS_TAG);
  const [p] = await db.select({ slug: s.products.slug }).from(s.products).where(eq(s.products.id, id));
  return { ok: true, id, slug: p.slug };
}

export async function setProductActive(id: number, active: boolean) {
  await requireAdmin();
  if (!Number.isInteger(id)) return;
  await db.update(s.products).set({ isActive: active, updatedAt: new Date() }).where(eq(s.products.id, id));
  updateTag(PRODUCTS_TAG);
}

export async function deleteProduct(id: number): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return { ok: false, error: "Only the owner can delete products" };
  if (!Number.isInteger(id)) return { ok: false, error: "Bad id" };
  await db.delete(s.products).where(eq(s.products.id, id)); // order lines keep their copied name and price
  updateTag(PRODUCTS_TAG);
  return { ok: true };
}
