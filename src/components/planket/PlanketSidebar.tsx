import { BannerCreative, EmptyAdSlot, hasCreative } from "@/components/ui/AdSlot";
import { getBannersForPlacement } from "@/lib/banners";

/**
 * Högerkolumnen på Planket är annonsyta: alla aktiva 160×600-banners på
 * placeringen 'planket', två i bredd och i sort-ordning. Ingen rotation —
 * kolumnen rymmer flera samtidigt. Banners läggs in under /admin/banners.
 *
 * 2 × 160 + 12 px mellanrum = 332 px.
 */
export async function PlanketSidebar() {
  const banners = (await getBannersForPlacement("planket", "160x600")).filter(
    hasCreative
  );

  return (
    <aside className="hidden w-[332px] shrink-0 sheet:block">
      {banners.length === 0 ? (
        <EmptyAdSlot format="160x600" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {banners.map((banner) => (
            <BannerCreative key={banner.id} banner={banner} placement="planket" />
          ))}
        </div>
      )}
    </aside>
  );
}
