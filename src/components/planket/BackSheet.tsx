"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  BookmakerPlate,
  FieldLabel,
  LeagueCrest,
} from "@/components/planket/Bits";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import { formatPick } from "@/lib/picks";
import { backPost } from "@/lib/planket-actions";
import {
  canBackPost,
  couponMeta,
  planketKickoff,
  planketKr,
  planketOdds,
  stakePresets,
  type PlanketPost,
} from "@/lib/planket";
import type { Sheet } from "@/lib/types";
import { cn } from "@/lib/utils";

const LAST_SHEET_KEY = "spelbok:last-sheet-id";

function readLastSheetId() {
  try {
    return localStorage.getItem(LAST_SHEET_KEY);
  } catch {
    return null;
  }
}

function writeLastSheetId(id: string) {
  try {
    localStorage.setItem(LAST_SHEET_KEY, id);
  } catch {
    /* ignore */
  }
}

/**
 * Rygga-bekräftelsen. Modal på desktop, ark som glider upp på mobil.
 *
 * Räknerаden räknas om live medan man skriver: insats × (odds − 1) för
 * möjlig vinst, −insats för risk. Ingenting av det sparas — servern räknar
 * om allt vid bokföringen.
 *
 * Backdropen stänger bara vid klick på sig själv (e.target === e.currentTarget),
 * aldrig vid klick inne i innehållet. Escape stänger också.
 */
export function BackSheet({
  post,
  sheets,
  onClose,
  onBacked,
}: {
  post: PlanketPost;
  sheets: Sheet[];
  onClose: () => void;
  onBacked: (postId: string) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const isCoupon = post.attachment_type === "coupon" && post.coupon;
  const original = Math.round(
    Number(isCoupon ? post.coupon!.stake : (post.bet_stake ?? 0))
  );
  const odds = Number(isCoupon ? post.coupon!.total_odds : (post.bet_odds ?? 0));

  const [sheetId, setSheetId] = useState(() => {
    if (sheets.length === 1) return sheets[0]!.id;
    const last = readLastSheetId();
    if (last && sheets.some((s) => s.id === last)) return last;
    return sheets[0]?.id ?? "";
  });
  const [stake, setStake] = useState(String(original || 100));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const amount = Number(stake.replace(",", ".")) || 0;
  const presets = useMemo(() => stakePresets(original || 100), [original]);
  const win = Math.round(amount * (odds - 1));
  const sheetName =
    sheets.find((s) => s.id === sheetId)?.name ?? "Ingen spelbok ännu";

  const startable = canBackPost(post);
  const canSubmit = startable && amount > 0 && !!sheetId && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);

    const result = await backPost({ postId: post.id, sheetId, stake: amount });

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    writeLastSheetId(result.sheetId);
    onBacked(post.id);
    onClose();
    toast(`Spelet är bokfört i ${result.sheetName}.`, {
      label: "Visa spelbok",
      href: `/spelbok?sheet=${result.sheetId}`,
    });
    router.refresh();
  }

  return (
    <div
      // Klick stänger BARA när det landar på backdropen själv. Ett klick
      // inne i modalen bubblar hit och skulle annars stänga den.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(5,7,12,.7)] sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isCoupon ? "Rygga kupong" : "Rygga spel"}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-[20px] border border-line-strong bg-[#151B2B] pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_30px_70px_rgba(0,0,0,.55)] sm:max-w-[460px] sm:rounded-[16px] sm:pb-0"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-[17px]">
          <h2 className="font-display text-[19px] font-semibold uppercase tracking-[0.07em]">
            {isCoupon ? "Rygga kupong" : "Rygga spel"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg border border-line-strong bg-[#1B2233] text-[15px] leading-none text-[#8A94AB] hover:text-text"
          >
            ×
          </button>
        </div>

        <div className="px-5 pb-5 pt-[18px]">
          {/* ---------- Sammanfattning ---------- */}
          <div className="mb-4 rounded-[12px] border border-line bg-[#1B2233] p-3.5">
            {isCoupon ? (
              <CouponSummary post={post} />
            ) : (
              <BetSummary post={post} />
            )}

            <div className="mt-3 flex items-center gap-2.5 border-t border-line pt-[11px]">
              <BookmakerPlate
                name={
                  isCoupon
                    ? post.coupon!.bookmaker_name
                    : post.bet_bookmaker_name
                }
                logoUrl={getBookmakerLogoUrl(
                  isCoupon
                    ? post.coupon!.bookmaker_logo
                    : post.bet_bookmaker_logo
                )}
                width={70}
                height={28}
              />
              <span className="ml-auto font-mono-num text-[12.5px] text-[#5D6883]">
                Ryggat av {post.back_count}
              </span>
            </div>
          </div>

          {/* ---------- Insats ---------- */}
          <div className="mb-3.5">
            <FieldLabel className="text-[10.5px] text-[#8A94AB]">
              Min insats
            </FieldLabel>
            <div className="flex items-center gap-[9px]">
              <label className="flex flex-1 items-center rounded-[11px] border border-[#3A4560] bg-[#0F1420] px-[15px] py-[13px]">
                <span className="sr-only">Insats i kronor</span>
                <input
                  inputMode="decimal"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="w-full min-w-0 border-none bg-transparent font-mono-num text-[19px] font-semibold tabular-nums text-text outline-none"
                />
                <span className="shrink-0 font-mono-num text-[14px] text-[#5D6883]">
                  kr
                </span>
              </label>
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setStake(String(preset))}
                  className="shrink-0 cursor-pointer rounded-[10px] border border-line-strong bg-[#1B2233] px-3 py-3 font-mono-num text-[13px] font-semibold text-[#C3CBDB] hover:border-[#3A4560] hover:text-text"
                >
                  {preset.toLocaleString("sv-SE")}
                </button>
              ))}
            </div>
            <p className="mt-[7px] text-[12px] text-[#5D6883]">
              Förifyllt med originalinsatsen.
            </p>
          </div>

          {/* ---------- Räknerad ---------- */}
          <div className="mb-4 flex rounded-[11px] border border-line bg-[#0F1420]">
            <div className="min-w-0 flex-1 px-3.5 py-3">
              <FieldLabel>Möjlig vinst</FieldLabel>
              <div className="truncate font-mono-num text-[18px] font-semibold tabular-nums text-win">
                {planketKr(win, { sign: true })}
              </div>
            </div>
            <div className="min-w-0 flex-1 border-l border-line px-3.5 py-3">
              <FieldLabel>Risk</FieldLabel>
              <div className="truncate font-mono-num text-[18px] font-semibold tabular-nums text-[#E8697A]">
                {planketKr(-amount, { sign: true })}
              </div>
            </div>
            <div className="min-w-0 flex-1 border-l border-line px-3.5 py-3">
              <FieldLabel>Spelbok</FieldLabel>
              {sheets.length > 1 ? (
                <select
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  aria-label="Välj spelbok"
                  // truncate: ett långt spelboksnamn skulle annars löpa in
                  // under den inbyggda pilen i <select>.
                  className="mt-0.5 w-full cursor-pointer truncate border-none bg-transparent pr-1 text-[13.5px] font-semibold text-text outline-none"
                >
                  {sheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-0.5 truncate text-[14px] font-semibold">
                  {sheetName}
                </div>
              )}
            </div>
          </div>

          {error ? (
            <p className="mb-3 text-[13px] font-medium text-loss">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submit()}
            className={cn(
              "w-full rounded-[11px] border-none px-4 py-[15px] text-[15.5px] font-bold",
              canSubmit
                ? "cursor-pointer bg-win text-win-ink hover:brightness-105"
                : "cursor-not-allowed bg-[#1B2233] text-[#5D6883]"
            )}
          >
            {!startable
              ? "Avspark passerad"
              : busy
                ? "Lägger till…"
                : "Lägg i min spelbok"}
          </button>

          <p className="mt-[11px] text-[12.5px] leading-[1.55] text-[#8A94AB] [text-wrap:pretty]">
            Spelet loggas med hänvisning till{" "}
            <span className="font-semibold text-[#C3CBDB]">
              @{post.author_username}
            </span>
            . Oddset kan skilja sig hos ditt spelbolag — kontrollera innan du
            lägger spelet.
          </p>
        </div>
      </div>
    </div>
  );
}

function BetSummary({ post }: { post: PlanketPost }) {
  return (
    <>
      <div className="mb-[11px] flex items-center gap-[9px]">
        <LeagueCrest
          logo={post.bet_league_logo}
          leagueId={post.bet_league_id}
          sport={post.bet_sport}
          name={post.bet_league}
          size={20}
        />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#8A94AB]">
          {post.bet_league || "—"}
        </span>
        <span className="shrink-0 font-mono-num text-[12.5px] text-[#8A94AB]">
          {planketKickoff(post.kickoff)}
        </span>
      </div>
      <div className="flex items-center gap-3.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15.5px]">{post.bet_match}</div>
          <div className="mt-[3px] truncate text-[14px] font-bold">
            {formatPick(post.bet_pick)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <FieldLabel className="mb-0.5">Odds</FieldLabel>
          <div className="font-mono-num text-[26px] font-semibold leading-none tabular-nums">
            {planketOdds(post.bet_odds)}
          </div>
        </div>
      </div>
    </>
  );
}

function CouponSummary({ post }: { post: PlanketPost }) {
  const coupon = post.coupon!;
  return (
    <>
      <div className="mb-[11px] flex items-center gap-[9px]">
        <span className="shrink-0 font-display text-[12.5px] font-semibold uppercase tracking-[0.11em] text-yellow">
          Kupong
        </span>
        <span className="min-w-0 flex-1 truncate font-mono-num text-[12.5px] text-[#5D6883]">
          {couponMeta(coupon.legs)}
        </span>
      </div>
      <div className="flex items-center gap-3.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15.5px]">{coupon.title}</div>
          {/*
            Kupongen bokförs som ETT spel med produktodds, inte ett per
            ben. Raden här säger det rakt ut så ingen tror att fyra rader
            hamnar i spelboken.
          */}
          <div className="mt-[3px] text-[13px] text-[#8A94AB]">
            Bokförs som ett spel med totalodds.
          </div>
        </div>
        <div className="shrink-0 text-right">
          <FieldLabel className="mb-0.5">Odds</FieldLabel>
          <div className="font-mono-num text-[26px] font-semibold leading-none tabular-nums">
            {planketOdds(coupon.total_odds)}
          </div>
        </div>
      </div>
    </>
  );
}
