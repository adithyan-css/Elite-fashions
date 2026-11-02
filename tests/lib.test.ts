import { describe, expect, it } from "vitest";
import { formatPrice, formatPlain, discountPercent } from "@/lib/money";
import { normalizeWhatsApp, waLink, orderMessage } from "@/lib/whatsapp";
import { taxLine, rateFor, summarize, financialYear } from "@/lib/gst";
import { filterProducts, parseShopQuery, type ProductCard } from "@/lib/catalog-types";

describe("money", () => {
  it("formats rupees in Indian grouping", () => {
    expect(formatPrice(145000)).toBe("₹1,450");
    expect(formatPrice(12345600)).toBe("₹1,23,456");
    expect(formatPlain(145050)).toBe("Rs. 1,450.5");
  });
  it("computes discount", () => {
    expect(discountPercent(1800_00, 2200_00)).toBe(18);
    expect(discountPercent(1000, null)).toBe(0);
    expect(discountPercent(1000, 900)).toBe(0);
  });
});

describe("whatsapp", () => {
  it("normalizes numbers", () => {
    expect(normalizeWhatsApp("98765 43210")).toBe("919876543210");
    expect(normalizeWhatsApp("+91-98765-43210")).toBe("919876543210");
    expect(normalizeWhatsApp("098765 43210")).toBe("919876543210");
    expect(normalizeWhatsApp("123")).toBe("");
  });
  it("builds an encoded wa.me link", () => {
    const l = waLink("919876543210", "Hi & hello\nline2");
    expect(l).toBe("https://wa.me/919876543210?text=Hi%20%26%20hello%0Aline2");
  });
  it("order message lists items and total", () => {
    const m = orderMessage({
      storeName: "Elite Fashions",
      orderNo: "EF-2611-0001",
      customerName: "Priya",
      items: [{ name: "Pink Sharara", designNo: "ES-8322-P", sizeLabel: "20", qty: 2, unitPricePaise: 179900 }],
      totalPaise: 359800,
      fulfilment: "pickup",
      statusUrl: "https://x/order/EF-2611-0001?t=abc",
    });
    expect(m).toContain("EF-2611-0001");
    expect(m).toContain("Size 20 x 2 = Rs. 3,598");
    expect(m).toContain("Total: Rs. 3,598");
    expect(m).toContain("collect from the store");
  });
});

describe("gst", () => {
  const cfg = { enabled: true, thresholdPaise: 250000, rateLow: 5, rateHigh: 18 };
  it("picks the slab per piece", () => {
    expect(rateFor(199900, cfg)).toBe(5);
    expect(rateFor(262500, cfg)).toBe(5); // 2625 incl. 5% = 2500 taxable
    expect(rateFor(262600, cfg)).toBe(18);
  });
  it("backs out tax and splits CGST/SGST exactly", () => {
    const l = taxLine(105000, 2, cfg);
    expect(l.grossPaise).toBe(210000);
    expect(l.taxablePaise).toBe(200000);
    expect(l.cgstPaise + l.sgstPaise).toBe(10000);
    const s = summarize([l, taxLine(99900, 1, cfg)]);
    expect(s.taxable + s.cgst + s.sgst).toBe(s.gross);
  });
  it("disabled GST leaves totals untouched", () => {
    const l = taxLine(99900, 3, { ...cfg, enabled: false });
    expect(l.taxablePaise).toBe(299700);
    expect(l.cgstPaise).toBe(0);
  });
  it("financial year in IST", () => {
    expect(financialYear(new Date("2026-11-02T10:00:00Z"))).toBe("2026-27");
    expect(financialYear(new Date("2027-03-31T18:00:00Z"))).toBe("2026-27"); // 11:30 pm IST 31 Mar
    expect(financialYear(new Date("2027-03-31T18:31:00Z"))).toBe("2027-28"); // 00:01 IST 1 Apr
  });
});

describe("catalogue filtering", () => {
  const mk = (id: number, o: Partial<ProductCard>): ProductCard => ({
    id, slug: `p${id}`, name: `Dress ${id}`, designNo: `${7000 + id}`, brand: "Tulip Fashion", category: "lehenga-choli",
    colour: "Pink", pricePaise: 100000 * id, mrpPaise: null, tags: [], isFeatured: false, image: "", imageAlt: "",
    sizes: [{ label: "20", stock: 1 }], createdAt: id, groupKey: null, ...o,
  });
  const all = [mk(1, {}), mk(2, { category: "skirt-top", brand: "Kid n Kids", colour: "Green" }), mk(3, { sizes: [{ label: "20", stock: 0 }] })];
  it("filters by category, brand, size stock and search", () => {
    expect(filterProducts(all, { category: "skirt-top" }).map((p) => p.id)).toEqual([2]);
    expect(filterProducts(all, { size: "20" }).map((p) => p.id).sort()).toEqual([1, 2]);
    expect(filterProducts(all, { q: "7002" }).map((p) => p.id)).toEqual([2]);
    expect(filterProducts(all, { q: "green kid" }).map((p) => p.id)).toEqual([2]);
    expect(filterProducts(all, { sort: "price-desc" }).map((p) => p.id)).toEqual([3, 2, 1]);
    expect(filterProducts(all, { max: 1500 }).map((p) => p.id)).toEqual([1]);
  });
  it("parses and sanitises query params", () => {
    expect(parseShopQuery({ sort: "evil", max: "-5", q: "x".repeat(200) })).toEqual(
      expect.objectContaining({ sort: undefined, max: undefined, q: undefined }),
    );
  });
});
