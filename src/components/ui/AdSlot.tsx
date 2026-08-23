import { BannerLink } from "./BannerLink";
import { getBannerForPlacement } from "@/lib/banners";
import { cn } from "@/lib/utils";
import type { BannerPlacement } from "@/lib/types";

export async function AdSlot({
  placement,
  label = "ANNONSPLATS 970×90",
  className,
}: {
  placement: BannerPlacement;
  label?: string;
  className?: string;
}) {
  const banner = await getBannerForPlacement(placement);

  if (!banner) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-[var(--radius-ad)] border border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,var(--ad-a),var(--ad-a)_10px,var(--ad-b)_10px,var(--ad-b)_20px)] font-mono-num text-[12px] tracking-[0.14em] text-faint",
          className
        )}
      >
        {label}
      </div>
    );
  }

  // Visningen loggas i klienten när bannern faktiskt syns — en serverrendering
  // säger inget om att besökaren scrollade ner till annonsplatsen.
  return (
    <BannerLink
      bannerId={banner.id}
      placement={placement}
      href={banner.link_url}
      title={banner.title}
      imageUrl={banner.image_url}
      className={className}
    />
  );
}
