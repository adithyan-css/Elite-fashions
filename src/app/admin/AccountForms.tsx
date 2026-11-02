"use client";

import { useActionState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { changePasswordAction, logoutAction } from "./actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="current">
          Current password
        </label>
        <input className="input" id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div>
        <label className="label" htmlFor="next">
          New password
        </label>
        <input className="input" id="next" name="next" type="password" autoComplete="new-password" required />
        <p className="mt-1 text-xs text-muted">At least 10 characters with letters and a number.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          Confirm new password
        </label>
        <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      {state?.error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success" role="status">
          Password changed. Other devices have been signed out.
        </p>
      )}
      <button className="btn-primary" disabled={pending}>
        <KeyRound className="h-4 w-4" /> {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

export function LogoutButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      <form action={logoutAction}>
        <button className="btn-outline">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </form>
      <form action={logoutAction}>
        <input type="hidden" name="everywhere" value="1" />
        <button className="btn-outline">Sign out on all devices</button>
      </form>
    </div>
  );
}
