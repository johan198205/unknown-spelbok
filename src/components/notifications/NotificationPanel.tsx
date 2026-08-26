"use client";

import { useEffect, useRef, useState } from "react";
import {
  amountColor,
  formatNotificationAmount,
  groupNotifications,
  iconPlateColor,
  NOTIFICATION_META,
  relativeTime,
  type AppNotification,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

export type NotificationTab = "alla" | "olasta";

const EMPTY_TEXT: Record<NotificationTab, string> = {
  olasta: "Inga olästa notiser. Allt är avklarat.",
  alla:
    "Inga notiser än. Här landar mål, rättade spel, nya kuponger och " +
    "tävlingsplaceringar.",
};

/** Tiderna räknas om medan panelen är öppen så "Nu" aldrig blir gammalt. */
const TICK_MS = 30_000;

/** Hur nära botten scrollen måste vara för att nästa sida ska hämtas. */
const LOAD_MORE_PX = 120;

function NotificationRow({
  item,
  now,
  onOpen,
}: {
  item: AppNotification;
  now: number;
  onOpen: (item: AppNotification) => void;
}) {
  const meta = NOTIFICATION_META[item.type];
  const unread = item.read_at === null;
  const amount = item.amount === null ? null : Number(item.amount);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "flex w-full cursor-pointer gap-3 rounded-[12px] border px-[13px] py-3 text-left",
        "transition-colors hover:border-line-hover",
        unread
          ? "border-[rgba(53,214,245,.28)] bg-[rgba(53,214,245,.05)]"
          : "border-line bg-panel"
      )}
    >
      {/*
        Ikonen är en bakgrundsbild, aldrig <img src>: en src som pekar på
        ett värde som ännu inte finns startar en hämtning som failar.
      */}
      <span
        aria-hidden
        className="mt-px size-[34px] shrink-0 rounded-full bg-center bg-no-repeat"
        style={{
          backgroundColor: iconPlateColor(item.type),
          backgroundImage: meta.icon,
          backgroundSize: "17px 17px",
        }}
      />

      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-[1.35] text-text">
          {item.title}
        </span>
        {item.body ? (
          <span className="mt-0.5 block text-[13px] leading-[1.45] text-[#8A94AB] [text-wrap:pretty]">
            {item.body}
          </span>
        ) : null}
        <span className="mt-1.5 flex items-center gap-[9px]">
          <span className="font-mono-num text-[11.5px] text-[#5D6883]">
            {relativeTime(item.created_at, now)}
          </span>
          {amount !== null ? (
            <span
              className="font-mono-num text-[12.5px] font-semibold"
              style={{ color: amountColor(amount) }}
            >
              {formatNotificationAmount(amount, item.amount_kind)}
            </span>
          ) : null}
        </span>
      </span>

      {unread ? (
        <span
          aria-hidden
          className="mt-1 size-2 shrink-0 rounded-full bg-cyan"
        />
      ) : null}
    </button>
  );
}

export function NotificationPanel({
  items,
  unread,
  tab,
  loading,
  hasMore,
  onTab,
  onClose,
  onReadAll,
  onOpen,
  onLoadMore,
  onSettings,
}: {
  items: AppNotification[];
  unread: number;
  tab: NotificationTab;
  loading: boolean;
  hasMore: boolean;
  onTab: (tab: NotificationTab) => void;
  onClose: () => void;
  onReadAll: () => void;
  onOpen: (item: AppNotification) => void;
  onLoadMore: () => void;
  onSettings: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  /*
    Escape stänger — men en öppen dropdown har prioritet och äter tangenten
    själv. Panelen är modal, så det enda som kan ligga över den är något
    som markerat sig med data-dropdown-open.
  */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (document.querySelector("[data-dropdown-open='true']")) return;
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Bakgrunden ska inte rulla under en panel som täcker hela höjden. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const shown = tab === "olasta" ? items.filter((n) => !n.read_at) : items;
  const groups = groupNotifications(shown, now);

  function handleScroll() {
    const el = listRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_PX) {
      onLoadMore();
    }
  }

  return (
    <div
      // Klick inne i panelen bubblar hit — därför måste målet vara
      // backdropen själv, inte något barn.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[92] flex justify-end bg-[rgba(5,7,12,.6)]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notiser"
        className={cn(
          "animate-sbslide flex h-full w-full max-w-full flex-col",
          "notif:w-[400px]",
          "border-l border-line bg-bg-soft shadow-[-24px_0_60px_rgba(0,0,0,.5)]"
        )}
      >
        {/* HUVUD */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-line-soft px-5 py-[18px]">
          <span className="flex-1 font-display text-[17px] font-semibold uppercase tracking-[0.09em] text-text">
            Notiser
          </span>
          <button
            type="button"
            onClick={onReadAll}
            className="cursor-pointer whitespace-nowrap border-none bg-transparent p-0 text-[13px] font-semibold text-cyan"
          >
            Markera alla lästa
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng notiser"
            className="flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-line-strong bg-panel-2 text-[15px] text-[#C3CBDB] hover:border-line-hover"
          >
            ×
          </button>
        </div>

        {/* FLIKAR */}
        <div className="mx-5 mt-3.5 flex shrink-0 gap-[3px] rounded-[9px] border border-line-soft bg-panel p-[3px]">
          {(
            [
              { key: "alla" as const, label: "Alla" },
              {
                key: "olasta" as const,
                label: unread ? `Olästa (${unread})` : "Olästa",
              },
            ]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onTab(t.key)}
              aria-pressed={tab === t.key}
              className={cn(
                "flex-1 cursor-pointer rounded-[7px] border-none py-2 text-[13.5px] font-semibold",
                tab === t.key
                  ? "bg-panel-2 text-text"
                  : "bg-transparent text-muted"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* LISTA */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-3.5"
        >
          {groups.map((group) => (
            <div key={group.label} className="mb-[18px]">
              <div className="mb-[9px] text-[10.5px] uppercase tracking-[0.13em] text-[#5D6883]">
                {group.label}
              </div>
              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    now={now}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </div>
          ))}

          {!groups.length ? (
            <div className="rounded-[12px] border border-line bg-panel p-[26px] text-center text-[14.5px] leading-[1.6] text-[#8A94AB]">
              {loading ? "Laddar…" : EMPTY_TEXT[tab]}
            </div>
          ) : null}

          {groups.length && loading ? (
            <div className="py-2 text-center text-[13px] text-faint">Laddar…</div>
          ) : null}
        </div>

        {/* FOT */}
        <div className="shrink-0 border-t border-line-soft px-5 pb-[18px] pt-3.5">
          <button
            type="button"
            onClick={onSettings}
            className="w-full cursor-pointer rounded-[10px] border border-line-strong bg-panel-2 py-[11px] text-[13.5px] font-semibold text-[#C3CBDB] hover:border-line-hover"
          >
            Notisinställningar
          </button>
        </div>
      </div>
    </div>
  );
}
