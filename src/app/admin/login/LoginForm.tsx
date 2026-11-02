"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginAction } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input className="input" id="email" name="email" type="email" autoComplete="username" required maxLength={200} />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} />
      </div>
      {state?.error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn-primary h-11 w-full" disabled={pending}>
        <LogIn className="h-4 w-4" /> {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
