"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Avatar, RoiBadge } from "@/components/planket/Bits";
import { PostBetCard } from "@/components/planket/PostBetCard";
import { PostCouponCard } from "@/components/planket/PostCouponCard";
import { PostMenu } from "@/components/planket/PostMenu";
import { editPost, toggleReaction } from "@/lib/planket-actions";
import {
  PLANKET_MAX_BODY,
  REACTION_ICON,
  REACTION_KINDS,
  REACTION_LABEL,
  canBackPost,
  postAge,
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
  onBack,
  onRemoved,
  onEdited,
}: {
  post: PlanketPost;
  onBack: (post: PlanketPost) => void;
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
  const backLabel = isCoupon ? "Rygga kupong" : "Rygga";

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
      className="rounded-[14px] border border-line bg-[#151B2B] p-[14px] lg:px-[18px] lg:pb-[14px] lg:pt-4"
    >
      {/* ---------- Huvud ---------- */}
      <div className="mb-[10px] flex items-start gap-2.5 lg:mb-[11px] lg:gap-[11px]">
        {/*
          Två avatarer i stället för en med responsiva !important-klasser:
          storleken sätts som inline style, och att slå den med `lg:!w-[]`
          fungerar men går sönder tyst första gången någon rör Avatar.
        */}
        <span className="lg:hidden">
          <Avatar username={post.author_username} size={34} />
        </span>
        <span className="hidden lg:block">
          <Avatar username={post.author_username} size={38} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-[7px] gap-y-1 lg:gap-x-[9px]">
            <span className="text-[14px] font-semibold lg:text-[14.5px]">
              {post.author_username}
            </span>
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

        {post.attachment_type !== "none" ? (
          <span className="ml-auto inline-flex items-center gap-2.5 lg:gap-[11px]">
            <span className="hidden font-mono-num text-[12.5px] text-[#5D6883] lg:inline">
              Ryggat av {post.back_count}
            </span>
            <button
              type="button"
              disabled={post.backedByMe || !backable}
              onClick={() => onBack(post)}
              className={cn(
                "rounded-[9px] px-[15px] py-2 text-[13px] font-bold lg:px-[17px] lg:text-[13.5px]",
                post.backedByMe || !backable
                  ? "cursor-not-allowed border border-line-strong bg-[#1B2233] text-[#5D6883]"
                  : "cursor-pointer border border-[rgba(102,227,138,.45)] bg-[rgba(102,227,138,.14)] text-win hover:bg-[rgba(102,227,138,.22)]"
              )}
            >
              {post.backedByMe
                ? "Ryggat"
                : backable
                  ? backLabel
                  : "Avspark passerad"}
            </button>
          </span>
        ) : null}
      </div>
    </article>
  );
}
