import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CompetitionsAdmin } from "@/components/admin/CompetitionsAdmin";
import type { Competition } from "@/lib/types";

export default async function AdminCompetitionsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("competitions")
    .select("*")
    .order("starts_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[28px] font-semibold">Tävlingar</h1>
      <CompetitionsAdmin items={(data || []) as Competition[]} />
    </div>
  );
}
