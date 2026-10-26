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
  ALLOWED_IMPORT_IMAGE_MIMES,
  DEFAULT_UNIT_VALUE,
  IMPORT_FIELDS,
  IMPORT_FIELD_LABEL_KEYS,
  MAX_IMPORT_IMAGE_BYTES,
  REQUIRED_IMPORT_FIELDS,
  type ColumnMapping,
  type ImportCommitResponse,
  type ImportField,
  type ImportFromImageResponse,
  type ImportPreviewResponse,
  type ImportSource,
  type ImportedBet,
  type ParsedFile,
  type PreviewRow,
} from "@/lib/import/types";
import { cn, formatOdds } from "@/lib/utils";
import { useT } from "@/components/TextsProvider";
import type { TextKey, TFunction } from "@/lib/texts";

type Step = "file" | "map" | "preview";
type FileMode = "excel" | "image";

const RESULT_LABELS: Record<NonNullable<ImportedBet["result"]>, TextKey> = {
  win: "import.preview.result.win",
  loss: "import.preview.result.loss",
  void: "import.preview.result.void",
  halfwin: "import.preview.result.halfwin",
  halfloss: "import.preview.result.halfloss",
  pending: "import.preview.result.pending",
};

const IMAGE_ACCEPT = ALLOWED_IMPORT_IMAGE_MIMES.join(",");

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

function readFileAsBase64(file: File, t: TFunction): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error(t("import.image.unreadable")));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error(t("import.image.unreadable")));
    reader.readAsDataURL(file);
  });
}

export function ImportBetsButton({ sheetId }: { sheetId: string }) {
  const t = useT();
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
        {t("import.button")}
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
  const t = useT();

  const [step, setStep] = useState<Step>("file");
  const [fileMode, setFileMode] = useState<FileMode>("excel");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importSource, setImportSource] = useState<ImportSource>("file");
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

  async function applyPreview(
    nextParsed: ParsedFile,
    nextMapping: ColumnMapping,
    source: ImportSource
  ) {
    const res = await fetch("/api/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: slimRows(nextParsed, nextMapping),
        mapping: nextMapping,
        filename: nextParsed.filename,
        file_hash: nextParsed.fileHash,
        unit_value: unitValue,
        import_source: source,
      }),
    });
    const json = (await res.json()) as ImportPreviewResponse & {
      error?: string;
    };
    if (!res.ok) {
      throw new Error(json.error || t("import.error.preview"));
    }
    setParsed(nextParsed);
    setMapping(nextMapping);
    setImportSource(source);
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
  }

  async function handleExcelFile(file: File | null | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const result = await parseBetFile(file, t);
      setParsed(result);
      setMapping(detectColumns(result.headers));
      setImportSource("file");
      setPreview(null);
      setStep("map");
    } catch (e) {
      setError(
        e instanceof ImportParseError ? e.message : t("import.parse.unreadable")
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleImageFile(file: File | null | undefined) {
    if (!file) return;
    setError(null);

    const mime = file.type;
    if (
      !(ALLOWED_IMPORT_IMAGE_MIMES as readonly string[]).includes(mime)
    ) {
      setError(t("import.image.wrongType"));
      return;
    }
    if (file.size > MAX_IMPORT_IMAGE_BYTES) {
      setError(t("import.image.tooLarge"));
      return;
    }

    setBusy(true);
    try {
      const image_base64 = await readFileAsBase64(file, t);
      const res = await fetch("/api/import/from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64,
          mime,
          filename: file.name || "bildimport",
        }),
      });
      const json = (await res.json()) as ImportFromImageResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || t("import.image.failed"));
        return;
      }

      const nextParsed: ParsedFile = {
        filename: json.filename,
        fileHash: json.file_hash,
        headers: Object.keys(json.mapping),
        rows: json.rows,
        notices: json.notices ?? [],
      };
      await applyPreview(nextParsed, json.mapping, "image");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("import.image.failed")
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
      await applyPreview(parsed, mapping, importSource);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("import.error.previewFile")
      );
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
          import_source: importSource,
          external_ids: [...selected],
          sheet_id: sheetId,
        }),
      });
      const json = (await res.json()) as ImportCommitResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || t("import.error.commit"));
        return;
      }
      onClose();
      toast(
        json.skipped
          ? t("import.toast.importedSkipped", {
              imported: json.imported,
              skipped: json.skipped,
            })
          : t("import.toast.imported", { imported: json.imported })
      );
      router.refresh();
    } catch {
      setError(t("import.error.commit"));
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

  function goBack() {
    if (step === "preview" && importSource === "image") {
      setStep("file");
      setPreview(null);
      setParsed(null);
      return;
    }
    setStep(step === "preview" ? "map" : "file");
  }

  const subtitle =
    step === "file"
      ? fileMode === "excel"
        ? t("import.subtitle.excel")
        : t("import.subtitle.image")
      : step === "map"
        ? t("import.subtitle.map")
        : t("import.subtitle.preview");

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-auto bg-[rgba(4,4,5,.72)] px-4 py-10 backdrop-blur-[4px]"
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
              {t("import.title")}
            </h3>
            <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("import.close")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-strong text-lg text-muted hover:text-text"
          >
            ×
          </button>
        </div>

        {step === "file" ? (
          <FileStep
            mode={fileMode}
            onModeChange={setFileMode}
            busy={busy}
            onExcelFile={handleExcelFile}
            onImageFile={handleImageFile}
          />
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
                    ? t("import.map.missingTitle", {
                        fields: missingRequired
                          .map((f) => t(IMPORT_FIELD_LABEL_KEYS[f]))
                          .join(", "),
                      })
                    : undefined
                }
              >
                {busy ? t("import.map.reading") : t("import.map.continue")}
              </Button>
              {missingRequired.length ? (
                <span className="text-[13px] text-muted">
                  {t("import.map.missingHint", {
                    fields: missingRequired
                      .map((f) => t(IMPORT_FIELD_LABEL_KEYS[f]))
                      .join(", "),
                  })}
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
              {busy
                ? t("import.preview.importing")
                : t("import.preview.submit", { count: selected.size })}
            </Button>
          ) : null}

          {step !== "file" ? (
            <Button
              variant="secondary"
              className="px-5 py-[13px]"
              disabled={busy}
              onClick={goBack}
            >
              {t("import.back")}
            </Button>
          ) : null}

          <Button
            variant="ghost"
            className="px-5 py-[13px]"
            disabled={busy}
            onClick={onClose}
          >
            {t("import.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FileStep({
  mode,
  onModeChange,
  busy,
  onExcelFile,
  onImageFile,
}: {
  mode: FileMode;
  onModeChange: (mode: FileMode) => void;
  busy: boolean;
  onExcelFile: (file: File | null | undefined) => void;
  onImageFile: (file: File | null | undefined) => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function onFile(file: File | null | undefined) {
    if (mode === "image") onImageFile(file);
    else onExcelFile(file);
  }

  return (
    <div>
      <div
        className="mb-3 inline-flex rounded-[10px] border border-line-strong bg-bg-soft p-1"
        role="tablist"
        aria-label={t("import.tabs.label")}
      >
        {(
          [
            { id: "excel", label: t("import.tabs.excel") },
            { id: "image", label: t("import.tabs.image") },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            disabled={busy}
            onClick={() => onModeChange(tab.id)}
            className={cn(
              "rounded-[8px] px-3.5 py-1.5 text-[13px] font-semibold transition",
              mode === tab.id
                ? "bg-panel text-text shadow-sm"
                : "text-muted hover:text-text"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
          {busy
            ? mode === "image"
              ? t("import.drop.imageBusy")
              : t("import.drop.fileBusy")
            : mode === "image"
              ? t("import.drop.image")
              : t("import.drop.file")}
        </div>
        <div className="text-[12.5px] text-muted">
          {mode === "image"
            ? t("import.drop.imageLimits")
            : t("import.drop.fileLimits")}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={mode === "image" ? IMAGE_ACCEPT : ".xlsx,.csv"}
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
          {mode === "image" ? t("import.drop.chooseImage") : t("import.drop.chooseFile")}
        </Button>
      </div>
      {mode === "excel" ? (
        <button
          type="button"
          onClick={() => void downloadImportTemplate(t)}
          className="mt-3 text-[13px] font-semibold text-blue hover:text-[#7FB0FF]"
        >
          {t("import.template.download")}
        </button>
      ) : null}
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
  const t = useT();
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
        {t("import.map.fileSummary", {
          filename: parsed.filename,
          count: parsed.rows.length,
        })}
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
              <option value="ignore">{t("import.map.ignore")}</option>
              {IMPORT_FIELDS.map((field) => {
                const owner = takenBy.get(field);
                const taken = owner != null && owner !== header;
                return (
                  <option key={field} value={field} disabled={taken}>
                    {t(IMPORT_FIELD_LABEL_KEYS[field])}
                    {taken ? t("import.map.taken") : ""}
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
  const t = useT();
  return (
    <div>
      {unitDetected ? (
        <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-blue/35 bg-blue/5 px-3 py-2.5">
          <span className="text-[13px] text-text">
            {t("import.preview.unitPrompt")}
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
          <span className="text-[13px] text-text">{t("import.preview.unitCurrency")}</span>
        </div>
      ) : null}

      <div className="mb-2 font-mono-num text-[13px] text-muted">
        {t("import.preview.selectedCount", {
          selected: selected.size,
          total: rows.length,
        })}
      </div>

      <div className="max-h-[46vh] overflow-auto sb-scroll rounded-[10px] border border-line">
        <table className="w-full min-w-[680px] border-collapse text-[13px]">
          <thead>
            <tr>
              {[
                "",
                t("import.preview.col.date"),
                t("import.preview.col.match"),
                t("import.preview.col.pick"),
                t("import.preview.col.odds"),
                t("import.preview.col.stake"),
                t("import.preview.col.result"),
              ].map(
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
                    "border-b border-[#2a2b33]",
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
                      aria-label={t("import.preview.rowCheckbox", {
                        match: row.bet.match_label ?? t("import.preview.rowFallback"),
                      })}
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
                        <span title={t("import.preview.softDuplicate")} className="shrink-0">
                          <TriangleAlert
                            className="size-3.5 text-blue"
                            strokeWidth={2.25}
                            aria-label={t("import.preview.softDuplicate")}
                          />
                        </span>
                      ) : null}
                    </span>
                    {isDuplicate ? (
                      <div className="text-[11.5px] text-faint">
                        {t("import.preview.duplicate")}
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
                    {row.bet.result ? t(RESULT_LABELS[row.bet.result]) : "—"}
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
