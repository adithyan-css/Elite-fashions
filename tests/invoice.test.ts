import { describe, expect, it } from "vitest";
import { amountInWords, buildSnapshot, formatInvoiceNo } from "@/lib/invoice";
import { customerSteps, canMove, normalizeIndianMobile } from "@/lib/orders";

describe("amount in words (Indian numbering)", () => {
  it.each([
    [459700, "Rupees Four Thousand Five Hundred Ninety Seven Only"],
    [100, "Rupees One Only"],
    [12345650, "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Fifty Paise Only"],
    [1000000000, "Rupees One Crore Only"],
    [0, "Rupees Zero Only"],
  ])("%i paise", (p, words) => expect(amountInWords(p)).toBe(words));
});

describe("invoice snapshot", () => {
  const base = {
    invoiceNo: formatInvoiceNo("2026-27", 7),
    issuedAt: new Date("2026-11-02T10:00:00Z"),
    order: { orderNo: "EF-2611-0001", customerName: "Priya", phone: "9876543210", address: "", fulfilment: "pickup" as const, discountPaise: 0, totalPaise: 459700 },
    items: [
      { name: "Pink Sharara", designNo: "ES-8322-P", sizeLabel: "20", qty: 2, unitPricePaise: 179900 },
      { name: "Sage Skirt Set", designNo: "7080", sizeLabel: "24", qty: 1, unitPricePaise: 99900 },
    ],
    payment: { method: "upi", reference: "1234", amountPaise: 459700 },
  };
  it("numbers bills per financial year", () => expect(base.invoiceNo).toBe("INV/2026-27/0007"));
  it("plain bill without GSTIN", () => {
    const s = buildSnapshot({ ...base, settings: { store_name: "Elite Fashions", gstin: "" } });
    expect(s.title).toBe("BILL");
    expect(s.totals.cgst + s.totals.sgst).toBe(0);
    expect(s.totals.gross).toBe(459700);
  });
  it("tax invoice with GSTIN splits tax and still totals exactly", () => {
    const s = buildSnapshot({ ...base, settings: { store_name: "Elite Fashions", gstin: "33ABCDE1234F1Z5", gst_threshold_rupees: "2500", gst_rate_low: "5", gst_rate_high: "18" } });
    expect(s.title).toBe("TAX INVOICE");
    expect(s.items.every((i) => i.rate === 5)).toBe(true);
    expect(s.totals.taxable + s.totals.cgst + s.totals.sgst).toBe(s.totals.gross);
  });
});

describe("order rules", () => {
  it("status moves", () => {
    expect(canMove("awaiting_payment", "paid")).toBe(true);
    expect(canMove("awaiting_payment", "shipped")).toBe(false);
    expect(canMove("delivered", "cancelled")).toBe(false);
    expect(canMove("shipped", "cancelled")).toBe(false);
  });
  it("customer steps for pickup", () => {
    expect(customerSteps("packed", "pickup").map((s) => s.done)).toEqual([true, true, true, false, false]);
    expect(customerSteps("packed", "pickup")[3].label).toBe("Ready for pickup");
  });
  it("mobile numbers", () => {
    expect(normalizeIndianMobile("+91 98765-43210")).toBe("9876543210");
    expect(normalizeIndianMobile("5876543210")).toBe("");
    expect(normalizeIndianMobile("12345")).toBe("");
  });
});
