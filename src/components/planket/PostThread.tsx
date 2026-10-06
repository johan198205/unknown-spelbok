"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/planket/Bits";
import {
  createPostReply,
  deletePostReply,
  listPostReplies,
  type PostReplyRow,
} from "@/lib/planket-actions";
import { PLANKET_MAX_BODY, postAge } from "@/lib/planket";
import { cn } from "@/lib/utils";

/**
 * Tråd under ett inlägg. Länkar i text renderas som ren text (anti-spam).
 */
export function PostThread({
  postId,
  initialCount = 0,
}: {
  postId: string;
  /** Antal svar från servern — syns innan tråden öppnats. */
  initialCount?: number;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<PostReplyRow[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    let alive = true;
    listPostReplies(postId).then((rows) => {
      if (!alive) return;
      setReplies(rows);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [open, loaded, postId]);

  function submit() {
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      const result = await createPostReply(postId, body);
      if (!result.ok) {
        toast(result.error);
        return;
      }
      setDraft("");
      const rows = await listPostReplies(postId);
      setReplies(rows);
      setLoaded(true);
    });
  }

  async function remove(replyId: string) {
    if (!window.confirm("Ta bort din kommentar?")) return;
    setRemoving(replyId);
    const result = await deletePostReply(replyId);
    setRemoving(null);
    if (!result.ok) {
      toast(result.error);
      return;
    }
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
  }

  // Innan tråden laddats är serverns siffra den enda vi har.
  const count = loaded ? replies.length : initialCount;

  return (
    <div className="mt-3 border-t border-line-soft pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-[#8A94AB] hover:text-text"
      >
        {open
          ? "Dölj diskussion"
          : count
            ? `${count} ${count === 1 ? "kommentar" : "kommentarer"}`
            : "Svara / diskutera"}
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          {replies.map((r) => (
            <div key={r.id} className="flex gap-2.5">
              <Link
                href={`/profil/${encodeURIComponent(r.author_username)}`}
                aria-label={r.author_username}
                className="shrink-0"
              >
                <Avatar username={r.author_username} src={r.author_avatar} size={28} />
              </Link>
              <div className="min-w-0 flex-1 rounded-[10px] border border-line-soft bg-[#1B2233] px-3 py-2">
                <div className="mb-1 flex items-baseline gap-2">
                  <Link
                    href={`/profil/${encodeURIComponent(r.author_username)}`}
                    className="text-[13px] font-semibold text-text no-underline hover:underline"
                  >
                    {r.author_username}
                  </Link>
                  <span className="text-[11px] text-faint">
                    {postAge(r.created_at)}
                  </span>
                  {r.isAuthor ? (
                    <button
                      type="button"
                      disabled={removing === r.id}
                      onClick={() => void remove(r.id)}
                      className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-semibold text-[#8A94AB] hover:text-loss disabled:opacity-50"
                    >
                      {removing === r.id ? "Tar bort…" : "Ta bort"}
                    </button>
                  ) : null}
                </div>
                {/* Ren text — URL:er blir inte klickbara länkar. */}
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-text-soft [text-wrap:pretty]">
                  {r.body}
                </p>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <textarea
              value={draft}
              maxLength={PLANKET_MAX_BODY}
              rows={2}
              placeholder="Skriv ett svar… (länkar är inte klickbara)"
              onChange={(e) => setDraft(e.target.value)}
              className="min-w-0 flex-1 resize-none rounded-[10px] border border-line bg-bg-soft px-3 py-2 text-[14px] text-text outline-none focus:border-line-hover"
            />
            <button
              type="button"
              disabled={pending || !draft.trim()}
              onClick={submit}
              className={cn(
                "self-end rounded-[9px] px-4 py-2 text-[13.5px] font-bold",
                draft.trim() && !pending
                  ? "cursor-pointer bg-win text-win-ink"
                  : "cursor-not-allowed bg-[#1B2233] text-[#5D6883]"
              )}
            >
              {pending ? "…" : "Svara"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
