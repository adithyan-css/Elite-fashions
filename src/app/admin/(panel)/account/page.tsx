import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { supabaseAuthEnabled } from "@/utils/supabase/config";
import { ChangePasswordForm, LogoutButtons } from "../../AccountForms";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage(props: PageProps<"/admin/account">) {
  const admin = await requireAdmin({ allowPasswordChange: true });
  const first = (await props.searchParams).first === "1" || admin.mustChangePassword;
  return (
    <>
      <h1 className="text-2xl font-semibold text-plum">Account</h1>
      <p className="text-sm text-muted">
        {admin.name} · {admin.email} · {admin.role === "owner" ? "Owner" : "Staff"} · Sign-in via {supabaseAuthEnabled() ? "Supabase Auth" : "store login"}
      </p>
      {first && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          Welcome! Please set your own password before using the admin panel.
        </p>
      )}
      <section className="card mt-6 max-w-md p-5">
        <h2 className="mb-4 font-sans font-semibold">Change password</h2>
        <ChangePasswordForm />
      </section>
      <section className="card mt-6 max-w-md p-5">
        <h2 className="mb-4 font-sans font-semibold">Sessions</h2>
        <LogoutButtons />
      </section>
    </>
  );
}
