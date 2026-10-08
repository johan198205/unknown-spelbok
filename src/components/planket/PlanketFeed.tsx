"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PlanketComposer } from "@/components/planket/PlanketComposer";
import { PostCard } from "@/components/planket/PostCard";
import {
  checkNewPosts,
  loadMorePosts,
  refreshFeed,
} from "@/lib/planket-actions";
import type { PlanketFilter, PlanketPost } from "@/lib/planket";
import type { Bookmaker, Sheet } from "@/lib/types";
import { useIsDesktop } from "@/lib/hooks/useIsDesktop";

/** Så ofta flödet frågar efter nya inlägg. */
const POLL_MS = 45_000;

export function PlanketFeed({
  initialPosts,
  initialCursor,
  initialHasMore,
  username,
  avatarUrl = null,
  sheets,
  bookmakers,
  isAuthenticated,
}: {
  initialPosts: PlanketPost[];
  initialCursor: string | null;
  initialHasMore: boolean;
  username: string | null;
  avatarUrl?: string | null;
  sheets: Sheet[];
  bookmakers: Bookmaker[];
  isAuthenticated: boolean;
}) {
  // Ett enda flöde — filterchipparna är borttagna.
  const filter: PlanketFilter = "alla";
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);

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

  const isDesktop = useIsDesktop();

  function renderPost(post: PlanketPost) {
    return (
      <PostCard
        key={post.id}
        post={post}
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
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 lg:gap-[14px]">
        {isAuthenticated && username ? (
          <PlanketComposer
            username={username}
            avatarUrl={avatarUrl}
            sheets={sheets}
            bookmakers={bookmakers}
            onPosted={() => void afterPost()}
          />
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

        {posts.length === 0 && !loading ? (
          <div className="rounded-[14px] border border-line bg-[#151B2B] px-5 py-10 text-center text-[14px] text-muted">
            Inget här ännu. Posta först.
          </div>
        ) : null}

        {/*
          Två spalter i murverk från lg: varannan post i varje spalt, så att
          korten staplas tätt utan att ett högt kort lämnar hål bredvid sig.
          Läsordningen blir fortfarande vänster–höger, nyast överst, och
          ett kort byter aldrig spalt när en tråd öppnas eller fler laddas.
          Skrivrutan ovanför tar hela bredden.
        */}
        {isDesktop ? (
          <div className="flex items-start gap-[14px]">
            {[0, 1].map((col) => (
              <div key={col} className="flex min-w-0 flex-1 flex-col gap-[14px]">
                {posts
                  .filter((_, i) => i % 2 === col)
                  .map(renderPost)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">{posts.map(renderPost)}</div>
        )}

        <div ref={sentinelRef} aria-hidden className="h-px" />

        {loading ? (
          <div className="py-4 text-center text-[13px] text-[#5D6883]">
            Hämtar…
          </div>
        ) : null}

      </div>
    </>
  );
}
