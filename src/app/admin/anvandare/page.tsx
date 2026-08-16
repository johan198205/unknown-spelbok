import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UsersAdmin } from "@/components/admin/UsersAdmin";
import type { Profile } from "@/lib/types";

export default async function AdminUsersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[28px] font-semibold">Användare</h1>
      <UsersAdmin users={(data || []) as Profile[]} />
    </div>
  );
}
