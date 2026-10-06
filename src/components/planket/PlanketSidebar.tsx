import { BannerCreative, EmptyAdSlot, hasCreative } from "@/components/ui/AdSlot";
import { getBannersForPlacement } from "@/lib/banners";

/** Fler än så här ryms inte i högerkolumnen. */
const MAX_BANNERS = 4;

/**
 * Högerkolumnen på Planket är annonsyta: upp till fyra aktiva 160×600-banners
 * på placeringen 'planket', en i bredd, ovanför varandra i sort-ordning.
 * Den sista är sticky och följer med vid scroll, så det alltid syns minst en
 * banner. Banners läggs in under /admin/banners.
 *
 * Kolumnen sträcker sig över flödets hela höjd (self-stretch) — annars har
 * den sista bannern ingen yta att vara sticky i.
 */
export async function PlanketSidebar() {
  const banners = (await getBannersForPlacement("planket", "160x600"))
    .filter(hasCreative)
    .slice(0, MAX_BANNERS);

  const rest = banners.slice(0, -1);
  const last = banners[banners.length - 1];

  return (
    <aside className="hidden w-[160px] shrink-0 self-stretch lg:block">
      {!last ? (
        <EmptyAdSlot format="160x600" />
      ) : (
        <div className="flex h-full flex-col gap-3">
          {rest.map((banner) => (
            <BannerCreative key={banner.id} banner={banner} placement="planket" />
          ))}
          <div className="sticky top-[76px]">
            <BannerCreative banner={last} placement="planket" />
          </div>
        </div>
      )}
    </aside>
  );
}
