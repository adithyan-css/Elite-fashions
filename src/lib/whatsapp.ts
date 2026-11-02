import { formatPlain } from "./money";

/** Digits only, Indian 10-digit numbers get the 91 country code. Returns "" when invalid. */
export function normalizeWhatsApp(input: string): string {
  const digits = (input || "").replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return "";
}

/** Click-to-chat link: https://wa.me/<number>?text=<url-encoded message> */
export function waLink(number: string, text?: string): string {
  const n = normalizeWhatsApp(number);
  const base = n ? `https://wa.me/${n}` : "https://wa.me/";
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export type MessageItem = { name: string; designNo?: string; sizeLabel: string; qty: number; unitPricePaise: number };

export function orderMessage(o: {
  storeName: string;
  orderNo: string;
  customerName: string;
  items: MessageItem[];
  totalPaise: number;
  fulfilment: "delivery" | "pickup";
  address?: string;
  note?: string;
  statusUrl: string;
}): string {
  const lines = [
    `Hi ${o.storeName}, I'd like to place an order.`,
    ``,
    `Order: ${o.orderNo}`,
    `Name: ${o.customerName}`,
    ``,
    ...o.items.map(
      (i, idx) =>
        `${idx + 1}. ${i.name}${i.designNo ? ` (D.No. ${i.designNo})` : ""} - Size ${i.sizeLabel} x ${i.qty} = ${formatPlain(i.unitPricePaise * i.qty)}`,
    ),
    ``,
    `Total: ${formatPlain(o.totalPaise)}`,
    o.fulfilment === "pickup" ? `Pickup: I will collect from the store` : `Deliver to: ${o.address ?? ""}`,
  ];
  if (o.note) lines.push(`Note: ${o.note}`);
  lines.push(``, `Order status: ${o.statusUrl}`, ``, `Please share the payment details.`);
  return lines.join("\n");
}

export function paymentRequestMessage(o: {
  customerName: string;
  orderNo: string;
  totalPaise: number;
  upiId: string;
  upiName: string;
  storeName: string;
}): string {
  return [
    `Hi ${o.customerName}, thank you for your order ${o.orderNo} at ${o.storeName}!`,
    ``,
    `Amount to pay: ${formatPlain(o.totalPaise)}`,
    o.upiId ? `UPI ID: ${o.upiId} (${o.upiName})` : `Payment: UPI / cash at the store`,
    ``,
    `Please send a screenshot here once paid. We'll share your bill right away.`,
  ].join("\n");
}

export function billMessage(o: { customerName: string; orderNo: string; invoiceNo: string; billUrl: string; storeName: string }): string {
  return [
    `Hi ${o.customerName}, we've received your payment for order ${o.orderNo}. Thank you!`,
    ``,
    `Your bill (${o.invoiceNo}): ${o.billUrl}`,
    ``,
    `- ${o.storeName}`,
  ].join("\n");
}

export function statusUpdateMessage(o: { customerName: string; orderNo: string; statusLabel: string; statusUrl: string; storeName: string }): string {
  return [`Hi ${o.customerName}, update on your order ${o.orderNo}: ${o.statusLabel}.`, ``, `Track it here: ${o.statusUrl}`, ``, `- ${o.storeName}`].join(
    "\n",
  );
}
