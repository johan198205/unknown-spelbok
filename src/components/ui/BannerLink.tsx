"use client";

import { useTransition } from "react";
import { logBannerClick } from "@/lib/banner-events";
import { cn } from "@/lib/utils";

export function BannerLink({
  bannerId,
  href,
  title,
  imageUrl,
  className,
}: {
  bannerId: string;
  href: string | null;
  title: string;
  imageUrl: string;
  className?: string;
}) {
  const [, startTransition] = useTransition();

  function register() {
    startTransition(async () => {
      await logBannerClick(bannerId);
    });
  }

  const frame = cn(
    "block overflow-hidden rounded-[var(--radius-ad)] border border-line bg-panel",
    className
  );

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={title}
      loading="lazy"
      className="h-full w-full object-cover"
    />
  );

  if (!href) {
    return <div className={frame}>{image}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      onClick={register}
      onAuxClick={register}
      className={cn(frame, "hover:no-underline")}
    >
      {image}
    </a>
  );
}
