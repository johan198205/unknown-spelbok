"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { saveCouponProof } from "@/lib/coupon-actions";
import { publishedLabel } from "@/lib/coupons";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const BUCKET = "coupon-proofs";
const LABEL = "text-[10px] uppercase tracking-[0.13em] text-[#8A94AB]";

/**
 * Spelbeviset — skärmbilden av kupongen hos spelbolaget.
 *
 * Tre lägen, och skillnaden mellan dem är hela poängen: en LÄSARE ser
 * antingen bilden eller texten "spelbevis saknas", aldrig en uppladdningsyta.
 * En dropzon på en publik sida ser ut som en inbjudan att skicka in något,
 * och den som klickar möts av ett RLS-fel.
 *
 * Rutans höjd följer kolumnantalet via --kupong-proof-h (globals.css).
 */
export function CouponProof({
  couponId,
  proofUrl,
  publishedAt,
  bookmakerName,
  title,
  stake,
  totalOdds,
  editorMode,
}: {
  couponId: string;
  proofUrl: string | null;
  publishedAt: string;
  bookmakerName: string;
  title: string;
  stake: string;
  totalOdds: string;
  editorMode: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(proofUrl);

  const note = `Skärmbild från ${bookmakerName} med insats och odds.`;

  return (
    <div
      className="min-w-0"
      style={{ flex: "0 0 var(--kupong-proof-w)", width: "var(--kupong-proof-w)" }}
    >
      <div className="mb-[7px] flex items-baseline gap-[7px]">
        <span className={LABEL}>Spelbevis</span>
        {/* "Verifierad" bara när det finns något att verifiera. */}
        {url ? (
          <span className="font-mono-num text-[10.5px] text-faint">
            Verifierad {publishedLabel(publishedAt)}
          </span>
        ) : null}
      </div>

      {editorMode ? (
        <ProofDropzone
          couponId={couponId}
          url={url}
          onChange={setUrl}
          bookmakerName={bookmakerName}
          onZoom={() => setOpen(true)}
        />
      ) : url ? (
        <div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Förstora spelbeviset"
            className="block w-full cursor-zoom-in rounded-[10px] border border-line bg-bg-deep bg-cover bg-center bg-no-repeat"
            style={{
              height: "var(--kupong-proof-h)",
              maxWidth: "var(--kupong-proof-w)",
              backgroundImage: `url(${JSON.stringify(url)})`,
            }}
          />
          <div className="mt-[7px] text-[11px] leading-[1.35] text-faint">{note}</div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-line-strong bg-bg-soft p-4 text-center"
          style={{ height: "var(--kupong-proof-h)", maxWidth: "var(--kupong-proof-w)" }}
        >
          <span className="font-mono-num text-[11.5px] tracking-[0.1em] text-faint">
            SPELBEVIS SAKNAS
          </span>
          <span className="text-[11.5px] leading-[1.45] text-faint">
            Redaktionen har inte laddat upp någon skärmbild för den här kupongen.
          </span>
        </div>
      )}

      {open ? (
        <ProofLightbox
          title={title}
          src={url}
          bookmakerName={bookmakerName}
          stake={stake}
          totalOdds={totalOdds}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ProofDropzone({
  couponId,
  url,
  onChange,
  bookmakerName,
  onZoom,
}: {
  couponId: string;
  url: string | null;
  onChange: (url: string | null) => void;
  bookmakerName: string;
  onZoom: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function upload(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Spelbeviset måste vara en bild.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const path = `${couponId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });

    if (error) {
      setBusy(false);
      toast(error.message);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const result = await saveCouponProof(couponId, data.publicUrl);
    setBusy(false);

    if (!result.ok) {
      toast(result.message);
      return;
    }
    onChange(data.publicUrl);
    toast(result.message);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files?.[0]);
        }}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed p-4 text-center transition",
          dragging ? "border-cyan bg-cyan/5" : "border-line-strong bg-bg-soft"
        )}
        style={{
          height: "var(--kupong-proof-h)",
          maxWidth: "var(--kupong-proof-w)",
          // Ligger en bild där visas den under den streckade ramen — men
          // bara som bakgrund, aldrig som <img src=""> med tom sträng.
          backgroundImage: url ? `url(${JSON.stringify(url)})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {url ? null : (
          <>
            <span className="font-mono-num text-[11.5px] tracking-[0.1em] text-faint">
              {busy ? "LADDAR UPP…" : "SLÄPP SKÄRMBILD"}
            </span>
            <span className="text-[11.5px] leading-[1.45] text-faint">
              Skärmbild av kupongen hos {bookmakerName}.
            </span>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="mt-[7px] flex items-center gap-2">
        {url ? (
          <button
            type="button"
            onClick={onZoom}
            className="cursor-pointer rounded-[8px] border border-line-strong bg-panel-2 px-[11px] py-[7px] text-[12px] font-semibold text-text-soft hover:border-line-hover hover:text-text"
          >
            Förstora
          </button>
        ) : null}
        <span className="min-w-0 text-[11px] leading-[1.35] text-faint">
          Redaktionsläge · syns bara för dig.
        </span>
      </div>
    </div>
  );
}

/**
 * Ljuslådan. Bilden ritas som background-image, inte <img src>: en literal
 * src mot ett värde som ännu inte finns startar en hämtning som failar och
 * fyller konsolen med döda förfrågningar.
 */
function ProofLightbox({
  title,
  src,
  bookmakerName,
  stake,
  totalOdds,
  onClose,
}: {
  title: string;
  src: string | null;
  bookmakerName: string;
  stake: string;
  totalOdds: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      // Stängs på backdropen, men inte på klick i innehållet: utan
      // currentTarget-kontrollen stänger varje klick i bilden rutan.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[94] flex items-center justify-center bg-[rgba(5,7,12,.82)] px-4 py-10 backdrop-blur-[4px]"
    >
      <div className="w-full max-w-[420px]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-[19px] font-semibold uppercase tracking-[0.04em] text-text">
              Spelbevis
            </div>
            <div className="text-[13.5px] text-muted">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="size-[34px] shrink-0 cursor-pointer rounded-[9px] border border-line-strong bg-panel text-[16px] text-muted hover:text-text"
          >
            ×
          </button>
        </div>

        <div className="flex h-[560px] w-full items-center justify-center overflow-hidden rounded-[14px] border border-line bg-bg-deep">
          {src ? (
            <div
              role="img"
              aria-label="Spelbevis"
              className="h-full w-full bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${JSON.stringify(src)})` }}
            />
          ) : (
            <div className="p-7 text-center text-[14px] leading-[1.6] text-faint">
              Redaktionen har inte laddat upp någon skärmbild för den här
              kupongen.
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2.5 font-mono-num text-[12.5px] text-faint">
          <span>{bookmakerName}</span>
          <span>·</span>
          <span>Insats {stake}</span>
          <span>·</span>
          <span>Totalodds {totalOdds}</span>
        </div>
      </div>
    </div>
  );
}
