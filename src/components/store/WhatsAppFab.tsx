"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/whatsapp";

/** Pages with their own bottom buttons on phones: hide the floating chat button there. */
const BUSY = ["/product/", "/cart", "/checkout", "/order/"];

export function WhatsAppFab({ number, storeName }: { number: string; storeName: string }) {
  const path = usePathname();
  const busy = BUSY.some((b) => path.startsWith(b));
  return (
    <a
      href={waLink(number, `Hi ${storeName}! I have a question.`)}
      target="_blank"
      rel="noopener"
      aria-label="Chat with us on WhatsApp"
      className={`fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 h-14 w-14 place-items-center rounded-full bg-[#1f9d55] text-white shadow-lg shadow-black/20 transition hover:scale-105 sm:right-6 sm:bottom-6 ${busy ? "hidden lg:grid" : "grid"}`}
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
