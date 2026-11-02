import sharp, { type Metadata } from "sharp";
import { getAdmin } from "@/lib/auth";
import { storeImage } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp", "heif", "avif"]);

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: "Not signed in" }, { status: 401 });
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES + 64 * 1024) return Response.json({ error: "Photo is larger than 8 MB" }, { status: 413 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No photo received" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Photo is larger than 8 MB" }, { status: 413 });

  const input = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata(); // decide by the bytes, not the file name or browser-sent type
  } catch {
    return Response.json({ error: "That file is not a photo" }, { status: 415 });
  }
  if (!meta.format || !ALLOWED.has(meta.format)) return Response.json({ error: "Use a JPG, PNG or WebP photo" }, { status: 415 });

  // rotate by EXIF, resize, re-encode: this also strips location and camera metadata
  const out = await sharp(input).rotate().resize({ width: 1200, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  try {
    const url = await storeImage(out);
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}
