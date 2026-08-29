"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BackSheet } from "@/components/planket/BackSheet";
import { PlanketComposer } from "@/components/planket/PlanketComposer";
import { PostCard } from "@/components/planket/PostCard";
import {
  checkNewPosts,
  loadMorePosts,
  refreshFeed,
} from "@/lib/planket-actions";
import {
  PLANKET_FILTERS,
  type PlanketFilter,
  type PlanketPost,
} from "@/lib/planket";
import type { Sheet } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Så ofta flödet frågar efter nya inlägg. */
const POLL_MS = 45_000;

export function PlanketFeed({
  initialPosts,
  initialCursor,
  initialHasMore,
  username,
  sheets,
  isAuthenticated,
  footer,
}: {
  initialPosts: PlanketPost[];
  initialCursor: string | null;
  initialHasMore: boolean;
  username: string | null;
  sheets: Sheet[];
  isAuthenticated: boolean;
  /** Ansvarsrutan på mobil — ligger sist i flödet, inte i en sidokolumn. */
  footer?: React.ReactNode;
}) {
  const [filter, setFilter] = useState<PlanketFilter>("alla");
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [backing, setBacking] = useState<PlanketPost | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // Tidsstämpeln vi jämför mot när vi frågar efter nya inlägg. Sätts om
  // vid varje hämtning så bannern aldrig räknar samma inlägg två gånger.
  const seenSince = useRef(
    initialPosts[0]?.created_at ?? new Date().toISOString()
  );

  const replaceFeed = useCallback(
    (
      next: { posts: PlanketPost[]; nextCursor: string | null; hasMore: boolean },
      since?: string
    ) => {
      setPosts(next.posts);
      setCursor(next.nextCursor);
      setHasMore(next.hasMore);
      setNewCount(0);
      seenSince.current =
        since ?? next.posts[0]?.created_at ?? new Date().toISOString();
    },
    []
  );

  // ---------- Filterbyte ----------
  async function pickFilter(next: PlanketFilter) {
    if (next === filter) return;
    setFilter(next);
    setLoading(true);
    const page = await refreshFeed(next);
    setLoading(false);
    replaceFeed(page);
  }

  // ---------- Polling för bannern ----------
  useEffect(() => {
    const id = window.setInterval(async () => {
      if (document.hidden) return;
      const count = await checkNewPosts(filter, seenSince.current);
      setNewCount(count);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [filter]);

  async function showNewPosts() {
    setLoading(true);
    const page = await refreshFeed(filter);
    setLoading(false);
    replaceFeed(page);
    // scrollTop, aldrig scrollIntoView: scrollIntoView flyttar närmaste
    // scrollbara förälder och kan lämna sidhuvudet halvt utanför bild.
    const root = document.scrollingElement ?? document.documentElement;
    root.scrollTop = 0;
  }

  // ---------- Oändlig scroll ----------
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !cursor) return;
    setLoading(true);
    const page = await loadMorePosts(filter, cursor);
    setLoading(false);
    setPosts((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...page.posts.filter((p) => !seen.has(p.id))];
    });
    setCursor(page.nextCursor);
    setHasMore(page.hasMore);
  }, [cursor, filter, hasMore, loading]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  // ---------- Efter ett eget inlägg ----------
  async function afterPost() {
    const page = await refreshFeed(filter);
    replaceFeed(page);
  }

  function onBackClick(post: PlanketPost) {
    if (!isAuthenticated) return;
    setBacking(post);
  }

  return (
    <>
      <div className="flex flex-col gap-3 lg:gap-[14px]">
        {isAuthenticated && username ? (
          <PlanketComposer username={username} onPosted={() => void afterPost()} />
        ) : (
          <div className="rounded-[14px] border border-line bg-[#151B2B] p-4 text-[14.5px] text-[#C3CBDB]">
            <Link href="/registrera" className="font-semibold text-win">
              Skapa ett konto
            </Link>{" "}
            för att posta och rygga på Planket.
          </div>
        )}

        {/* Bannern renderas bara när det faktiskt finns nya inlägg. */}
        {newCount > 0 ? (
          <button
            type="button"
            onClick={() => void showNewPosts()}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border border-[rgba(53,214,245,.3)] bg-[rgba(53,214,245,.07)] px-3.5 py-2.5 text-left"
          >
            <span
              aria-hidden
              // animate-pulse, inte animate-sbpulse: den senare skalar upp
              // punkten 1,5×, och en 7 px-punkt som växer läser som en
              // live-indikator. Här ska bara opaciteten andas.
              className="block h-[7px] w-[7px] shrink-0 animate-pulse rounded-full bg-cyan"
            />
            <span className="min-w-0 flex-1 text-[13.5px] text-[#C3CBDB]">
              {newCount} {newCount === 1 ? "nytt inlägg" : "nya inlägg"}
            </span>
            <span className="shrink-0 text-[13.5px] font-semibold text-cyan">
              Visa
            </span>
          </button>
        ) : null}

        {/*
          Chipparna scrollar vågrätt på mobil. flex-none på varje chip och
          gömd scrollbar — utan flex-none krymper de i stället för att rada
          upp sig, och raden bryter.
        */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sb-scroll lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
          {PLANKET_FILTERS.map((chip) => {
            const active = chip.key === filter;
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={active}
                onClick={() => void pickFilter(chip.key)}
                className={cn(
                  "flex-none cursor-pointer whitespace-nowrap rounded-full border px-[15px] py-2 text-[13.5px] font-semibold",
                  active
                    ? "border-[rgba(102,227,138,.45)] bg-[rgba(102,227,138,.14)] text-win"
                    : "border-line-strong bg-transparent text-[#C3CBDB] hover:border-[#3A4560]"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {posts.length === 0 && !loading ? (
          <div className="rounded-[14px] border border-line bg-[#151B2B] px-5 py-10 text-center text-[14px] text-muted">
            Inget här ännu. Posta först.
          </div>
        ) : null}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onBack={onBackClick}
            onRemoved={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
            onEdited={(id, body) =>
              setPosts((prev) =>
                prev.map((p) =>
                  p.id === id
                    ? { ...p, body, edited_at: new Date().toISOString() }
                    : p
                )
              )
            }
          />
        ))}

        <div ref={sentinelRef} aria-hidden className="h-px" />

        {loading ? (
          <div className="py-4 text-center text-[13px] text-[#5D6883]">
            Hämtar…
          </div>
        ) : null}

        {footer}
      </div>

      {backing ? (
        <BackSheet
          post={backing}
          sheets={sheets}
          onClose={() => setBacking(null)}
          onBacked={(id) =>
            setPosts((prev) =>
              prev.map((p) =>
                p.id === id
                  ? { ...p, backedByMe: true, back_count: p.back_count + 1 }
                  : p
              )
            )
          }
        />
      ) : null}
    </>
  );
}
