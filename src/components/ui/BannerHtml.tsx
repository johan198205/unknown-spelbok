"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";
import { sendBannerEvent } from "@/lib/banner-events";
import { BANNER_HTML_SANDBOX, bannerHtmlDocument } from "@/lib/banner-html";
import { cn } from "@/lib/utils";
import type { BannerPlacement } from "@/lib/types";

/** Halva bannern synlig räknas som en visning — samma tröskel som BannerLink. */
const VISIBLE_RATIO = 0.5;

export function BannerHtml({
  bannerId,
  placement,
  title,
  html,
  className,
}: {
  bannerId: string;
  placement: BannerPlacement;
  title: string;
  html: string;
  className?: string;
}) {
  const pathname = usePathname();
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const viewLoggedRef = useRef(false);
  const clickLoggedRef = useRef(false);

  const srcDoc = useMemo(() => bannerHtmlDocument(html), [html]);

  // Exakt en visning och ett klick per banner och sidvisning. Spärrarna släpper
  // när bannern byts eller besökaren navigerar vidare.
  useEffect(() => {
    viewLoggedRef.current = false;
    clickLoggedRef.current = false;
  }, [bannerId, pathname]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || viewLoggedRef.current) return;
        viewLoggedRef.current = true;
        observer.disconnect();

        sendBannerEvent("view", bannerId, pathname);
        track({ event: "banner_impression", banner_id: bannerId, placement });
      },
      { threshold: VISIBLE_RATIO }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [bannerId, placement, pathname]);

  // Klicket sker inuti ett dokument på annan origin — vi kan varken lyssna på
  // det eller läsa mål-URL:en. Det enda observerbara spåret är att fönstret
  // tappar fokus i samma stund som iframen får det. Heuristiken missar
  // mittenklick men fångar det vanliga fallet; annonsörens egen räknare är
  // fortfarande sanningen mot nätverket, våra siffror är en indikation.
  useEffect(() => {
    function onBlur() {
      const node = frameRef.current;
      if (!node || clickLoggedRef.current) return;
      if (document.activeElement !== node) return;

      clickLoggedRef.current = true;
      sendBannerEvent("click", bannerId, pathname);
      track({ event: "banner_click", banner_id: bannerId, placement });
    }

    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [bannerId, placement, pathname]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={srcDoc}
      sandbox={BANNER_HTML_SANDBOX}
      loading="lazy"
      scrolling="no"
      className={cn(
        "block w-full overflow-hidden rounded-[var(--radius-ad)] border border-line bg-panel",
        className
      )}
    />
  );
}
