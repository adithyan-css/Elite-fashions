"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, FileText, Loader2, MessageCircle, Send } from "lucide-react";
import { markPaid, setOrderStatus } from "@/app/admin/order-actions";
import type { OrderStatus } from "@/db/schema";
import { NEXT_STATUS, STATUS_LABEL } from "@/lib/orders";

type Props = {
  orderId: number;
  status: OrderStatus;
  totalRupees: number;
  links: { paymentRequest: string; bill?: string; billPdf?: string; statusUpdate: string };
};

export function OrderActions({ orderId, status, totalRupees, links }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [method, setMethod] = useState<"upi" | "cash" | "card" | "bank">("upi");
  const [amount, setAmount] = useState(String(totalRupees));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong");
      else {
        setConfirmCancel(false);
        setNote("");
        router.refresh();
      }
    });

  const next = NEXT_STATUS[status].filter((s) => s !== "paid");

  return (
    <div className="space-y-5">
      {status === "awaiting_payment" && (
        <>
          <a href={links.paymentRequest} target="_blank" rel="noopener" className="btn-whatsapp w-full">
            <MessageCircle className="h-4 w-4" /> Send payment request (UPI)
          </a>
          <form
            className="card space-y-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => markPaid({ orderId, method, amount, reference }));
            }}
          >
            <h3 className="font-sans font-semibold">Mark as paid</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="method">
                  Method
                </label>
                <select id="method" className="input" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank transfer</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="amount">
                  Amount (₹)
                </label>
                <input id="amount" className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="reference">
                UPI ref / note <span className="font-normal text-muted">(optional)</span>
              </label>
              <input id="reference" className="input" value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 4321 1234 5678" />
            </div>
            <button className="btn-primary w-full" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Payment received, create bill
            </button>
            <p className="text-xs text-muted">This takes the items out of stock and issues the next bill number.</p>
          </form>
        </>
      )}

      {links.billPdf && (
        <div className="grid gap-2 sm:grid-cols-2">
          <a href={links.billPdf} target="_blank" rel="noopener" className="btn-outline">
            <FileText className="h-4 w-4" /> Open bill (PDF)
          </a>
          {links.bill && (
            <a href={links.bill} target="_blank" rel="noopener" className="btn-whatsapp">
              <Send className="h-4 w-4" /> Send bill on WhatsApp
            </a>
          )}
        </div>
      )}

      {next.length > 0 && (
        <div className="card space-y-3 p-4">
          <h3 className="font-sans font-semibold">Update status</h3>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note (optional), e.g. courier & tracking no." aria-label="Status note" />
          <div className="flex flex-wrap gap-2">
            {next
              .filter((s) => s !== "cancelled")
              .map((s) => (
                <button key={s} type="button" className="btn-primary px-4 py-2" disabled={pending} onClick={() => run(() => setOrderStatus({ orderId, to: s as "packed", note }))}>
                  Mark {STATUS_LABEL[s].toLowerCase()}
                </button>
              ))}
            {next.includes("cancelled") && (
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-semibold text-danger hover:bg-rose-50"
                disabled={pending}
                onClick={() => (confirmCancel ? run(() => setOrderStatus({ orderId, to: "cancelled", note })) : setConfirmCancel(true))}
              >
                {confirmCancel ? "Tap again to cancel order" : "Cancel order"}
              </button>
            )}
          </div>
          {status !== "awaiting_payment" && (
            <a href={links.statusUpdate} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1f9d55]">
              <MessageCircle className="h-4 w-4" /> Send status update on WhatsApp
            </a>
          )}
        </div>
      )}
      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
