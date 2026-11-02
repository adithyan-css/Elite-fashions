import type { OrderStatus } from "@/db/schema";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  packed: "Packed",
  shipped: "Shipped",
  ready_for_pickup: "Ready for pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<OrderStatus, string> = {
  awaiting_payment: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  packed: "bg-sky-100 text-sky-800",
  shipped: "bg-indigo-100 text-indigo-800",
  ready_for_pickup: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-rose-100 text-rose-800",
};

/** Allowed next statuses from each status (the owner can only move an order forward, or cancel before shipping). */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["paid", "cancelled"],
  paid: ["packed", "cancelled"],
  packed: ["shipped", "ready_for_pickup", "cancelled"],
  shipped: ["delivered"],
  ready_for_pickup: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canMove(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUS[from].includes(to);
}

/** Steps shown to the customer on the status page. */
export function customerSteps(status: OrderStatus, fulfilment: "delivery" | "pickup") {
  const last: OrderStatus = fulfilment === "pickup" ? "ready_for_pickup" : "shipped";
  const flow: OrderStatus[] = ["awaiting_payment", "paid", "packed", last, "delivered"];
  const idx = flow.indexOf(status);
  return flow.map((s, i) => ({ status: s, label: STATUS_LABEL[s], done: status !== "cancelled" && i <= idx, current: s === status }));
}

/** Indian mobile: returns 10 digits, or "" if invalid. Accepts +91 / 0 prefixes, spaces and dashes. */
export function normalizeIndianMobile(input: string): string {
  let d = (input || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : "";
}
