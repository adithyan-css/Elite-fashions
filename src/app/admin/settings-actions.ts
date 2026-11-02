"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { SETTINGS_TAG } from "@/lib/catalog";
import { normalizeWhatsApp } from "@/lib/whatsapp";

const text = (max: number) => z.string().trim().max(max);
const httpsUrl = z.union([z.literal(""), z.string().trim().max(300).regex(/^https:\/\/[^\s<>"']+$/, "Must start with https://")]);

const schema = z.object({
  store_name: text(60).min(2, "Store name is required"),
  tagline: text(120),
  address_line: text(160).min(5, "Address is required"),
  city: text(80),
  timings: text(120),
  phone_display: text(30),
  map_url: httpsUrl,
  instagram: z.string().trim().max(40).regex(/^[A-Za-z0-9._]*$/, "Only the handle, without @"),
  blog_url: httpsUrl,
  whatsapp: z.string().trim().max(20),
  upi_id: z.union([z.literal(""), z.string().trim().max(80).regex(/^[\w.-]{2,256}@[A-Za-z]{2,64}$/, "Looks like name@bank")]),
  upi_name: text(60),
  gstin: z.union([z.literal(""), z.string().trim().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "GSTIN should be 15 characters, e.g. 33ABCDE1234F1Z5")]),
  gst_threshold_rupees: z.coerce.number().min(0).max(1_000_000).transform(String),
  gst_rate_low: z.coerce.number().min(0).max(28).transform(String),
  gst_rate_high: z.coerce.number().min(0).max(28).transform(String),
  bill_footer: text(120),
  exchange_policy: text(200),
  banner_title: text(80).min(3),
  banner_subtitle: text(200),
  owner_name: text(60).min(2, "Owner name is required"),
  owner_title: text(80),
  owner_photo: z.string().trim().max(500).regex(/^(\/(brand|uploads)\/|https:\/\/)/, "Upload a photo"),
  owner_story: text(2000),
  prices_are_placeholders: z.enum(["0", "1"]),
});

export type SettingsInput = z.input<typeof schema>;

export async function saveSettings(input: SettingsInput): Promise<{ ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> }> {
  await requireAdmin({ ownerOnly: true });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Please fix the highlighted fields", fieldErrors };
  }
  const v = parsed.data;
  const wa = normalizeWhatsApp(v.whatsapp);
  if (!wa) return { ok: false, error: "Please fix the highlighted fields", fieldErrors: { whatsapp: "Enter the WhatsApp number with country code, e.g. 91 98765 43210" } };
  const values = { ...v, whatsapp: wa };
  await db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(values)) {
      await tx.insert(s.settings).values({ key, value }).onConflictDoUpdate({ target: s.settings.key, set: { value } });
    }
  });
  updateTag(SETTINGS_TAG);
  return { ok: true };
}
