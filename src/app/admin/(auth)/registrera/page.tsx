import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminAuthShell,
  AdminRegisterForm,
} from "@/components/admin/AdminAuthForms";
import { findOpenInvite } from "@/lib/admin/admin-auth";

export const metadata: Metadata = {
  title: "Skapa admininlogg · Admin",
  robots: { index: false },
};

export default async function AdminRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const invite = await findOpenInvite(token);

  if (!invite) {
    return (
      <AdminAuthShell
        title="Inbjudan gäller inte"
        lead="Länken är ogiltig, redan använd eller har gått ut. Be en admin om en ny inbjudan."
      >
        <Link href="/admin/login" className="text-sm">
          Till admininloggningen
        </Link>
      </AdminAuthShell>
    );
  }

  return (
    <AdminAuthShell
      title="Skapa admininlogg"
      lead="Du har blivit inbjuden som admin. Kontot är fristående från spelboken."
    >
      <AdminRegisterForm token={token} email={invite.email} />
    </AdminAuthShell>
  );
}
