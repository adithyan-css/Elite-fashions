const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,450 — whole rupees for the storefront. */
export function formatPrice(paise: number): string {
  return inr.format(Math.round(paise) / 100);
}

/** ₹1,450.00 — exact amounts for bills. */
export function formatExact(paise: number): string {
  return inr2.format(Math.round(paise) / 100);
}

/** "Rs. 1,450" — plain text for WhatsApp messages, where ₹ can render oddly on old phones. */
export function formatPlain(paise: number): string {
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Math.round(paise) / 100)}`;
}

export function discountPercent(pricePaise: number, mrpPaise: number | null | undefined): number {
  if (!mrpPaise || mrpPaise <= pricePaise) return 0;
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
