"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Avatar, LeagueCrest, VerifiedBadge } from "@/components/planket/Bits";
import {
  AttachPicker,
  type Attachment,
} from "@/components/planket/AttachPicker";
import { formatPick } from "@/lib/picks";
import { createPost } from "@/lib/planket-actions";
import {
  PLANKET_BODY_WARN,
  PLANKET_MAX_BODY,
  planketKickoff,
  planketKr,
  planketOdds,
} from "@/lib/planket";
import { cn } from "@/lib/utils";

/**
 * Composern.
 *
 * Ett inlägg har antingen ett spel ELLER en kupong — aldrig båda. Så fort
 * något är bifogat inaktiveras den andra knappen; databasen har samma regel
 * i constraintet posts_attachment_shape, så det går inte att komma runt.
 *
 * På mobil ligger composern kollapsad som en pill tills den trycks.
 */

/** Teckenräknarens färg. Gult är en varning, rött är taket. */
function counterColor(length: number) {
  if (length >= PLANKET_MAX_BODY) return "#E8697A";
  if (length > PLANKET_BODY_WARN) return "#FFD166";
  if (length > 0) return "#C3CBDB";
  return "#5D6883";
}

function AttachIcon({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="block shrink-0 rounded-[4px]"
      style={{ width: 14, height: 14, border: `1.5px solid ${color}` }}
    />
  );
}

export function PlanketComposer({
  username,
  onPosted,
}: {
  username: string;
  onPosted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [picker, setPicker] = useState<"bet" | "coupon" | null>(null);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Auto-växande textarea: höjden följer innehållet, ingen inre scroll.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(52, el.scrollHeight)}px`;
  }, [body, expanded]);

  const canPost = (body.trim().length > 0 || attachment != null) && !busy;

  function reset() {
    setBody("");
    setAttachment(null);
    setPicker(null);
  }

  async function submit() {
    if (!canPost) return;
    setBusy(true);

    const result = await createPost({
      body,
      attachmentType: attachment?.type ?? "none",
      betId: attachment?.type === "bet" ? attachment.bet.id : null,
      couponId: attachment?.type === "coupon" ? attachment.coupon.id : null,
    });

    setBusy(false);

    if (!result.ok) {
      toast(result.error);
      return;
    }

    reset();
    setExpanded(false);
    onPosted();
  }

  // ---------- Kollapsad pill (mobil) ----------
  if (!expanded) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            window.setTimeout(() => areaRef.current?.focus(), 0);
          }}
          className="flex w-full cursor-pointer items-center gap-[11px] rounded-full border border-line bg-[#151B2B] px-[15px] py-[11px] text-left lg:hidden"
        >
          <Avatar username={username} size={28} />
          <span className="min-w-0 flex-1 truncate text-[14.5px] text-[#5D6883]">
            Skriv till Planket…
          </span>
          <span
            aria-hidden
            className="block shrink-0 rounded-[5px] border-[1.5px] border-[#5D6883]"
            style={{ width: 16, height: 16 }}
          />
        </button>
        <div className="hidden lg:block">
          <ComposerCard
            username={username}
            body={body}
            setBody={setBody}
            attachment={attachment}
            setAttachment={setAttachment}
            picker={picker}
            setPicker={setPicker}
            focused={focused}
            setFocused={setFocused}
            areaRef={areaRef}
            busy={busy}
            canPost={canPost}
            onSubmit={submit}
          />
        </div>
      </>
    );
  }

  return (
    <ComposerCard
      username={username}
      body={body}
      setBody={setBody}
      attachment={attachment}
      setAttachment={setAttachment}
      picker={picker}
      setPicker={setPicker}
      focused={focused}
      setFocused={setFocused}
      areaRef={areaRef}
      busy={busy}
      canPost={canPost}
      onSubmit={submit}
    />
  );
}

function ComposerCard({
  username,
  body,
  setBody,
  attachment,
  setAttachment,
  picker,
  setPicker,
  focused,
  setFocused,
  areaRef,
  busy,
  canPost,
  onSubmit,
}: {
  username: string;
  body: string;
  setBody: (value: string) => void;
  attachment: Attachment | null;
  setAttachment: (value: Attachment | null) => void;
  picker: "bet" | "coupon" | null;
  setPicker: (value: "bet" | "coupon" | null) => void;
  focused: boolean;
  setFocused: (value: boolean) => void;
  areaRef: React.RefObject<HTMLTextAreaElement | null>;
  busy: boolean;
  canPost: boolean;
  onSubmit: () => void;
}) {
  const hasBet = attachment?.type === "bet";
  const hasCoupon = attachment?.type === "coupon";

  return (
    <div
      className="rounded-[14px] bg-[#151B2B] p-4"
      style={{ border: `1px solid ${focused ? "#3A4560" : "#232B3E"}` }}
    >
      <div className="flex gap-3">
        <Avatar username={username} size={40} className="!text-base" />

        <div className="min-w-0 flex-1">
          <textarea
            ref={areaRef}
            value={body}
            maxLength={PLANKET_MAX_BODY}
            placeholder="Skriv något till Planket…"
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={1}
            className="block w-full resize-none overflow-hidden border-none bg-transparent pt-2 text-[15.5px] leading-[1.5] text-text outline-none"
            style={{ minHeight: 52 }}
          />

          {attachment ? (
            <AttachmentPreview
              attachment={attachment}
              onRemove={() => setAttachment(null)}
            />
          ) : null}

          {picker ? (
            <AttachPicker
              mode={picker}
              onClose={() => setPicker(null)}
              onPick={(next) => {
                setAttachment(next);
                setPicker(null);
              }}
            />
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-[9px] border-t border-line-soft pt-[13px]">
            <AttachButton
              label={hasBet ? "Spel bifogat" : "Bifoga spel"}
              active={hasBet}
              disabled={hasCoupon}
              onClick={() => setPicker(picker === "bet" ? null : "bet")}
            />
            <AttachButton
              label={hasCoupon ? "Kupong bifogad" : "Bifoga kupong"}
              active={hasCoupon}
              disabled={hasBet}
              onClick={() => setPicker(picker === "coupon" ? null : "coupon")}
            />

            <span
              className="ml-auto font-mono-num text-[12.5px] tabular-nums"
              style={{ color: counterColor(body.length) }}
            >
              {body.length}/{PLANKET_MAX_BODY}
            </span>

            <button
              type="button"
              disabled={!canPost}
              onClick={onSubmit}
              className={cn(
                "rounded-[9px] px-5 py-2.5 text-[14px] font-bold",
                canPost
                  ? "cursor-pointer border border-win bg-win text-win-ink hover:brightness-105"
                  : "cursor-not-allowed border border-line-strong bg-[#1B2233] text-[#5D6883]"
              )}
            >
              {busy ? "Postar…" : "Posta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-[9px] border px-[13px] py-[9px] text-[13.5px] font-semibold",
        active
          ? "cursor-pointer border-[rgba(102,227,138,.4)] bg-[rgba(102,227,138,.12)] text-win"
          : disabled
            ? "cursor-not-allowed border-line-strong bg-[#1B2233] text-[#5D6883] opacity-60"
            : "cursor-pointer border-line-strong bg-[#1B2233] text-[#C3CBDB] hover:border-[#3A4560] hover:text-text"
      )}
    >
      <AttachIcon color={active ? "#66E38A" : disabled ? "#5D6883" : "#8A94AB"} />
      {label}
    </button>
  );
}

/**
 * Förhandskortet. 28 px höger-padding på innehållet så texten aldrig
 * hamnar under ×-knappen.
 */
function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const isBet = attachment.type === "bet";

  return (
    <div className="relative mt-3 rounded-[11px] border border-line-strong bg-[#1B2233] px-[14px] py-3">
      <button
        type="button"
        title="Ta bort bilagan"
        aria-label="Ta bort bilagan"
        onClick={onRemove}
        className="absolute right-[9px] top-[9px] flex h-6 w-6 cursor-pointer items-center justify-center rounded-[7px] border border-line-strong bg-[#0F1420] text-[14px] leading-none text-[#8A94AB] hover:border-[#3A4560] hover:text-text"
      >
        ×
      </button>

      {isBet ? (
        <BetPreview bet={attachment.bet} />
      ) : (
        <CouponPreview coupon={attachment.coupon} />
      )}
    </div>
  );
}

function BetPreview({
  bet,
}: {
  bet: Extract<Attachment, { type: "bet" }>["bet"];
}) {
  // bet.verified kommer från servern (fetchAttachableBets), aldrig från en
  // klocka här inne. Det slutgiltiga svaret sätts ändå av triggern på
  // bets.logged_before_kickoff — det här är bara förhandsvisningen av det.
  const verified = bet.verified;

  return (
    <>
      <div className="mb-[9px] flex items-center gap-[9px] pr-7">
        <LeagueCrest
          logo={bet.league_logo}
          leagueId={bet.league_id}
          sport={bet.sport}
          name={bet.league}
          size={20}
        />
        <span className="min-w-0 truncate text-[12.5px] text-[#8A94AB]">
          {bet.league || "—"}
        </span>
        {bet.kickoff ? (
          <span className="shrink-0 font-mono-num text-[12.5px] text-[#5D6883]">
            {planketKickoff(bet.kickoff)}
          </span>
        ) : null}
        {verified ? <VerifiedBadge /> : null}
      </div>

      <div className="flex items-center gap-3.5 pr-7">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px]">{bet.match}</div>
          <div className="mt-0.5 truncate text-[13.5px] font-bold">
            {formatPick(bet.pick)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono-num text-[19px] font-semibold tabular-nums">
            {planketOdds(bet.odds)}
          </div>
          <div className="font-mono-num text-[12px] text-[#5D6883]">
            {planketKr(bet.stake)}
          </div>
        </div>
      </div>

      {bet.sheet_private ? (
        <div className="mt-2 pr-7 text-[11.5px] leading-[1.5] text-yellow">
          Spelet blir synligt på Planket. Resten av {bet.sheet_name} förblir
          privat.
        </div>
      ) : null}
    </>
  );
}

function CouponPreview({
  coupon,
}: {
  coupon: Extract<Attachment, { type: "coupon" }>["coupon"];
}) {
  return (
    <>
      <div className="mb-[9px] flex items-center gap-[9px] pr-7">
        <span className="shrink-0 font-display text-[12.5px] font-semibold uppercase tracking-[0.11em] text-yellow">
          Kupong
        </span>
        <span className="min-w-0 truncate font-mono-num text-[12.5px] text-[#5D6883]">
          {coupon.legs} spel · {coupon.legs > 1 ? "Kombination" : "Enkel"}
        </span>
      </div>
      <div className="flex items-center gap-3.5 pr-7">
        <div className="min-w-0 flex-1 truncate text-[14.5px]">
          {coupon.title}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono-num text-[19px] font-semibold tabular-nums">
            {planketOdds(coupon.total_odds)}
          </div>
          <div className="font-mono-num text-[12px] text-[#5D6883]">
            {planketKr(coupon.stake)}
          </div>
        </div>
      </div>
    </>
  );
}
