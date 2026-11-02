"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
/** true only on the client after hydration, so persisted counts never mismatch the server HTML. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
