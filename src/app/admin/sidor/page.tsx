import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PagesAdmin } from "@/components/admin/PagesAdmin";
import type { Page } from "@/lib/types";

export default async function AdminPagesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[28px] font-semibold">Sidor</h1>
      <PagesAdmin items={(data || []) as Page[]} />
    </div>
  );
}
