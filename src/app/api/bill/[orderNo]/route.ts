import { getAdmin } from "@/lib/auth";
import type { InvoiceSnapshot } from "@/lib/invoice";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { loadOrder, tokenMatches } from "@/lib/order-data";

/** Bill PDF: the owner, or anyone holding the order's private link token. */
export async function GET(req: Request, ctx: RouteContext<"/api/bill/[orderNo]">) {
  const { orderNo } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t");
  const data = await loadOrder(orderNo);
  if (!data?.invoice) return new Response("Bill not found", { status: 404 });
  const allowed = tokenMatches(data.order.viewToken, token) || Boolean(await getAdmin());
  if (!allowed) return new Response("Bill not found", { status: 404 });
  const snap = JSON.parse(data.invoice.snapshot) as InvoiceSnapshot;
  const pdf = await renderInvoicePdf(snap);
  const filename = `${snap.invoiceNo.replace(/\//g, "-")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
