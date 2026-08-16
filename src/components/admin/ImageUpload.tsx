"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function ImageUpload({
  bucket,
  label,
  value,
  onChange,
  hint,
}: {
  bucket: "logos" | "banners" | "avatars";
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
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
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(data.publicUrl);
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
            </>
          )}
        </div>
        <div className="mt-1 font-mono-num text-[12.5px] text-faint">
          {hint ?? "JPG, PNG eller WebP"}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… eller ladda upp"
      />

      {error ? <div className="text-sm text-loss">{error}</div> : null}

      {value ? (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="max-h-16 rounded border border-line"
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
