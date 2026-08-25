"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Tunn stapel högst upp medan nästa sida hämtas.
 *
 * Sidbyten i appen går över servern och tar ofta ett par hundra millisekunder
 * innan något syns. Utan kvittens ser ett klick ut som att det missade, och
 * folk klickar igen. Stapeln startar på klicket och försvinner när adressen
 * bytts — den lovar inget om hur långt det är kvar, bara att något händer.
 *
 * Lyssnaren sitter på dokumentet i stället för på varje <Link>, så den täcker
 * alla länkar i appen utan att de behöver ändras.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target as Element | null;
      const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.hasAttribute("download")) return;
      if (link.target && link.target !== "_self") return;

      const url = new URL(link.href, window.location.href);
      // Externa länkar och rena ankare byter inte sida i appen.
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      setActive(true);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Ny adress = navigeringen är framme.
  const route = `${pathname}?${searchParams}`;
  const [seenRoute, setSeenRoute] = useState(route);
  if (seenRoute !== route) {
    setSeenRoute(route);
    setActive(false);
  }

  // Skyddsnät: en avbruten navigering får inte lämna en stapel som hänger kvar.
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setActive(false), 10000);
    return () => clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] overflow-hidden"
    >
      <div className="animate-sbprogress h-full w-full bg-win shadow-[0_0_12px_var(--win)]" />
    </div>
  );
}
