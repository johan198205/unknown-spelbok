import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BookmakersAdmin } from "@/components/admin/BookmakersAdmin";
import type { Bookmaker } from "@/lib/types";

export default async function AdminBookmakersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookmakers")
    .select("*")
    .order("rank");

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[28px] font-semibold">Spelbolag</h1>
      <BookmakersAdmin items={(data || []) as Bookmaker[]} />
    </div>
  );
}
