"use client";

import { useEffect, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/planket/Bits";
import {
  createPostReply,
  listPostReplies,
  type PostReplyRow,
} from "@/lib/planket-actions";
import { PLANKET_MAX_BODY, postAge } from "@/lib/planket";
import { cn } from "@/lib/utils";

/**
 * Tråd under ett inlägg. Länkar i text renderas som ren text (anti-spam).
 */
export function PostThread({ postId }: { postId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<PostReplyRow[]>([]);
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

  return (
    <div className="mt-3 border-t border-line-soft pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-[#8A94AB] hover:text-text"
      >
        {open
          ? "Dölj diskussion"
          : replies.length
            ? `Visa diskussion (${replies.length})`
            : "Svara / diskutera"}
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          {replies.map((r) => (
            <div key={r.id} className="flex gap-2.5">
              <Avatar username={r.author_username} size={28} />
              <div className="min-w-0 flex-1 rounded-[10px] border border-line-soft bg-[#1B2233] px-3 py-2">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold">
                    {r.author_username}
                  </span>
                  <span className="text-[11px] text-faint">
                    {postAge(r.created_at)}
                  </span>
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
