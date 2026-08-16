import { PagesAdmin } from "@/components/admin/PagesAdmin";
import { listPages } from "@/lib/admin/pages";

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const rows = await listPages(sp.q);

  return <PagesAdmin rows={rows} q={sp.q ?? ""} />;
}
