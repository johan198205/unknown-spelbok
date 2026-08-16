import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BannersAdmin } from "@/components/admin/BannersAdmin";
import type { Banner } from "@/lib/types";

export default async function AdminBannersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("banners")
    .select("*")
    .order("sort");

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[28px] font-semibold">Banners</h1>
      <BannersAdmin items={(data || []) as Banner[]} />
    </div>
  );
}
