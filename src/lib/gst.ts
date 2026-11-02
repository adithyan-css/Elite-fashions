/**
 * GST on readymade garments (from 22 Sep 2025): 5% when the sale value per piece is up to
 * ₹2,500, 18% above that. Threshold and rates are store settings so they can change without code.
 * Prices on the site INCLUDE GST, so tax is backed out of each line.
 */
export type GstConfig = { enabled: boolean; thresholdPaise: number; rateLow: number; rateHigh: number };

export type TaxLine = {
  unitPricePaise: number;
  qty: number;
  ratePct: number;
  grossPaise: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
};

export function rateFor(unitPricePaise: number, cfg: GstConfig): number {
  // The slab is decided on the per-piece value before tax; with inclusive pricing we test the
  // taxable value at the low rate, matching how billing software applies the threshold.
  const taxableAtLow = unitPricePaise / (1 + cfg.rateLow / 100);
  return taxableAtLow <= cfg.thresholdPaise ? cfg.rateLow : cfg.rateHigh;
}

export function taxLine(unitPricePaise: number, qty: number, cfg: GstConfig): TaxLine {
  const gross = unitPricePaise * qty;
  if (!cfg.enabled) return { unitPricePaise, qty, ratePct: 0, grossPaise: gross, taxablePaise: gross, cgstPaise: 0, sgstPaise: 0 };
  const rate = rateFor(unitPricePaise, cfg);
  const taxable = Math.round(gross / (1 + rate / 100));
  const tax = gross - taxable;
  const cgst = Math.floor(tax / 2);
  return { unitPricePaise, qty, ratePct: rate, grossPaise: gross, taxablePaise: taxable, cgstPaise: cgst, sgstPaise: tax - cgst };
}

export function summarize(lines: TaxLine[]) {
  return lines.reduce(
    (a, l) => ({
      gross: a.gross + l.grossPaise,
      taxable: a.taxable + l.taxablePaise,
      cgst: a.cgst + l.cgstPaise,
      sgst: a.sgst + l.sgstPaise,
    }),
    { gross: 0, taxable: 0, cgst: 0, sgst: 0 },
  );
}

/** Indian financial year label for a date, e.g. 2026-27 for any date from 1 Apr 2026 to 31 Mar 2027 (IST). */
export function financialYear(d: Date): string {
  const ist = new Date(d.getTime() + 5.5 * 3600 * 1000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
