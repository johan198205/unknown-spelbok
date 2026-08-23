import { requireAdmin } from "@/lib/auth";
import { listCompetitions } from "@/lib/admin/competitions";
import { getSiteSettings } from "@/lib/admin/settings";
import { CompetitionsAdmin } from "@/components/admin/CompetitionsAdmin";

export default async function AdminCompetitionsPage() {
  await requireAdmin();
  const [items, site] = await Promise.all([
    listCompetitions(),
    getSiteSettings(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold">Tävlingar</h1>
        <p className="text-muted">
          Perioder, kvalregler och pris. Topplistan rankar de deltagare som
          klarar kraven.
        </p>
      </div>
      <CompetitionsAdmin
        items={items}
        competitionsEnabled={site.competitions_enabled}
      />
    </div>
  );
}
