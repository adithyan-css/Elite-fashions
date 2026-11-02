"use client";

import { useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { setProductActive } from "@/app/admin/actions";

export function ToggleActive({ id, active }: { id: number; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setProductActive(id, !active))}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"}`}
      aria-label={active ? "Hide from store" : "Show in store"}
    >
      {active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      {active ? "Live" : "Hidden"}
    </button>
  );
}
