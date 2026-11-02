import type { Metadata } from "next";
import { db, schema as s } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { SettingsForm } from "@/components/admin/SettingsForm";
import type { SettingsInput } from "@/app/admin/settings-actions";

export const metadata: Metadata = { title: "Settings" };

const KEYS = [
  "store_name", "tagline", "address_line", "city", "timings", "phone_display", "map_url", "instagram", "blog_url",
  "whatsapp", "upi_id", "upi_name", "gstin", "gst_threshold_rupees", "gst_rate_low", "gst_rate_high", "bill_footer",
  "exchange_policy", "banner_title", "banner_subtitle", "owner_name", "owner_title", "owner_photo", "owner_story", "prices_are_placeholders",
] as const;

export default async function SettingsPage() {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return <p className="text-muted">Only the owner can change store settings.</p>;
  const rows = await db.select().from(s.settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const initial = Object.fromEntries(KEYS.map((k) => [k, map[k] ?? ""])) as unknown as SettingsInput;
  return (
    <>
      <h1 className="text-2xl font-semibold text-plum sm:text-3xl">Settings</h1>
      <p className="mb-6 text-sm text-muted">Changes show on the website straight away.</p>
      <SettingsForm initial={initial} />
    </>
  );
}
