"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  NotificationPanel,
  type NotificationTab,
} from "@/components/notifications/NotificationPanel";
import {
  bellIcon,
  isNotificationType,
  NOTIFICATION_COLUMNS,
  NOTIFICATION_PAGE_SIZE,
  notificationHref,
  type AppNotification,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function rowToNotification(row: Record<string, unknown>): AppNotification | null {
  if (typeof row.id !== "string" || !isNotificationType(row.type)) return null;
  return {
    id: row.id,
    user_id: String(row.user_id ?? ""),
    type: row.type,
    title: typeof row.title === "string" ? row.title : "",
    body: typeof row.body === "string" ? row.body : "",
    created_at:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString(),
    read_at: typeof row.read_at === "string" ? row.read_at : null,
    amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
    amount_kind:
      row.amount_kind === "netto" || row.amount_kind === "roi"
        ? row.amount_kind
        : null,
    target_type:
      row.target_type === "sheet" ||
      row.target_type === "comp" ||
      row.target_type === "coupon" ||
      row.target_type === "bet"
        ? row.target_type
        : null,
    target_id: typeof row.target_id === "string" ? row.target_id : null,
    href: typeof row.href === "string" ? row.href : null,
    dedupe_key: typeof row.dedupe_key === "string" ? row.dedupe_key : "",
  };
}

export function NotificationBell({
  userId,
  initialUnread,
  badgeBorder = "#0B0E14",
  className,
}: {
  userId: string;
  initialUnread: number;
  /**
   * Pillen har 2px ram i sidans bakgrundsfärg så siffran läser mot
   * headern. Mobilheadern ligger på en annan ton än desktop.
   */
  badgeBorder?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [serverUnread, setServerUnread] = useState(initialUnread);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [tab, setTab] = useState<NotificationTab>("alla");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadedOnce = useRef(false);

  /*
    Klockan sitter i layouten och monteras aldrig om vid navigering, men
    servern skickar en färsk siffra varje gång. Den vinner — realtime kan
    ha missat en rad medan fliken låg i bakgrunden.

    Justeringen görs under render, inte i en effekt: en effekt hade gett
    en extra renderomgång där räknaren visade fel siffra först.
  */
  if (serverUnread !== initialUnread) {
    setServerUnread(initialUnread);
    setUnread(initialUnread);
  }

  const loadPage = useCallback(
    async (offset: number) => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("notifications")
          .select(NOTIFICATION_COLUMNS)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(offset, offset + NOTIFICATION_PAGE_SIZE - 1);

        if (error) throw error;
        const rows = ((data ?? []) as Record<string, unknown>[])
          .map(rowToNotification)
          .filter((n): n is AppNotification => n !== null);

        setHasMore(rows.length === NOTIFICATION_PAGE_SIZE);
        setItems((prev) => {
          if (offset === 0) return rows;
          const seen = new Set(prev.map((n) => n.id));
          return [...prev, ...rows.filter((n) => !seen.has(n.id))];
        });
      } catch (err) {
        console.error("notiser: kunde inte hämta", err);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  // Listan hämtas först när panelen öppnas — headern ska bara kosta en
  // count-fråga på varje sidladdning.
  useEffect(() => {
    if (!open || loadedOnce.current) return;
    loadedOnce.current = true;
    void loadPage(0);
  }, [open, loadPage]);

  /*
    Realtime på egna rader. Räknaren ska uppdateras utan omladdning, både
    när panelen är öppen och när den är stängd. read_at-ändringar kommer
    in som UPDATE — replica identity full ger oss gamla raden också, så
    deltat blir exakt i stället för ett omräknande count-anrop.
  */
  useEffect(() => {
    const supabase = createClient();
    const filter = `user_id=eq.${userId}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      void supabase.realtime.setAuth();
      channel = supabase
        .channel(`notif:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter },
          (payload) => {
            const row = rowToNotification(
              (payload.new ?? {}) as Record<string, unknown>
            );
            if (!row) return;
            if (!row.read_at) setUnread((n) => n + 1);
            setItems((prev) =>
              prev.some((n) => n.id === row.id) ? prev : [row, ...prev]
            );
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter },
          (payload) => {
            const row = rowToNotification(
              (payload.new ?? {}) as Record<string, unknown>
            );
            if (!row) return;
            const wasUnread =
              (payload.old as { read_at?: string | null } | undefined)
                ?.read_at == null;
            if (wasUnread && row.read_at) setUnread((n) => Math.max(0, n - 1));
            if (!wasUnread && !row.read_at) setUnread((n) => n + 1);
            setItems((prev) =>
              prev.map((n) => (n.id === row.id ? row : n))
            );
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "notifications", filter },
          (payload) => {
            const old = (payload.old ?? {}) as {
              id?: string;
              read_at?: string | null;
            };
            if (!old.id) return;
            if (old.read_at == null) setUnread((n) => Math.max(0, n - 1));
            setItems((prev) => prev.filter((n) => n.id !== old.id));
          }
        )
        .subscribe();
    } catch {
      /* Realtime saknas — serverns siffra vid navigering får räcka. */
    }

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId]);

  /** Optimistisk läsmarkering. Rullas tillbaka om servern nekar. */
  const markRead = useCallback(
    async (item: AppNotification) => {
      if (item.read_at) return;
      const stamp = new Date().toISOString();
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read_at: stamp } : n))
      );
      setUnread((n) => Math.max(0, n - 1));

      const supabase = createClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: stamp })
        .eq("id", item.id)
        .is("read_at", null);

      if (error) {
        console.error("notiser: kunde inte markera läst", error.message);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read_at: null } : n))
        );
        setUnread((n) => n + 1);
      }
    },
    []
  );

  const readAll = useCallback(async () => {
    const stamp = new Date().toISOString();
    const previous = items;
    const previousUnread = unread;
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: stamp }))
    );
    setUnread(0);

    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: stamp })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      console.error("notiser: kunde inte markera alla lästa", error.message);
      setItems(previous);
      setUnread(previousUnread);
    }
  }, [items, unread, userId]);

  /* Läst FÖRST, sedan stäng, sedan navigera — i den ordningen. */
  const openItem = useCallback(
    (item: AppNotification) => {
      void markRead(item);
      setOpen(false);
      const href = notificationHref(item);
      if (!href) return;
      // Popup-notiser kan peka på en extern landningssida. router.push()
      // skulle försöka rendera den som en route i appen och fastna.
      if (/^https?:\/\//i.test(href)) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      router.push(href);
    },
    [markRead, router]
  );

  const openSettings = useCallback(() => {
    setOpen(false);
    router.push("/installningar#notiser");
  }, [router]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setTab("alla");
        }}
        title="Notiser"
        aria-label={
          unread ? `Notiser, ${unread} olästa` : "Notiser"
        }
        aria-expanded={open}
        className={cn(
          "relative size-9 shrink-0 cursor-pointer rounded-[10px] border p-0 hover:border-line-hover",
          open
            ? "border-line-hover bg-panel-2"
            : "border-line-strong bg-transparent",
          className
        )}
      >
        <span
          aria-hidden
          className="absolute inset-0 bg-center bg-no-repeat"
          style={{ backgroundImage: bellIcon(open), backgroundSize: "19px 19px" }}
        />
        {unread > 0 ? (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-[5px] font-mono-num text-[11px] font-semibold leading-[15px] text-white"
            style={{
              background: "#FF5C6C",
              border: `2px solid ${badgeBorder}`,
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {/*
        Portal till <body>: headern har backdrop-blur, och ett element med
        backdrop-filter blir containing block för position:fixed-barn. Utan
        portalen mäter panelen mot headerns ~57px höga box i stället för mot
        viewporten — backdropen dimmar ingenting, bakgrunden målar bara
        översta remsan och listan kollapsar så inga notiser syns.
      */}
      {open && typeof document !== "undefined"
        ? createPortal(
            <NotificationPanel
              items={items}
              unread={unread}
              tab={tab}
              loading={loading}
              hasMore={hasMore}
              onTab={setTab}
              onClose={() => setOpen(false)}
              onReadAll={() => void readAll()}
              onOpen={openItem}
              onLoadMore={() => void loadPage(items.length)}
              onSettings={openSettings}
            />,
            document.body
          )
        : null}
    </>
  );
}
