import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { amountInWords, type InvoiceSnapshot } from "./invoice";

const PLUM = rgb(0.231, 0.039, 0.212);
const MAGENTA = rgb(0.557, 0.11, 0.478);
const GOLD = rgb(0.788, 0.588, 0.169);
const INK = rgb(0.165, 0.086, 0.149);
const MUTED = rgb(0.435, 0.353, 0.408);
const LINE = rgb(0.918, 0.863, 0.784);

const money = (p: number) => `₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p / 100)}`;
const dateIST = (iso: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

let fontCache: { regular: Uint8Array; semibold: Uint8Array; logo: Uint8Array | null } | null = null;
async function assets() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "src", "fonts");
  const [regular, semibold] = await Promise.all([readFile(path.join(dir, "Poppins-Regular.ttf")), readFile(path.join(dir, "Poppins-SemiBold.ttf"))]);
  const logo = await readFile(path.join(process.cwd(), "public", "brand", "logo.png")).catch(() => null);
  fontCache = { regular, semibold, logo };
  return fontCache;
}

function fit(text: string, font: PDFFont, size: number, max: number): string {
  if (font.widthOfTextAtSize(text, size) <= max) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > max) t = t.slice(0, -1);
  return `${t}…`;
}

function right(page: PDFPage, text: string, xRight: number, y: number, font: PDFFont, size: number, color = INK) {
  page.drawText(text, { x: xRight - font.widthOfTextAtSize(text, size), y, size, font, color });
}

export async function renderInvoicePdf(inv: InvoiceSnapshot): Promise<Uint8Array> {
  const a = await assets();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const reg = await doc.embedFont(a.regular, { subset: true });
  const bold = await doc.embedFont(a.semibold, { subset: true });
  doc.setTitle(`${inv.store.name} ${inv.invoiceNo}`);
  doc.setAuthor(inv.store.name);
  doc.setCreator(inv.store.name);
  doc.setProducer(inv.store.name);

  const W = 595.28; // A4
  const H = 841.89;
  const M = 40;
  let page = doc.addPage([W, H]);

  // header band
  page.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: PLUM });
  if (a.logo) {
    const img = await doc.embedPng(a.logo);
    page.drawImage(img, { x: M, y: H - 92, width: 70, height: 70 });
  }
  page.drawText(inv.store.name, { x: M + 84, y: H - 52, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`${inv.store.address}, ${inv.store.city}`, { x: M + 84, y: H - 70, size: 9, font: reg, color: rgb(0.95, 0.84, 0.54) });
  const contact = [inv.store.phone && `Ph: ${inv.store.phone}`, inv.store.instagram && `Instagram: @${inv.store.instagram}`].filter(Boolean).join("   ");
  if (contact) page.drawText(contact, { x: M + 84, y: H - 84, size: 9, font: reg, color: rgb(0.95, 0.84, 0.54) });
  right(page, inv.title, W - M, H - 52, bold, 14, rgb(1, 1, 1));
  if (inv.store.gstin) right(page, `GSTIN: ${inv.store.gstin}`, W - M, H - 70, reg, 9, rgb(0.95, 0.84, 0.54));

  // meta
  let y = H - 140;
  page.drawText("Bill to", { x: M, y, size: 9, font: bold, color: MUTED });
  page.drawText("Bill details", { x: W / 2 + 20, y, size: 9, font: bold, color: MUTED });
  y -= 16;
  page.drawText(inv.customer.name, { x: M, y, size: 11, font: bold, color: INK });
  const meta: [string, string][] = [
    ["Bill no.", inv.invoiceNo],
    ["Date", dateIST(inv.issuedAt)],
    ["Order no.", inv.orderNo],
  ];
  meta.forEach(([k, v], i) => {
    page.drawText(k, { x: W / 2 + 20, y: y - i * 15, size: 9.5, font: reg, color: MUTED });
    right(page, v, W - M, y - i * 15, bold, 9.5);
  });
  page.drawText(`+91 ${inv.customer.phone}`, { x: M, y: y - 15, size: 9.5, font: reg, color: INK });
  const addr = inv.customer.fulfilment === "pickup" ? "Store pickup" : inv.customer.address;
  const addrLines = addr.match(/.{1,52}(\s|$)/g) ?? [addr];
  addrLines.slice(0, 3).forEach((l, i) => page.drawText(l.trim(), { x: M, y: y - 30 - i * 13, size: 9, font: reg, color: MUTED }));

  // table
  y -= 80;
  const gst = inv.title === "TAX INVOICE";
  const cols = gst
    ? { item: M, size: 290, qty: 330, rate: 400, gst: 440, amt: W - M }
    : { item: M, size: 330, qty: 380, rate: 470, gst: 0, amt: W - M };
  page.drawRectangle({ x: M - 6, y: y - 7, width: W - 2 * M + 12, height: 24, color: rgb(0.973, 0.937, 0.886) });
  page.drawText("Item", { x: cols.item, y, size: 9, font: bold, color: PLUM });
  page.drawText("Size", { x: cols.size, y, size: 9, font: bold, color: PLUM });
  right(page, "Qty", cols.qty + 20, y, bold, 9, PLUM);
  right(page, "Rate", cols.rate + 30, y, bold, 9, PLUM);
  if (gst) right(page, "GST", cols.gst + 40, y, bold, 9, PLUM);
  right(page, "Amount", cols.amt, y, bold, 9, PLUM);
  y -= 26;

  for (const it of inv.items) {
    if (y < 190) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
    page.drawText(fit(it.name, reg, 9.5, (gst ? cols.size : cols.size) - cols.item - 12), { x: cols.item, y, size: 9.5, font: reg, color: INK });
    if (it.designNo) page.drawText(`D.No. ${it.designNo}`, { x: cols.item, y: y - 12, size: 8, font: reg, color: MUTED });
    page.drawText(it.size, { x: cols.size, y, size: 9.5, font: reg, color: INK });
    right(page, String(it.qty), cols.qty + 20, y, reg, 9.5);
    right(page, money(it.unit), cols.rate + 30, y, reg, 9.5);
    if (gst) right(page, `${it.rate}%`, cols.gst + 40, y, reg, 9.5);
    right(page, money(it.gross), cols.amt, y, reg, 9.5);
    y -= 26;
    page.drawLine({ start: { x: M - 6, y: y + 10 }, end: { x: W - M + 6, y: y + 10 }, thickness: 0.6, color: LINE });
  }

  // totals
  y -= 6;
  const tot: [string, string, boolean][] = [];
  if (gst) {
    tot.push(["Taxable value", money(inv.totals.taxable), false], ["CGST", money(inv.totals.cgst), false], ["SGST", money(inv.totals.sgst), false]);
  }
  if (inv.totals.discount) tot.push(["Discount", `- ${money(inv.totals.discount)}`, false]);
  tot.push(["Total", money(inv.totals.total), true]);
  for (const [k, v, strong] of tot) {
    if (strong) {
      page.drawRectangle({ x: W / 2 + 10, y: y - 8, width: W / 2 - M - 4, height: 26, color: PLUM });
      page.drawText(k, { x: W / 2 + 20, y, size: 11, font: bold, color: rgb(1, 1, 1) });
      right(page, v, W - M - 4, y, bold, 11, rgb(1, 1, 1));
    } else {
      page.drawText(k, { x: W / 2 + 20, y, size: 9.5, font: reg, color: MUTED });
      right(page, v, W - M - 4, y, reg, 9.5);
    }
    y -= strong ? 30 : 16;
  }
  page.drawText(amountInWords(inv.totals.total), { x: M, y: y + 4, size: 9, font: bold, color: INK });
  y -= 14;
  const method = { upi: "UPI", cash: "Cash", card: "Card", bank: "Bank transfer" }[inv.payment.method] ?? inv.payment.method;
  page.drawText(`Paid by ${method}${inv.payment.reference ? ` · Ref ${inv.payment.reference}` : ""} · ${money(inv.payment.amount)}`, { x: M, y, size: 9, font: reg, color: MUTED });
  if (gst) {
    y -= 13;
    page.drawText("Prices are inclusive of GST.", { x: M, y, size: 8.5, font: reg, color: MUTED });
  }

  // footer
  const fy = 70;
  page.drawLine({ start: { x: M, y: fy + 34 }, end: { x: W - M, y: fy + 34 }, thickness: 1, color: GOLD });
  if (inv.footer) page.drawText(inv.footer, { x: M, y: fy + 16, size: 10, font: bold, color: MAGENTA });
  if (inv.policy) page.drawText(fit(inv.policy, reg, 8.5, W - 2 * M), { x: M, y: fy + 2, size: 8.5, font: reg, color: MUTED });
  page.drawText("This is a computer-generated bill.", { x: M, y: fy - 12, size: 7.5, font: reg, color: MUTED });

  return doc.save();
}
