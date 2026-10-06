"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { Avatar, RoiBadge } from "@/components/planket/Bits";
import { PostBetCard } from "@/components/planket/PostBetCard";
import { PostCouponCard } from "@/components/planket/PostCouponCard";
import { PostMenu } from "@/components/planket/PostMenu";
import { PostThread } from "@/components/planket/PostThread";
import { editPost, toggleReaction } from "@/lib/planket-actions";
import {
  PLANKET_MAX_BODY,
  REACTION_ICON,
  REACTION_KINDS,
  REACTION_LABEL,
  canBackPost,
  postAge,
  postBookmakerHref,
  type PlanketPost,
  type ReactionKind,
} from "@/lib/planket";
import { cn } from "@/lib/utils";

/**
 * Inläggskortet. Tre varianter delar samma huvud och samma fot:
 *   A  bara brödtext
 *   B  brödtext + spelkort
 *   C  brödtext + kupongkort
 *
 * Reaktioner uppdateras optimistiskt och rullas tillbaka om servern nekar.
 */
export function PostCard({
  post,
  onRemoved,
  onEdited,
}: {
  post: PlanketPost;
  onRemoved: (postId: string) => void;
  onEdited: (postId: string, body: string) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [saving, setSaving] = useState(false);

  const [counts, setCounts] = useState({
    fire: post.fire_count,
    thumb: post.thumb_count,
  });
  const [mine, setMine] = useState<ReactionKind[]>(post.myReactions);

  const backable = canBackPost(post);
  const isCoupon = post.attachment_type === "coupon" && post.coupon;
  // "Rygga spelet" skickar vidare till spelbolaget via vår affiliate-länk.
  const backHref = postBookmakerHref(post, "planket_rygga");
  const profileHref = `/profil/${encodeURIComponent(post.author_username)}`;

  async function react(kind: ReactionKind) {
    const on = !mine.includes(kind);

    // Optimistiskt: knappen svarar direkt, servern får komma ikapp.
    setMine((prev) => (on ? [...prev, kind] : prev.filter((k) => k !== kind)));
    setCounts((prev) => ({ ...prev, [kind]: prev[kind] + (on ? 1 : -1) }));

    const result = await toggleReaction(post.id, kind, on);
    if (!result.ok) {
      setMine((prev) => (on ? prev.filter((k) => k !== kind) : [...prev, kind]));
      setCounts((prev) => ({ ...prev, [kind]: prev[kind] + (on ? -1 : 1) }));
      toast(result.error);
    }
  }

  async function saveEdit() {
    setSaving(true);
    const result = await editPost(post.id, draft);
    setSaving(false);
    if (result.ok) {
      onEdited(post.id, draft.trim());
      setEditing(false);
    } else {
      toast(result.error);
    }
  }

  return (
    <article
      id={`inlagg-${post.id}`}
      className={cn(
        "min-w-0 rounded-[14px] border bg-[#151B2B] p-[14px] lg:px-[18px] lg:pb-[14px] lg:pt-4",
        post.isEditorial
          ? "border-[rgba(255,209,102,.45)] shadow-[0_0_0_1px_rgba(255,209,102,.12)]"
          : "border-line"
      )}
    >
      {post.isEditorial ? (
        <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-yellow">
          <span aria-hidden>★</span>
          Redaktionens spel
          {post.pinned ? (
            <span className="font-normal normal-case tracking-normal text-[#8A94AB]">
              · Fäst överst
            </span>
          ) : null}
        </div>
      ) : null}
      {/* ---------- Huvud ---------- */}
      <div className="mb-[10px] flex items-start gap-2.5 lg:mb-[11px] lg:gap-[11px]">
        {/*
          Två avatarer i stället för en med responsiva !important-klasser:
          storleken sätts som inline style, och att slå den med `lg:!w-[]`
          fungerar men går sönder tyst första gången någon rör Avatar.
        */}
        <Link href={profileHref} className="lg:hidden" aria-label={post.author_username}>
          <Avatar username={post.author_username} src={post.author_avatar} size={34} />
        </Link>
        <Link href={profileHref} className="hidden lg:block" aria-label={post.author_username}>
          <Avatar username={post.author_username} src={post.author_avatar} size={38} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-[7px] gap-y-1 lg:gap-x-[9px]">
            <Link
              href={profileHref}
              className="text-[14px] font-semibold text-text no-underline hover:underline lg:text-[14.5px]"
            >
              {post.author_username}
            </Link>
            <RoiBadge
              roi={post.sheet_roi}
              settledBets={post.sheet_settled_bets}
              compact
            />
            <span className="hidden text-[12.5px] text-[#5D6883] lg:inline">
              {postAge(post.created_at)}
              {post.edited_at ? " · redigerat" : ""}
            </span>
          </div>
          {/*
            Spelboken och antalet spel står bara på desktop — på 390 px
            trycker de ut tidsstämpeln, och boken säger mindre än tiden.
          */}
          <div className="mt-px text-[12px] text-[#5D6883] lg:mt-0.5 lg:text-[12.5px]">
            <span className="lg:hidden">
              {postAge(post.created_at)}
              {post.edited_at ? " · redigerat" : ""}
            </span>
            <span className="hidden lg:inline">
              {[
                post.sheet_name,
                post.sheet_bets_count != null
                  ? `${post.sheet_bets_count} spel`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>
        <PostMenu
          post={post}
          onEdit={() => {
            setDraft(post.body);
            setEditing(true);
          }}
          onDeleted={() => onRemoved(post.id)}
        />
      </div>

      {/* ---------- Brödtext ---------- */}
      {editing ? (
        <div className="mb-[13px]">
          <textarea
            value={draft}
            maxLength={PLANKET_MAX_BODY}
            rows={4}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full resize-y rounded-[10px] border border-line-hover bg-[#0F1420] p-3 text-[15px] leading-[1.6] text-text outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEdit()}
              className="cursor-pointer rounded-[9px] border-none bg-win px-4 py-2 text-[13.5px] font-bold text-win-ink disabled:opacity-60"
            >
              {saving ? "Sparar…" : "Spara"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="cursor-pointer rounded-[9px] border border-line-strong bg-[#1B2233] px-4 py-2 text-[13.5px] font-semibold text-[#C3CBDB]"
            >
              Avbryt
            </button>
            <span className="ml-auto font-mono-num text-[12.5px] text-[#5D6883]">
              {draft.length}/{PLANKET_MAX_BODY}
            </span>
          </div>
        </div>
      ) : post.body ? (
        <p className="mb-3 whitespace-pre-wrap text-[14.5px] leading-[1.6] text-text [text-wrap:pretty] lg:mb-[13px] lg:text-[15.5px] lg:leading-[1.65]">
          {post.body}
        </p>
      ) : null}

      {post.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image_url}
          alt=""
          className="mb-3 max-h-[420px] w-full rounded-[12px] border border-line object-contain bg-[#0F1420]"
        />
      ) : null}

      {/* ---------- Bilaga ---------- */}
      {post.attachment_type === "bet" ? <PostBetCard post={post} /> : null}
      {isCoupon ? <PostCouponCard coupon={post.coupon!} /> : null}

      {/* ---------- Fot ---------- */}
      <div className="flex items-center gap-[7px] border-t border-line-soft pt-[10px] lg:gap-2 lg:pt-[11px]">
        {REACTION_KINDS.map((kind) => {
          const active = mine.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={active}
              aria-label={REACTION_LABEL[kind]}
              onClick={() => void react(kind)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-[11px] py-[7px] text-[13px] transition-colors lg:gap-[7px] lg:px-3 lg:text-[13.5px]",
                active
                  ? "border border-[rgba(255,209,102,.4)] bg-[rgba(255,209,102,.12)] text-yellow"
                  : "border border-line-strong bg-[#1B2233] text-[#C3CBDB] hover:border-[#3A4560]"
              )}
            >
              <span aria-hidden className="text-[13px] lg:text-[14px]">
                {REACTION_ICON[kind]}
              </span>
              <span className="font-mono-num text-[12px] tabular-nums lg:text-[12.5px]">
                {counts[kind]}
              </span>
            </button>
          );
        })}

        {post.attachment_type !== "none" && backHref ? (
          backable ? (
            <a
              href={backHref}
              target="_blank"
              rel="noopener sponsored nofollow"
              className="ml-auto inline-flex items-center rounded-[9px] border border-[rgba(102,227,138,.45)] bg-[rgba(102,227,138,.14)] px-[15px] py-2 text-[13px] font-bold text-win no-underline hover:bg-[rgba(102,227,138,.22)] hover:no-underline lg:px-[17px] lg:text-[13.5px]"
            >
              Rygga spelet
            </a>
          ) : (
            <span className="ml-auto rounded-[9px] border border-line-strong bg-[#1B2233] px-[15px] py-2 text-[13px] font-bold text-[#5D6883] lg:px-[17px] lg:text-[13.5px]">
              {isSettledAttachment(post) ? "Avgjort" : "Avspark passerad"}
            </span>
          )
        ) : null}
      </div>

      <PostThread postId={post.id} initialCount={post.reply_count} />
    </article>
  );
}

function isSettledAttachment(post: PlanketPost) {
  return post.attachment_type === "bet" && !!post.bet_result && post.bet_result !== "open";
}
