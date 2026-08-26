import { BannerHtml } from "./BannerHtml";
import { BannerLink } from "./BannerLink";
import { getBannerForPlacement } from "@/lib/banners";
import { cn } from "@/lib/utils";
import type { BannerFormat, BannerPlacement } from "@/lib/types";

export async function AdSlot({
  placement,
  format,
  label,
  className,
}: {
  placement: BannerPlacement;
  format: BannerFormat;
  label?: string;
  className?: string;
}) {
  const banner = await getBannerForPlacement(placement, format);

  // Visningen loggas i klienten när bannern faktiskt syns — en serverrendering
  // säger inget om att besökaren scrollade ner till annonsplatsen.
  if (banner?.creative_type === "html" && banner.html_code) {
    return (
      <BannerHtml
        bannerId={banner.id}
        placement={placement}
        title={banner.title}
        html={banner.html_code}
        className={className}
      />
    );
  }

  if (banner?.image_url) {
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

  // Ingen banner — eller en rad utan kreativ, vilket check-constraintet i
  // db/banner-html.sql hindrar men äldre rader kan bära på. Ytan behåller sin
  // höjd i båda fallen så layouten inte hoppar.
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[var(--radius-ad)] border border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,var(--ad-a),var(--ad-a)_10px,var(--ad-b)_10px,var(--ad-b)_20px)] font-mono-num text-[12px] tracking-[0.14em] text-faint",
        className
      )}
    >
      {label ?? `ANNONSPLATS ${format.replace("x", "×")}`}
    </div>
  );
}
