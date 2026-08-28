"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { detectColumns } from "@/lib/import/detect-columns";
import { ImportParseError, parseBetFile } from "@/lib/import/parse";
import { downloadImportTemplate } from "@/lib/import/template";
import {
  DEFAULT_UNIT_VALUE,
  IMPORT_FIELDS,
  IMPORT_FIELD_LABELS,
  REQUIRED_IMPORT_FIELDS,
  type ColumnMapping,
  type ImportCommitResponse,
  type ImportField,
  type ImportPreviewResponse,
  type ImportedBet,
  type ParsedFile,
  type PreviewRow,
} from "@/lib/import/types";
import { cn, formatOdds } from "@/lib/utils";

type Step = "file" | "map" | "preview";

const RESULT_LABELS: Record<NonNullable<ImportedBet["result"]>, string> = {
  win: "Vinst",
  loss: "Förlust",
  void: "Void",
  halfwin: "Halv vinst",
  halfloss: "Halv förlust",
  pending: "Orättat",
};

/**
 * Bara mappade kolumner går över nätet. En bred exportfil kan annars bli
 * flera megabyte JSON av kolumner som ändå ignoreras.
 */
function slimRows(parsed: ParsedFile, mapping: ColumnMapping) {
  const keep = parsed.headers.filter((h) => mapping[h] && mapping[h] !== "ignore");
  return parsed.rows.map((row) => {
    const out: Record<string, string> = {};
    for (const header of keep) out[header] = row[header] ?? "";
    return out;
  });
}

function resultClass(result: ImportedBet["result"]) {
  if (result === "win" || result === "halfwin") return "text-win";
  if (result === "loss" || result === "halfloss") return "text-loss";
  return "text-muted";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sv-SE");
}

export function ImportBetsButton({ sheetId }: { sheetId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="shrink-0 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Upload className="size-4" strokeWidth={2.25} />
        Importera
      </Button>
      {open ? (
        <ImportBetsModal sheetId={sheetId} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function ImportBetsModal({
  sheetId,
  onClose,
}: {
  sheetId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("file");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [unitValue, setUnitValue] = useState(DEFAULT_UNIT_VALUE);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const duplicates = useMemo(
    () => new Set(preview?.duplicates ?? []),
    [preview]
  );
  const softDuplicates = useMemo(
    () => new Set(preview?.soft_duplicates ?? []),
    [preview]
  );

  const mappedFields = useMemo(
    () => new Set(Object.values(mapping)),
    [mapping]
  );
  const missingRequired = REQUIRED_IMPORT_FIELDS.filter(
    (field) => !mappedFields.has(field)
  );

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const result = await parseBetFile(file);
      setParsed(result);
      setMapping(detectColumns(result.headers));
      setStep("map");
    } catch (e) {
      setError(
        e instanceof ImportParseError ? e.message : "Filen kunde inte läsas."
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadPreview() {
    if (!parsed) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: slimRows(parsed, mapping),
          mapping,
          filename: parsed.filename,
          file_hash: parsed.fileHash,
          unit_value: unitValue,
        }),
      });
      const json = (await res.json()) as ImportPreviewResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Kunde inte förhandsgranska filen.");
        return;
      }
      setPreview(json);
      const dupes = new Set(json.duplicates);
      setSelected(
        new Set(
          json.bets
            .filter((row) => row.valid && !dupes.has(row.bet.external_id))
            .map((row) => row.bet.external_id)
        )
      );
      setStep("preview");
    } catch {
      setError("Kunde inte förhandsgranska filen.");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!parsed || !selected.size) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: slimRows(parsed, mapping),
          mapping,
          filename: parsed.filename,
          file_hash: parsed.fileHash,
          unit_value: unitValue,
          external_ids: [...selected],
          sheet_id: sheetId,
        }),
      });
      const json = (await res.json()) as ImportCommitResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "Kunde inte spara spelen.");
        return;
      }
      onClose();
      toast(
        json.skipped
          ? `${json.imported} spel importerade · ${json.skipped} hoppades över`
          : `${json.imported} spel importerade`
      );
      router.refresh();
    } catch {
      setError("Kunde inte spara spelen.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-auto bg-[rgba(5,7,12,.72)] px-4 py-10 backdrop-blur-[4px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-bets-title"
        className="animate-sbfade w-full max-w-[860px] rounded-[14px] border border-line-strong bg-panel p-[22px]"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3
              id="import-bets-title"
              className="font-display text-[22px] font-semibold"
            >
              Importera spel
            </h3>
            <p className="mt-0.5 text-[13px] text-muted">
              {step === "file"
                ? "Ladda upp en Excel- eller CSV-fil med dina spel."
                : step === "map"
                  ? "Kontrollera att kolumnerna hamnat rätt."
                  : "Välj vilka spel som ska importeras."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-strong text-lg text-muted hover:text-text"
          >
            ×
          </button>
        </div>

        {step === "file" ? (
          <FileStep busy={busy} onFile={handleFile} />
        ) : null}

        {step === "map" && parsed ? (
          <MapStep
            parsed={parsed}
            mapping={mapping}
            onChange={(header, field) =>
              setMapping((prev) => ({ ...prev, [header]: field }))
            }
          />
        ) : null}

        {step === "preview" && preview ? (
          <PreviewStep
            rows={preview.bets}
            unitDetected={preview.unit_detected}
            unitValue={unitValue}
            onUnitValueChange={setUnitValue}
            duplicates={duplicates}
            softDuplicates={softDuplicates}
            selected={selected}
            onToggle={toggle}
          />
        ) : null}

        {error ? (
          <div className="mt-3 rounded-[9px] border border-loss/35 bg-loss/10 px-3 py-2.5 text-sm text-loss">
            {error}
          </div>
        ) : null}

        <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
          {step === "map" ? (
            <>
              <Button
                className="py-[13px] text-[15px]"
                disabled={busy || missingRequired.length > 0}
                onClick={() => void loadPreview()}
                title={
                  missingRequired.length
                    ? `Mappa ${missingRequired
                        .map((f) => IMPORT_FIELD_LABELS[f])
                        .join(", ")}`
                    : undefined
                }
              >
                {busy ? "Läser…" : "Fortsätt"}
              </Button>
              {missingRequired.length ? (
                <span className="text-[13px] text-muted">
                  Mappa{" "}
                  {missingRequired
                    .map((f) => IMPORT_FIELD_LABELS[f])
                    .join(", ")}{" "}
                  för att gå vidare.
                </span>
              ) : null}
            </>
          ) : null}

          {step === "preview" ? (
            <Button
              className="py-[13px] text-[15px]"
              disabled={busy || !selected.size}
              onClick={() => void commit()}
            >
              {busy ? "Importerar…" : `Importera ${selected.size} spel`}
            </Button>
          ) : null}

          {step !== "file" ? (
            <Button
              variant="secondary"
              className="px-5 py-[13px]"
              disabled={busy}
              onClick={() => setStep(step === "preview" ? "map" : "file")}
            >
              Tillbaka
            </Button>
          ) : null}

          <Button
            variant="ghost"
            className="px-5 py-[13px]"
            disabled={busy}
            onClick={onClose}
          >
            Avbryt
          </Button>
        </div>
      </div>
    </div>
  );
}

function FileStep({
  busy,
  onFile,
}: {
  busy: boolean;
  onFile: (file: File | null | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

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
          onFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed px-6 py-12 text-center transition",
          dragging ? "border-blue bg-blue/5" : "border-line-strong bg-bg-soft"
        )}
      >
        <Upload className="size-6 text-faint" strokeWidth={1.75} />
        <div className="text-[15px] text-text">
          {busy ? "Läser filen…" : "Dra hit din fil eller välj den nedan"}
        </div>
        <div className="text-[12.5px] text-muted">
          .xlsx eller .csv · max 2 MB · max 1000 rader
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          Välj fil
        </Button>
      </div>
      <button
        type="button"
        onClick={() => void downloadImportTemplate()}
        className="mt-3 text-[13px] font-semibold text-blue hover:text-[#7FB0FF]"
      >
        Ladda ner mall ›
      </button>
    </div>
  );
}

function MapStep({
  parsed,
  mapping,
  onChange,
}: {
  parsed: ParsedFile;
  mapping: ColumnMapping;
  onChange: (header: string, field: ImportField | "ignore") => void;
}) {
  const samples = useMemo(() => {
    const out: Record<string, string> = {};
    for (const header of parsed.headers) {
      out[header] = parsed.rows
        .slice(0, 3)
        .map((row) => row[header])
        .filter((v) => v && v.trim())
        .join(" · ");
    }
    return out;
  }, [parsed]);

  const takenBy = useMemo(() => {
    const map = new Map<ImportField, string>();
    for (const [header, field] of Object.entries(mapping)) {
      if (field !== "ignore" && !map.has(field)) map.set(field, header);
    }
    return map;
  }, [mapping]);

  return (
    <div>
      {parsed.notices.map((notice) => (
        <div
          key={notice}
          className="mb-2.5 rounded-[9px] border border-line bg-bg-soft px-3 py-2 text-[13px] text-muted"
        >
          {notice}
        </div>
      ))}
      <div className="mb-2.5 text-[13px] text-muted">
        {parsed.filename} · {parsed.rows.length} rader
      </div>
      <div className="max-h-[46vh] space-y-2 overflow-auto sb-scroll pr-1">
        {parsed.headers.map((header) => (
          <div
            key={header}
            className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line bg-bg-soft px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold text-text">
                {header}
              </div>
              <div className="truncate font-mono-num text-[12px] text-faint">
                {samples[header] || "—"}
              </div>
            </div>
            <Select
              value={mapping[header] ?? "ignore"}
              onChange={(e) =>
                onChange(header, e.target.value as ImportField | "ignore")
              }
              className="w-[170px] shrink-0 py-2"
            >
              <option value="ignore">Ignorera</option>
              {IMPORT_FIELDS.map((field) => {
                const owner = takenBy.get(field);
                const taken = owner != null && owner !== header;
                return (
                  <option key={field} value={field} disabled={taken}>
                    {IMPORT_FIELD_LABELS[field]}
                    {taken ? " (upptagen)" : ""}
                  </option>
                );
              })}
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewStep({
  rows,
  unitDetected,
  unitValue,
  onUnitValueChange,
  duplicates,
  softDuplicates,
  selected,
  onToggle,
}: {
  rows: PreviewRow[];
  unitDetected: boolean;
  unitValue: number;
  onUnitValueChange: (value: number) => void;
  duplicates: Set<string>;
  softDuplicates: Set<string>;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      {unitDetected ? (
        <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-blue/35 bg-blue/5 px-3 py-2.5">
          <span className="text-[13px] text-text">
            Insatserna ser ut att vara units. 1 unit =
          </span>
          <input
            type="number"
            min="1"
            step="1"
            value={unitValue}
            onChange={(e) =>
              onUnitValueChange(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-[90px] rounded-[9px] border border-line bg-bg-soft px-2.5 py-1.5 font-mono-num text-[14px] text-text outline-none focus:border-blue"
          />
          <span className="text-[13px] text-text">kr</span>
        </div>
      ) : null}

      <div className="mb-2 font-mono-num text-[13px] text-muted">
        {selected.size} av {rows.length} valda
      </div>

      <div className="max-h-[46vh] overflow-auto sb-scroll rounded-[10px] border border-line">
        <table className="w-full min-w-[680px] border-collapse text-[13px]">
          <thead>
            <tr>
              {["", "Datum", "Match", "Spel", "Odds", "Insats", "Resultat"].map(
                (label, i) => (
                  <th
                    key={label || i}
                    className="sticky top-0 border-b border-line bg-bg-soft px-2.5 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted"
                  >
                    {label}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = row.bet.external_id;
              const isDuplicate = duplicates.has(id);
              const isSoft = softDuplicates.has(id);
              const disabled = !row.valid || isDuplicate;
              const stake =
                row.stake_units != null
                  ? Math.round(row.stake_units * unitValue * 100) / 100
                  : row.bet.stake;

              return (
                <tr
                  key={id}
                  className={cn(
                    "border-b border-[#171E2C]",
                    disabled ? "text-faint" : "text-[#C3CBDB]"
                  )}
                >
                  <td className="px-2.5 py-2">
                    <input
                      type="checkbox"
                      className="accent-win h-4 w-4"
                      checked={selected.has(id)}
                      disabled={disabled}
                      onChange={() => onToggle(id)}
                      aria-label={`Importera ${row.bet.match_label ?? "rad"}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 font-mono-num">
                    {formatDate(row.bet.placed_at)}
                  </td>
                  <td className="px-2.5 py-2">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">
                        {row.bet.match_label || "—"}
                      </span>
                      {isSoft ? (
                        <span title="Möjlig dubblett" className="shrink-0">
                          <TriangleAlert
                            className="size-3.5 text-blue"
                            strokeWidth={2.25}
                            aria-label="Möjlig dubblett"
                          />
                        </span>
                      ) : null}
                    </span>
                    {isDuplicate ? (
                      <div className="text-[11.5px] text-faint">
                        Redan importerad
                      </div>
                    ) : row.reason ? (
                      <div className="text-[11.5px] text-loss">{row.reason}</div>
                    ) : row.warning ? (
                      <div className="text-[11.5px] text-muted">
                        {row.warning}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2.5 py-2">
                    <span className="truncate">{row.bet.market || "—"}</span>
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-right font-mono-num">
                    {row.bet.odds == null ? "—" : formatOdds(row.bet.odds)}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-right font-mono-num">
                    {stake == null ? "—" : stake.toLocaleString("sv-SE")}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-2.5 py-2 font-semibold",
                      disabled ? "text-faint" : resultClass(row.bet.result)
                    )}
                  >
                    {row.bet.result ? RESULT_LABELS[row.bet.result] : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
