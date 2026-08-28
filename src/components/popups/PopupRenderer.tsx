"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sendPopupEvent } from "@/lib/popup-events";
import {
  isExternalUrl,
  markPopupSeen,
  popupAlreadySeen,
  popupApplies,
  type Popup,
} from "@/lib/popups";

/**
 * Kör triggern och ritar rutan.
 *
 * Matchningen mot sökväg sker här och inte på servern: root-layouten
 * renderas bara vid full sidladdning, så en popup bunden till /kuponger
 * hade aldrig triggat när besökaren klickade sig dit inifrån appen.
 * Komponenten får alla aktiva rader och väljer själv vid varje
 * pathname-byte.
 *
 * En ruta i taget. Två kampanjer som råkar matcha samma sida ska inte
 * stapla sig ovanpå varandra — den med lägst `sort` vinner, resten
 * ligger kvar och kan trigga vid nästa sidvisning.
 */

/** Hur nära toppen muspekaren måste komma för att räknas som utgång. */
const EXIT_THRESHOLD_PX = 8;

/**
 * Exit-triggern får inte slå direkt vid sidladdning: pekaren står ofta
 * redan vid adressfältet när sidan renderas, och rutan hade då slagit upp
 * innan besökaren hunnit se sidan alls.
 */
const EXIT_ARM_DELAY_MS = 1500;

export function PopupRenderer({
  popups,
  authed,
}: {
  popups: Popup[];
  authed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [visible, setVisible] = useState<Popup | null>(null);
  /** Rutor som redan visats i den här sessionen av appen (utan omladdning). */
  const shownThisMount = useRef<Set<string>>(new Set());

  const show = useCallback((popup: Popup) => {
    shownThisMount.current.add(popup.id);
    markPopupSeen(popup);
    setVisible(popup);
  }, []);

  // -----------------------------------------------------------
  // Kandidat + trigger
  //
  // Allt i EN effekt: kandidaten avgörs av localStorage (frekvensen), som
  // bara får läsas på klienten, och alla fyra triggers behöver samma
  // städning när sökvägen byts. Uppdelat hade det blivit fyra
  // avlyssnare att hålla i synk med varandra.
  // -----------------------------------------------------------
  useEffect(() => {
    if (visible) return;

    const candidate = popups.find(
      (p) =>
        !shownThisMount.current.has(p.id) &&
        popupApplies(p, { pathname, authed }) &&
        !popupAlreadySeen(p)
    );
    if (!candidate) return;

    // De direkta vägarna (load, och scroll på en sida som redan uppfyller
    // villkoret) skjuts en tick framåt. Dels för att en setState rakt i
    // effektkroppen ger en kaskadrendering, dels för att rutan annars
    // hade slagit upp innan sidan bakom den hunnit målas.
    let immediate = 0;
    const soon = (fn: () => void) => {
      immediate = window.setTimeout(fn, 0);
    };

    if (candidate.trigger_type === "load") {
      soon(() => show(candidate));
      return () => window.clearTimeout(immediate);
    }

    if (candidate.trigger_type === "delay") {
      const timer = window.setTimeout(
        () => show(candidate),
        Math.max(0, candidate.trigger_value) * 1000
      );
      return () => window.clearTimeout(timer);
    }

    if (candidate.trigger_type === "scroll") {
      const target = Math.min(100, Math.max(1, candidate.trigger_value));

      const onScroll = () => {
        const scrollable =
          document.documentElement.scrollHeight - window.innerHeight;
        // Sida som inte går att scrolla: villkoret kan aldrig uppfyllas,
        // så rutan visas direkt i stället för att aldrig komma.
        const percent =
          scrollable <= 0 ? 100 : (window.scrollY / scrollable) * 100;
        if (percent >= target) show(candidate);
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      // Redan förbi målet vid inladdning (ankarlänk, återställd scroll).
      soon(onScroll);
      return () => {
        window.clearTimeout(immediate);
        window.removeEventListener("scroll", onScroll);
      };
    }

    // exit
    let armed = false;
    const arm = window.setTimeout(() => {
      armed = true;
    }, EXIT_ARM_DELAY_MS);

    const onMouseOut = (e: MouseEvent) => {
      if (!armed) return;
      // relatedTarget saknas när pekaren lämnar dokumentet helt.
      if (e.relatedTarget) return;
      if (e.clientY > EXIT_THRESHOLD_PX) return;
      show(candidate);
    };

    // Mobilen har ingen muspekare att lämna fönstret med. Bakåtgesten är
    // den närmaste motsvarigheten: ett tillagt history-läge fångar den
    // första bakåtnavigeringen utan att besökaren faktiskt lämnar sidan.
    const onPopState = () => {
      if (!armed) return;
      show(candidate);
    };

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) {
      window.history.pushState({ sbPopup: true }, "");
      window.addEventListener("popstate", onPopState);
    } else {
      document.addEventListener("mouseout", onMouseOut);
    }

    return () => {
      window.clearTimeout(arm);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("popstate", onPopState);
    };
  }, [popups, pathname, authed, visible, show]);

  // Visningen loggas när rutan faktiskt är på skärmen. Det är också här
  // notisen skapas — se /api/popup-events.
  useEffect(() => {
    if (!visible) return;
    sendPopupEvent("view", visible.id, pathname);
    // pathname medvetet utanför: visningen hör till sidan rutan öppnades på.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Escape stänger, och bakgrunden ska inte gå att scrolla bakom rutan.
  useEffect(() => {
    if (!visible) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function close() {
    if (!visible) return;
    sendPopupEvent("dismiss", visible.id, pathname);
    setVisible(null);
  }

  function activate() {
    if (!visible?.button_url) return;
    const url = visible.button_url.trim();
    sendPopupEvent("click", visible.id, pathname);
    setVisible(null);

    if (isExternalUrl(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(url.startsWith("/") ? url : `/${url}`);
  }

  if (!visible) return null;

  const hasButton = !!visible.button_label?.trim() && !!visible.button_url?.trim();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={visible.title || "Erbjudande"}
      onClick={close}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[rgba(5,7,12,.72)] p-4 backdrop-blur-[3px] sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sbfade relative w-full max-w-[440px] overflow-hidden rounded-[var(--radius-sheet)] border border-line-strong bg-panel shadow-[var(--shadow-modal)]"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Stäng"
          className="absolute right-3 top-3 z-10 flex size-[30px] items-center justify-center rounded-full border border-line-strong bg-[rgba(15,20,32,.75)] text-[17px] leading-none text-muted backdrop-blur-[2px] transition hover:text-text"
        >
          ×
        </button>

        {visible.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={visible.image_url}
            alt=""
            className="block max-h-[280px] w-full object-cover"
          />
        ) : null}

        {visible.title || visible.body || hasButton ? (
          <div className="p-5">
            {visible.title ? (
              <h2 className="font-display text-[21px] font-semibold uppercase leading-[1.2] tracking-[0.03em] text-text">
                {visible.title}
              </h2>
            ) : null}
            {visible.body ? (
              <p className="mt-2 whitespace-pre-line text-[14.5px] leading-[1.5] text-text-soft [text-wrap:pretty]">
                {visible.body}
              </p>
            ) : null}
            {hasButton ? (
              <button
                type="button"
                onClick={activate}
                className="mt-4 w-full rounded-[10px] bg-win px-4 py-3 text-[14.5px] font-bold text-win-ink transition hover:brightness-105"
              >
                {visible.button_label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
