import { BannerCreative, EmptyAdSlot, hasCreative } from "@/components/ui/AdSlot";
import { getBannersForPlacement } from "@/lib/banners";

/**
 * Högerkolumnen på Planket är annonsyta: alla aktiva 160×600-banners på
 * placeringen 'planket', en i bredd, ovanför varandra i sort-ordning. Ingen
 * rotation — kolumnen rymmer flera samtidigt. Banners läggs in under
 * /admin/banners.
 */
export async function PlanketSidebar() {
  const banners = (await getBannersForPlacement("planket", "160x600")).filter(
    hasCreative
  );

  return (
    <aside className="hidden w-[160px] shrink-0 lg:block">
      {banners.length === 0 ? (
        <EmptyAdSlot format="160x600" />
      ) : (
        <div className="flex flex-col gap-3">
          {banners.map((banner) => (
            <BannerCreative key={banner.id} banner={banner} placement="planket" />
          ))}
        </div>
      )}
    </aside>
  );
}
