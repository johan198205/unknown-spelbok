import { requireAdmin } from "@/lib/auth";
import { listCompetitions } from "@/lib/admin/competitions";
import { CompetitionsAdmin } from "@/components/admin/CompetitionsAdmin";

export default async function AdminCompetitionsPage() {
  await requireAdmin();
  const items = await listCompetitions();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold">Tävlingar</h1>
        <p className="text-muted">
          Perioder, kvalregler och pris. Topplistan rankar de deltagare som
          klarar kraven.
        </p>
      </div>
      <CompetitionsAdmin items={items} />
    </div>
  );
}
