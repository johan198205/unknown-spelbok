import { BannerHtml } from "./BannerHtml";
import { BannerLink } from "./BannerLink";
import { getBannerForPlacement } from "@/lib/banners";
import { cn } from "@/lib/utils";
import type { Banner, BannerFormat, BannerPlacement } from "@/lib/types";

/** Mjuk ledtråd för tom plats — faktiska banners följer snuttens/bildens mått. */
const EMPTY_MIN_HEIGHT: Record<BannerFormat, string> = {
  "970x90": "min-h-[90px]",
  "320x100": "min-h-[100px]",
  "300x250": "min-h-[250px]",
  "160x600": "min-h-[600px]",
};

export function hasCreative(banner: Banner) {
  return (banner.creative_type === "html" && !!banner.html_code) || !!banner.image_url;
}

/**
 * En enskild banner. Visningen loggas i klienten när bannern faktiskt syns —
 * en serverrendering säger inget om att besökaren scrollade ner till
 * annonsplatsen. Returnerar null för en rad utan kreativ, vilket
 * check-constraintet i db/banner-html.sql hindrar men äldre rader kan bära på.
 */
export function BannerCreative({
  banner,
  placement,
  className,
}: {
  banner: Banner;
  placement: BannerPlacement;
  className?: string;
}) {
  if (banner.creative_type === "html" && banner.html_code) {
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

  if (banner.image_url) {
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

  return null;
}

/** Tom plats får en mjuk min-höjd; fyllda platser anpassar sig efter snutten/bilden. */
export function EmptyAdSlot({
  format,
  label,
  className,
}: {
  format: BannerFormat;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center rounded-[var(--radius-ad)] border border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,var(--ad-a),var(--ad-a)_10px,var(--ad-b)_10px,var(--ad-b)_20px)] font-mono-num text-[12px] tracking-[0.14em] text-faint",
        EMPTY_MIN_HEIGHT[format],
        className
      )}
    >
      {label ?? `ANNONSPLATS ${format.replace("x", "×")}`}
    </div>
  );
}

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

  if (banner && hasCreative(banner)) {
    return (
      <BannerCreative banner={banner} placement={placement} className={className} />
    );
  }

  return <EmptyAdSlot format={format} label={label} className={className} />;
}
