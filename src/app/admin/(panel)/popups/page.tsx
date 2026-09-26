import { requireAdmin } from "@/lib/auth";
import { listPopups, type PopupRow } from "@/lib/admin/popups";
import { PopupsAdmin } from "@/components/admin/PopupsAdmin";

export const metadata = { title: "Popups" };

export default async function AdminPopupsPage() {
  await requireAdmin();

  // Sidan ska gå att öppna innan db/popups.sql är körd — annars är det enda
  // admin ser en stack trace, utan att någonstans få veta vad som saknas.
  let items: PopupRow[] = [];
  let error: string | null = null;
  try {
    items = await listPopups();
  } catch (e) {
    error = e instanceof Error ? e.message : "Kunde inte läsa popups";
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold">Popups</h1>
        <p className="text-muted">
          Kampanjrutor med egen trigger, räckvidd och frekvens. Varje visning
          kan också lägga en notis i sidopanelen.
        </p>
      </div>
      {error ? (
        <div className="rounded-[var(--radius-card)] border border-loss/40 bg-loss/10 px-4 py-3 text-[14px] text-loss">
          {error}
        </div>
      ) : (
        <PopupsAdmin items={items} />
      )}
    </div>
  );
}
