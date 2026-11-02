import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/storage";

/** Serves images uploaded with STORAGE_DRIVER=local (files written after build are not in /public). */
export async function GET(_req: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const parts = (await ctx.params).path;
  if (!parts.every((p) => /^[a-zA-Z0-9_-]+(\.webp)?$/.test(p)) || !parts.at(-1)?.endsWith(".webp")) return new Response("Not found", { status: 404 });
  const file = path.join(UPLOAD_DIR, ...parts);
  if (!file.startsWith(UPLOAD_DIR + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(file);
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
