"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import { saveSettings, type SettingsInput } from "@/app/admin/settings-actions";

type Field = { key: keyof SettingsInput; label: string; hint?: string; type?: "text" | "textarea" | "number"; placeholder?: string };

const GROUPS: { title: string; note?: string; fields: Field[] }[] = [
  {
    title: "Store details",
    fields: [
      { key: "store_name", label: "Store name" },
      { key: "tagline", label: "Tagline" },
      { key: "address_line", label: "Address" },
      { key: "city", label: "City & state" },
      { key: "timings", label: "Shop timings", placeholder: "e.g. Mon–Sat 10 am – 9 pm, Sun 11 am – 8 pm" },
      { key: "phone_display", label: "Phone (shown on site & bills)", placeholder: "e.g. +91 98765 43210" },
      { key: "map_url", label: "Google Maps link", hint: "Share link of the shop on Google Maps" },
      { key: "instagram", label: "Instagram handle", hint: "Without @" },
      { key: "blog_url", label: "Blog / website link" },
    ],
  },
  {
    title: "WhatsApp & payment",
    note: "Orders arrive on this WhatsApp number. The UPI ID goes into the payment request message.",
    fields: [
      { key: "whatsapp", label: "Store WhatsApp number", hint: "With country code, e.g. 91 98765 43210" },
      { key: "upi_id", label: "UPI ID", placeholder: "e.g. elitefashions@okaxis" },
      { key: "upi_name", label: "UPI account name" },
    ],
  },
  {
    title: "Bills & GST",
    note: "Leave GSTIN empty if the shop is not GST-registered: bills then print as a plain BILL with no tax lines. Check rates with your accountant.",
    fields: [
      { key: "gstin", label: "GSTIN (optional)", placeholder: "33ABCDE1234F1Z5" },
      { key: "gst_threshold_rupees", label: "Lower GST slab up to (₹ per piece)", type: "number" },
      { key: "gst_rate_low", label: "Lower slab rate (%)", type: "number" },
      { key: "gst_rate_high", label: "Higher slab rate (%)", type: "number" },
      { key: "bill_footer", label: "Thank-you line on bill" },
      { key: "exchange_policy", label: "Exchange policy (printed on bill)", placeholder: "Optional" },
    ],
  },
  {
    title: "Home page banner",
    fields: [
      { key: "banner_title", label: "Banner headline" },
      { key: "banner_subtitle", label: "Banner text", type: "textarea" },
    ],
  },
  {
    title: "About page: meet the owner",
    fields: [
      { key: "owner_name", label: "Owner name" },
      { key: "owner_title", label: "Title" },
      { key: "owner_story", label: "Story (shown on the About page)", type: "textarea", hint: "Leave a blank line between paragraphs" },
    ],
  },
];

export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const [v, setV] = useState<SettingsInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  async function uploadPhoto(f: File | undefined) {
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setV((x) => ({ ...x, owner_photo: data.url }));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        setErrors({});
        start(async () => {
          const r = await saveSettings(v);
          if (r.ok) setMsg({ ok: true, text: "Settings saved. The store is updated." });
          else {
            setErrors(r.fieldErrors ?? {});
            setMsg({ ok: false, text: r.error });
          }
        });
      }}
    >
      {GROUPS.map((g) => (
        <section key={g.title} className="card p-5">
          <h2 className="font-sans font-semibold">{g.title}</h2>
          {g.note && <p className="mt-1 text-sm text-muted">{g.note}</p>}
          {g.title.startsWith("About") && (
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-28 w-24 overflow-hidden rounded-2xl bg-cream ring-1 ring-sand">
                {v.owner_photo && <Image src={v.owner_photo} alt="Owner photo" fill sizes="96px" className="object-cover" />}
              </div>
              <button type="button" className="btn-outline" onClick={() => file.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Change photo
              </button>
              <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => uploadPhoto(e.target.files?.[0])} />
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {g.fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <label className="label" htmlFor={f.key}>
                  {f.label}
                </label>
                {f.type === "textarea" ? (
                  <textarea id={f.key} className="input min-h-32" value={String(v[f.key] ?? "")} onChange={(e) => setV((x) => ({ ...x, [f.key]: e.target.value }))} />
                ) : (
                  <input
                    id={f.key}
                    className="input"
                    type={f.type ?? "text"}
                    value={String(v[f.key] ?? "")}
                    placeholder={f.placeholder}
                    onChange={(e) => setV((x) => ({ ...x, [f.key]: e.target.value }))}
                  />
                )}
                {f.hint && !errors[f.key] && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
                {errors[f.key] && <p className="mt-1 text-xs font-medium text-danger">{errors[f.key]}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}
      <section className="card p-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-magenta"
            checked={v.prices_are_placeholders === "1"}
            onChange={(e) => setV((x) => ({ ...x, prices_are_placeholders: e.target.checked ? "1" : "0" }))}
          />
          Show the &quot;placeholder prices&quot; reminder in Products
        </label>
      </section>
      <div className="sticky bottom-20 z-10 flex items-center gap-3 rounded-2xl bg-white/90 p-3 shadow-lg ring-1 ring-sand backdrop-blur lg:bottom-4">
        <button className="btn-primary" disabled={pending || uploading}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save settings
        </button>
        {msg && (
          <p className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`} role={msg.ok ? "status" : "alert"}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}
