import { CouponsAdmin } from "@/components/admin/CouponsAdmin";
import { listAdminCoupons } from "@/lib/admin/coupons";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Bookmaker } from "@/lib/types";

export default async function AdminCouponsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [coupons, { data: bookmakers }] = await Promise.all([
    listAdminCoupons(),
    supabase.from("bookmakers").select("*").eq("active", true).order("rank"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold">Kuponger</h1>
        <p className="text-muted">
          Redaktionens spelförslag. Statusen räknas ur benen av databasen —
          rätta objekten här, kupongen flyttar sig själv från Öppna till
          Avgjorda och rättar användarnas kopior.
        </p>
      </div>
      <CouponsAdmin
        coupons={coupons}
        bookmakers={(bookmakers || []) as Bookmaker[]}
      />
    </div>
  );
}
