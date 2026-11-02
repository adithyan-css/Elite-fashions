import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR) : path.join(process.cwd(), "data", "uploads");

/** Stores an already-processed WebP image and returns the public URL. */
export async function storeImage(buf: Buffer, folder = "products"): Promise<string> {
  const name = `${folder}/${randomUUID()}.webp`;
  if (process.env.STORAGE_DRIVER === "supabase") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    const bucket = process.env.SUPABASE_BUCKET ?? "product-images";
    if (!url || !key) throw new Error("Supabase storage needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.storage.from(bucket).upload(name, buf, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return supabase.storage.from(bucket).getPublicUrl(name).data.publicUrl;
  }
  const file = path.join(UPLOAD_DIR, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buf);
  return `/uploads/${name}`;
}
