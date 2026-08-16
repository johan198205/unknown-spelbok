import { requireAdmin } from "@/lib/auth";
import { listBanners } from "@/lib/admin/banners";
import { BannersAdmin } from "@/components/admin/BannersAdmin";

export default async function AdminBannersPage() {
  await requireAdmin();
  const items = await listBanners();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold">Banners</h1>
        <p className="text-muted">
          Annonsplatser, schemaläggning och utfall per placering.
        </p>
      </div>
      <BannersAdmin items={items} />
    </div>
  );
}
