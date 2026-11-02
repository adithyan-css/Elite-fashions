"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartLine = {
  key: string; // productId:size
  productId: number;
  slug: string;
  name: string;
  designNo: string;
  image: string;
  sizeLabel: string;
  qty: number;
  pricePaise: number; // display only; the server re-prices every order
};

export const MAX_QTY = 10;

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  sync: (fresh: { key: string; pricePaise?: number; remove?: boolean }[]) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line, qty = 1) =>
        set((s) => {
          const key = `${line.productId}:${line.sizeLabel}`;
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return { lines: s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty), pricePaise: line.pricePaise } : l)) };
          }
          return { lines: [...s.lines, { ...line, key, qty: Math.min(MAX_QTY, Math.max(1, qty)) }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({ lines: s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, Math.max(1, Math.floor(qty) || 1)) } : l)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
      sync: (fresh) =>
        set((s) => ({
          lines: s.lines
            .filter((l) => !fresh.find((f) => f.key === l.key && f.remove))
            .map((l) => {
              const f = fresh.find((x) => x.key === l.key);
              return f?.pricePaise ? { ...l, pricePaise: f.pricePaise } : l;
            }),
        })),
    }),
    { name: "ef-cart", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}
export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty * l.pricePaise, 0);
}
