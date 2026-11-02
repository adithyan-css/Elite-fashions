"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type WishItem = { productId: number; slug: string; name: string; image: string; pricePaise: number; designNo: string };

type WishState = {
  items: WishItem[];
  toggle: (item: WishItem) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

export const useWishlist = create<WishState>()(
  persist(
    (set) => ({
      items: [],
      toggle: (item) =>
        set((s) =>
          s.items.some((i) => i.productId === item.productId)
            ? { items: s.items.filter((i) => i.productId !== item.productId) }
            : { items: [item, ...s.items].slice(0, 100) },
        ),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
    }),
    { name: "ef-wishlist", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
