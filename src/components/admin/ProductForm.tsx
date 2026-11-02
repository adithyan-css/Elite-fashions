"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { deleteProduct, saveProduct, type ProductInput } from "@/app/admin/actions";

type Initial = {
  id?: number;
  slug?: string;
  name: string;
  designNo: string;
  brand: string;
  category: string;
  colour: string;
  description: string;
  price: string;
  mrp: string;
  tags: string[];
  isFeatured: boolean;
  isActive: boolean;
  groupKey: string;
  sizes: { label: string; stock: string }[];
  images: { url: string; alt: string }[];
};

export function ProductForm({ initial, categories, brands }: { initial: Initial; categories: { slug: string; name: string }[]; brands: string[] }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [uploading, setUploading] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const set = <K extends keyof Initial>(k: K, val: Initial[K]) => setV((x) => ({ ...x, [k]: val }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const room = 6 - v.images.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (!picked.length) return setMsg({ tone: "err", text: "Up to 6 photos per product" });
    setUploading((n) => n + picked.length);
    for (const f of picked) {
      const fd = new FormData();
      fd.append("file", f);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        setV((x) => ({ ...x, images: [...x.images, { url: data.url, alt: "" }].slice(0, 6) }));
      } catch (e) {
        setMsg({ tone: "err", text: e instanceof Error ? e.message : "Upload failed" });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const move = (i: number, d: -1 | 1) =>
    setV((x) => {
      const imgs = [...x.images];
      const j = i + d;
      if (j < 0 || j >= imgs.length) return x;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...x, images: imgs };
    });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErrors({});
    const payload: ProductInput = {
      id: v.id,
      name: v.name,
      designNo: v.designNo,
      brand: v.brand,
      category: v.category,
      colour: v.colour,
      description: v.description,
      price: v.price,
      mrp: v.mrp,
      tags: v.tags as ("new" | "sale" | "diwali")[],
      isFeatured: v.isFeatured,
      isActive: v.isActive,
      groupKey: v.groupKey,
      sizes: v.sizes.filter((z) => z.label.trim()).map((z) => ({ label: z.label, stock: z.stock || "0" })),
      images: v.images,
    };
    start(async () => {
      const res = await saveProduct(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMsg({ tone: "err", text: res.error });
        return;
      }
      setMsg({ tone: "ok", text: "Saved. The store is updated." });
      if (!v.id) router.replace(`/admin/products/${res.id}`);
      else router.refresh();
      setV((x) => ({ ...x, id: res.id, slug: res.slug }));
    });
  }

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs font-medium text-danger">{errors[k]}</p> : null);
  const tagOpts = [
    { v: "new", l: "New arrival" },
    { v: "sale", l: "On sale" },
    { v: "diwali", l: "Diwali pick" },
  ];

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
      <div className="space-y-6">
        <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="name">
              Product name
            </label>
            <input id="name" className="input" value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="e.g. Pink Sequin Sharara Set" />
            {err("name")}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="designNo">
                Design no.
              </label>
              <input id="designNo" className="input" value={v.designNo} onChange={(e) => set("designNo", e.target.value)} maxLength={40} />
            </div>
            <div>
              <label className="label" htmlFor="brand">
                Brand
              </label>
              <input id="brand" className="input" list="brands" value={v.brand} onChange={(e) => set("brand", e.target.value)} maxLength={60} />
              <datalist id="brands">
                {brands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label" htmlFor="colour">
                Colour
              </label>
              <input id="colour" className="input" value={v.colour} onChange={(e) => set("colour", e.target.value)} maxLength={40} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="category">
                Category
              </label>
              <select id="category" className="input" value={v.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="groupKey">
                Colour group <span className="font-normal text-muted">(optional)</span>
              </label>
              <input id="groupKey" className="input" value={v.groupKey} onChange={(e) => set("groupKey", e.target.value)} maxLength={40} placeholder="Same code links colour variants" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="description">
              Description
            </label>
            <textarea id="description" className="input min-h-28" value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-semibold">Photos</h2>
            <span className="text-xs text-muted">{v.images.length}/6 · first photo is the cover</span>
          </div>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {v.images.map((im, i) => (
              <li key={im.url} className="relative">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-cream ring-1 ring-sand">
                  <Image src={im.url} alt={im.alt || `Photo ${i + 1}`} fill sizes="120px" className="object-cover object-top" />
                </div>
                <div className="mt-1 flex justify-between">
                  <button type="button" aria-label="Move photo left" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-30">
                    <ArrowUp className="h-4 w-4 -rotate-90" />
                  </button>
                  <button type="button" aria-label="Remove photo" onClick={() => set("images", v.images.filter((_, k) => k !== i))} className="p-1 text-danger">
                    <X className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Move photo right" onClick={() => move(i, 1)} disabled={i === v.images.length - 1} className="p-1 disabled:opacity-30">
                    <ArrowDown className="h-4 w-4 -rotate-90" />
                  </button>
                </div>
              </li>
            ))}
            {v.images.length < 6 && (
              <li>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="grid aspect-[3/4] w-full place-items-center rounded-xl border-2 border-dashed border-sand text-muted hover:border-magenta hover:text-magenta"
                >
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                  <span className="sr-only">Add photos</span>
                </button>
              </li>
            )}
          </ul>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} data-testid="photo-input" />
          {err("images")}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-semibold">Sizes & stock</h2>
            <button type="button" className="btn-outline px-3 py-1.5 text-xs" onClick={() => set("sizes", [...v.sizes, { label: "", stock: "0" }])} disabled={v.sizes.length >= 20}>
              <Plus className="h-3.5 w-3.5" /> Add size
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {v.sizes.map((z, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input w-28"
                  aria-label={`Size ${i + 1} label`}
                  placeholder="Size"
                  value={z.label}
                  maxLength={20}
                  onChange={(e) => set("sizes", v.sizes.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  className="input w-28"
                  aria-label={`Size ${i + 1} stock`}
                  type="number"
                  min={0}
                  max={9999}
                  inputMode="numeric"
                  value={z.stock}
                  onChange={(e) => set("sizes", v.sizes.map((x, k) => (k === i ? { ...x, stock: e.target.value } : x)))}
                />
                <span className="text-xs text-muted">pcs</span>
                <button type="button" aria-label={`Remove size ${z.label}`} className="ml-auto p-2 text-danger" onClick={() => set("sizes", v.sizes.filter((_, k) => k !== i))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {err("sizes")}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card space-y-4 p-5">
          <h2 className="font-sans font-semibold">Price</h2>
          <div>
            <label className="label" htmlFor="price">
              Selling price (₹, incl. GST)
            </label>
            <input id="price" className="input" type="number" min={1} step="1" inputMode="numeric" value={v.price} onChange={(e) => set("price", e.target.value)} />
            {err("price")}
          </div>
          <div>
            <label className="label" htmlFor="mrp">
              MRP (₹) <span className="font-normal text-muted">optional, shown struck out</span>
            </label>
            <input id="mrp" className="input" type="number" min={0} step="1" inputMode="numeric" value={v.mrp} onChange={(e) => set("mrp", e.target.value)} />
            {err("mrp")}
          </div>
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="font-sans font-semibold">Visibility</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-magenta" /> Live in the store
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={v.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="h-4 w-4 accent-magenta" /> Feature on home page
          </label>
          <div className="gold-rule" />
          {tagOpts.map((t) => (
            <label key={t.v} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-magenta"
                checked={v.tags.includes(t.v)}
                onChange={(e) => set("tags", e.target.checked ? [...v.tags, t.v] : v.tags.filter((x) => x !== t.v))}
              />
              {t.l}
            </label>
          ))}
        </section>
        {msg && (
          <p className={`rounded-xl px-3 py-2 text-sm ${msg.tone === "ok" ? "bg-emerald-50 text-success" : "bg-rose-50 text-danger"}`} role={msg.tone === "err" ? "alert" : "status"}>
            {msg.text}
          </p>
        )}
        <button className="btn-primary h-11 w-full" disabled={pending || uploading > 0}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {v.id ? "Save changes" : "Create product"}
        </button>
        {v.slug && (
          <Link href={`/product/${v.slug}`} target="_blank" className="btn-outline w-full">
            View in store
          </Link>
        )}
        {v.id && (
          <button
            type="button"
            className="w-full rounded-full py-2 text-sm font-semibold text-danger hover:bg-rose-50"
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              start(async () => {
                const r = await deleteProduct(v.id!);
                if (r.ok) router.replace("/admin/products");
                else setMsg({ tone: "err", text: r.error ?? "Could not delete" });
              });
            }}
          >
            {confirmDelete ? "Tap again to delete for good" : "Delete product"}
          </button>
        )}
      </aside>
    </form>
  );
}
