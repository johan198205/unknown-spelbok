import { PlanketAdmin } from "@/components/admin/PlanketAdmin";
import { listReportedPosts } from "@/lib/admin/planket";
import { PLANKET_AUTOHIDE_REPORTS } from "@/lib/planket";

export const dynamic = "force-dynamic";

export default async function AdminPlanketPage() {
  const rows = await listReportedPosts();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-[26px] font-semibold uppercase tracking-[0.06em]">
          Planket
        </h1>
        <p className="mt-1 max-w-[70ch] text-[14px] text-muted">
          Anmälda inlägg. Vid {PLANKET_AUTOHIDE_REPORTS} anmälningar döljs
          inlägget automatiskt i väntan på granskning och redaktionen får en
          notis — Behåll tar tillbaka det i flödet.
        </p>
      </div>

      <PlanketAdmin rows={rows} />
    </div>
  );
}
