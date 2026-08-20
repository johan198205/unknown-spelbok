"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import { cn } from "@/lib/utils";

const BOOKMAKER_LOGO_MAX_BYTES = 200 * 1024;
const BOOKMAKER_LOGO_TYPES = new Set([
  "image/png",
  "image/svg+xml",
  "image/webp",
]);

export function ImageUpload({
  bucket,
  label,
  value,
  onChange,
  hint,
  /** När true: spara Storage-path (inte full URL) och strikt MIME/storlek. */
  storePath,
  required,
}: {
  bucket: "logos" | "banners" | "avatars" | "bookmaker-logos";
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  storePath?: boolean;
  required?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl =
    bucket === "bookmaker-logos" || storePath
      ? getBookmakerLogoUrl(value) ?? (value.startsWith("http") ? value : null)
      : value || null;

  async function onFile(file: File | null | undefined) {
    if (!file) return;

    if (bucket === "bookmaker-logos") {
      if (!BOOKMAKER_LOGO_TYPES.has(file.type)) {
        setError("Endast PNG, SVG eller WebP");
        return;
      }
      if (file.size > BOOKMAKER_LOGO_MAX_BYTES) {
        setError("Max 200 KB");
        return;
      }
    } else if (!file.type.startsWith("image/")) {
      setError("Filen måste vara en bild");
      return;
    }

    setUploading(true);
    setError(null);
    const supabase = createClient();
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    if (storePath || bucket === "bookmaker-logos") {
      onChange(path);
    } else {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    }
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void onFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-[12px] border border-dashed px-6 py-6 text-center transition",
          dragging
            ? "border-cyan bg-cyan/5"
            : "border-line-strong hover:border-line-hover"
        )}
      >
        <div className="text-[14px] text-text-soft">
          {uploading ? (
            "Laddar upp…"
          ) : (
            <>
              Dra hit bildfilen eller <span className="text-cyan">bläddra</span>
              {required && !value ? (
                <span className="mt-1 block text-[12.5px] text-loss">
                  Logotyp krävs
                </span>
              ) : null}
            </>
          )}
        </div>
        <div className="mt-1 font-mono-num text-[12.5px] text-faint">
          {hint ??
            (bucket === "bookmaker-logos"
              ? "PNG, SVG eller WebP · max 200 KB"
              : "JPG, PNG eller WebP")}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={
            bucket === "bookmaker-logos"
              ? "image/png,image/svg+xml,image/webp"
              : "image/*"
          }
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {bucket !== "bookmaker-logos" ? (
        <Input
          label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… eller ladda upp"
        />
      ) : null}

      {error ? <div className="text-sm text-loss">{error}</div> : null}

      {previewUrl ? (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="max-h-16 rounded border border-line object-contain"
          />
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => onChange("")}
          >
            Rensa
          </Button>
        </div>
      ) : null}
    </div>
  );
}
