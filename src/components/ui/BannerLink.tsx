"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";
import { sendBannerEvent } from "@/lib/banner-events";
import { cn } from "@/lib/utils";
import type { BannerPlacement } from "@/lib/types";

/** Halva bannern synlig räknas som en visning. */
const VISIBLE_RATIO = 0.5;

export function BannerLink({
  bannerId,
  placement,
  href,
  title,
  imageUrl,
  className,
}: {
  bannerId: string;
  placement: BannerPlacement;
  href: string | null;
  title: string;
  imageUrl: string;
  className?: string;
}) {
  const pathname = usePathname();
  const frameRef = useRef<HTMLElement | null>(null);
  const loggedRef = useRef(false);

  // Ramen är en <a> eller en <div> beroende på om bannern länkar någonstans —
  // en callback-ref slipper casta mellan elementtyperna.
  const setFrame = useCallback((node: HTMLElement | null) => {
    frameRef.current = node;
  }, []);

  // Exakt en visning per banner och sidvisning. Spärren släpper när bannern
  // byts eller besökaren navigerar vidare — att scrolla förbi samma banner
  // fram och tillbaka räknas alltså bara en gång. Effekten står före
  // observern nedan så spärren hinner nollställas innan den kopplas om.
  useEffect(() => {
    loggedRef.current = false;
  }, [bannerId, pathname]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    // Responsiva annonsplatser renderar samma banner två gånger (hidden /
    // lg:hidden). display:none ger aldrig en intersection, så bara den synliga
    // varianten loggar.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || loggedRef.current) return;
        loggedRef.current = true;
        observer.disconnect();

        sendBannerEvent("view", bannerId, pathname);
        track({ event: "banner_impression", banner_id: bannerId, placement });
      },
      { threshold: VISIBLE_RATIO }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [bannerId, placement, pathname]);

  /** Navigeringen får aldrig vänta: beacon + dataLayer är båda synkrona. */
  function register() {
    sendBannerEvent("click", bannerId, pathname);
    track({ event: "banner_click", banner_id: bannerId, placement });
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
    return (
      <div ref={setFrame} className={frame}>
        {image}
      </div>
    );
  }

  return (
    <a
      ref={setFrame}
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
