"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { BookmakerLogo } from "@/components/bets/BookmakerLogo";
import { ryggaBet } from "@/lib/rygga-bet";
import type { Bet, Sheet } from "@/lib/types";
import { formatOdds } from "@/lib/utils";

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

function pickDefaultSheetId(sheets: Sheet[]) {
  if (sheets.length === 1) return sheets[0]!.id;
  const last = typeof window !== "undefined" ? readLastSheetId() : null;
  if (last && sheets.some((s) => s.id === last)) return last;
  return sheets[0]?.id ?? "";
}

export function RyggaSpelModal({
  bet,
  sheets,
  unitSize = 100,
  onClose,
  onCreatedSheetRequest,
}: {
  bet: Bet;
  sheets: Sheet[];
  unitSize?: number;
  onClose: () => void;
  onCreatedSheetRequest?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const defaultStake = unitSize > 0 ? String(Math.round(unitSize)) : "100";

  const [sheetId, setSheetId] = useState(() => pickDefaultSheetId(sheets));
  const [stake, setStake] = useState(defaultStake);
  const [odds, setOdds] = useState(String(bet.odds));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sheetOptionsKey = useMemo(
    () => sheets.map((s) => s.id).join(","),
    [sheets]
  );

  const effectiveSheetId = sheets.some((s) => s.id === sheetId)
    ? sheetId
    : pickDefaultSheetId(sheets);

  async function submit() {
    if (busy) return;
    const targetId = effectiveSheetId;
    if (!targetId) {
      setError("Välj en spelbok.");
      return;
    }
    setBusy(true);
    setError(null);

    const result = await ryggaBet({
      sourceBetId: bet.id,
      targetSheetId: targetId,
      stake: Number(stake.replace(",", ".")),
      odds: Number(odds.replace(",", ".")),
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    writeLastSheetId(result.sheetId);
    toast(`Spelet tillagt i ${result.sheetName}`, {
      label: "Visa spelbok",
      href: `/spelbok?sheet=${result.sheetId}`,
    });
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Stäng"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[440px] rounded-t-[16px] border border-line bg-panel p-5 shadow-[var(--shadow-modal)] sm:rounded-[14px]">
        <h2 className="font-display text-[22px] font-semibold uppercase tracking-[0.04em]">
          Rygga spel
        </h2>

        <div className="mt-4 rounded-[10px] border border-line bg-bg-soft px-3.5 py-3 text-[13.5px]">
          <div className="font-semibold text-text">{bet.match}</div>
          <div className="mt-1 text-muted">
            {[bet.league, bet.pick].filter(Boolean).join(" · ")}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-num text-[13px] text-[#C3CBDB]">
            <span>Odds {formatOdds(Number(bet.odds))}</span>
            <span className="inline-flex items-center gap-1.5">
              <BookmakerLogo
                logoPath={bet.bookmakers?.logo_url}
                name={bet.bookmakers?.name}
                placeholder={!bet.bookmaker_id}
                size={14}
              />
              {bet.bookmakers?.name || "—"}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <Select
              key={sheetOptionsKey}
              label="Välj spelbok"
              value={effectiveSheetId}
              onChange={(e) => setSheetId(e.target.value)}
              disabled={!sheets.length}
            >
              {!sheets.length ? (
                <option value="">Ingen spelbok ännu</option>
              ) : (
                sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </Select>
            <button
              type="button"
              className="mt-1.5 border-none bg-transparent p-0 text-[12.5px] font-semibold text-blue hover:underline"
              onClick={() => {
                if (onCreatedSheetRequest) onCreatedSheetRequest();
                else router.push("/spelbok");
              }}
            >
              Skapa ny spelbok
            </button>
          </div>

          <Input
            label="Insats"
            inputMode="decimal"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="font-mono-num"
          />

          <Input
            label="Odds"
            inputMode="decimal"
            value={odds}
            onChange={(e) => setOdds(e.target.value)}
            className="font-mono-num"
          />
        </div>

        {error ? (
          <p className="mt-3 text-[13px] font-medium text-loss">{error}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => void submit()}
            disabled={busy || !effectiveSheetId || !sheets.length}
            className="flex-1"
          >
            {busy ? "Lägger till…" : "Lägg till i spelbok"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Avbryt
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Öppnar Rygga-modal eller skickar till login med return-URL. */
export function useRyggaFlow({
  sheets,
  unitSize,
  isAuthenticated,
}: {
  sheets: Sheet[];
  unitSize?: number;
  isAuthenticated: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [bet, setBet] = useState<Bet | null>(null);

  function openRygga(next: Bet) {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setBet(next);
  }

  const modal =
    bet && isAuthenticated ? (
      <RyggaSpelModal
        bet={bet}
        sheets={sheets}
        unitSize={unitSize}
        onClose={() => setBet(null)}
      />
    ) : null;

  return { openRygga, modal, ryggaBet: bet };
}

export function RyggaLoginHintLink({ returnPath }: { returnPath: string }) {
  return (
    <Link
      href={`/login?next=${encodeURIComponent(returnPath)}`}
      className="text-win no-underline hover:underline"
    >
      Logga in
    </Link>
  );
}
