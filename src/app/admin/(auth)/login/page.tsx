import type { Metadata } from "next";
import {
  AdminAuthShell,
  AdminLoginForm,
} from "@/components/admin/AdminAuthForms";

export const metadata: Metadata = {
  title: "Logga in · Admin",
  robots: { index: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AdminAuthShell
      title="Logga in i admin"
      lead="Admin har ett eget inlogg, skilt från spelboken."
    >
      <AdminLoginForm next={next?.startsWith("/admin") ? next : "/admin"} />
    </AdminAuthShell>
  );
}
