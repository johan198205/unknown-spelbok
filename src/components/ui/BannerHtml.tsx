"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";
import { sendBannerEvent } from "@/lib/banner-events";
import {
  BANNER_HTML_RESIZE_TYPE,
  BANNER_HTML_SANDBOX,
  bannerHtmlDocument,
} from "@/lib/banner-html";
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
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );

  const srcDoc = useMemo(() => bannerHtmlDocument(html), [html]);

  // Exakt en visning och ett klick per banner och sidvisning. Spärrarna släpper
  // när bannern byts eller besökaren navigerar vidare.
  useEffect(() => {
    viewLoggedRef.current = false;
    clickLoggedRef.current = false;
  }, [bannerId, pathname]);

  // Sandlådan saknar same-origin — storleken kommer via postMessage från snutten.
  useEffect(() => {
    setSize(null);

    function onMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.type !== BANNER_HTML_RESIZE_TYPE) return;
      const nextH = Number(data.height);
      const nextW = Number(data.width);
      if (!Number.isFinite(nextH) || nextH <= 0) return;
      setSize({
        height: Math.ceil(nextH),
        width: Number.isFinite(nextW) && nextW > 0 ? Math.ceil(nextW) : 0,
      });
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [srcDoc]);

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
  }, [bannerId, placement, pathname, size]);

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
    <div
      className={cn(
        "flex w-full items-center justify-center bg-transparent",
        className
      )}
    >
      <iframe
        ref={frameRef}
        title={title}
        srcDoc={srcDoc}
        sandbox={BANNER_HTML_SANDBOX}
        loading="lazy"
        scrolling="no"
        // Krymper till snuttens mått och centreras — ingen fullbredd vit yta.
        style={{
          backgroundColor: "transparent",
          colorScheme: "dark",
          ...(size
            ? {
                height: size.height,
                width: size.width > 0 ? size.width : "100%",
                maxWidth: "100%",
              }
            : undefined),
        }}
        className={cn(
          "block max-w-full border-0 bg-transparent",
          size == null && "min-h-[50px] w-full"
        )}
      />
    </div>
  );
}
