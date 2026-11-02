import { summarize, taxLine, type GstConfig } from "./gst";

export type InvoiceSnapshot = {
  invoiceNo: string;
  issuedAt: string; // ISO
  title: "TAX INVOICE" | "BILL";
  store: { name: string; address: string; city: string; phone: string; gstin: string; instagram: string };
  customer: { name: string; phone: string; address: string; fulfilment: "delivery" | "pickup" };
  orderNo: string;
  items: { name: string; designNo: string; size: string; qty: number; unit: number; gross: number; rate: number; taxable: number; cgst: number; sgst: number }[];
  totals: { gross: number; taxable: number; cgst: number; sgst: number; discount: number; total: number };
  payment: { method: string; reference: string; amount: number };
  footer: string;
  policy: string;
};

export function gstConfig(settings: Record<string, string>): GstConfig {
  return {
    enabled: Boolean(settings.gstin?.trim()),
    thresholdPaise: Math.round(Number(settings.gst_threshold_rupees || 2500) * 100),
    rateLow: Number(settings.gst_rate_low || 5),
    rateHigh: Number(settings.gst_rate_high || 18),
  };
}

export function buildSnapshot(args: {
  invoiceNo: string;
  issuedAt: Date;
  settings: Record<string, string>;
  order: { orderNo: string; customerName: string; phone: string; address: string; fulfilment: "delivery" | "pickup"; discountPaise: number; totalPaise: number };
  items: { name: string; designNo: string; sizeLabel: string; qty: number; unitPricePaise: number }[];
  payment: { method: string; reference: string; amountPaise: number };
}): InvoiceSnapshot {
  const { settings: st, order, items } = args;
  const cfg = gstConfig(st);
  const lines = items.map((i) => ({ i, t: taxLine(i.unitPricePaise, i.qty, cfg) }));
  const sum = summarize(lines.map((l) => l.t));
  return {
    invoiceNo: args.invoiceNo,
    issuedAt: args.issuedAt.toISOString(),
    title: cfg.enabled ? "TAX INVOICE" : "BILL",
    store: {
      name: st.store_name ?? "Elite Fashions",
      address: st.address_line ?? "",
      city: st.city ?? "",
      phone: st.phone_display || (st.whatsapp ? `+${st.whatsapp}` : ""),
      gstin: st.gstin?.trim() ?? "",
      instagram: st.instagram ?? "",
    },
    customer: { name: order.customerName, phone: order.phone, address: order.address, fulfilment: order.fulfilment },
    orderNo: order.orderNo,
    items: lines.map(({ i, t }) => ({
      name: i.name,
      designNo: i.designNo,
      size: i.sizeLabel,
      qty: i.qty,
      unit: i.unitPricePaise,
      gross: t.grossPaise,
      rate: t.ratePct,
      taxable: t.taxablePaise,
      cgst: t.cgstPaise,
      sgst: t.sgstPaise,
    })),
    totals: { gross: sum.gross, taxable: sum.taxable, cgst: sum.cgst, sgst: sum.sgst, discount: order.discountPaise, total: order.totalPaise },
    payment: { method: args.payment.method, reference: args.payment.reference, amount: args.payment.amountPaise },
    footer: st.bill_footer ?? "",
    policy: st.exchange_policy ?? "",
  };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}
function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? twoDigits(r) : ""].filter(Boolean).join(" ");
}

/** Indian numbering: 459700 paise -> "Rupees Four Thousand Five Hundred Ninety Seven Only" */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const ps = paise % 100;
  if (rupees === 0 && ps === 0) return "Rupees Zero Only";
  const crore = Math.floor(rupees / 1e7);
  const lakh = Math.floor((rupees % 1e7) / 1e5);
  const thousand = Math.floor((rupees % 1e5) / 1e3);
  const rest = rupees % 1000;
  const parts = [crore ? `${twoDigits(crore)} Crore` : "", lakh ? `${twoDigits(lakh)} Lakh` : "", thousand ? `${twoDigits(thousand)} Thousand` : "", rest ? threeDigits(rest) : ""].filter(Boolean);
  return `Rupees ${parts.join(" ") || "Zero"}${ps ? ` and ${twoDigits(ps)} Paise` : ""} Only`;
}

/** INV/2026-27/0001 */
export function formatInvoiceNo(fy: string, seq: number): string {
  return `INV/${fy}/${String(seq).padStart(4, "0")}`;
}
