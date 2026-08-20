"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SheetDescriptionEdit({
  sheetId,
  description,
  canEdit,
}: {
  sheetId: string;
  description: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const value = draft ?? description ?? "";

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    if (!canEdit) return;
    const next = value.trim();
    if (next === (description || "").trim()) {
      setDraft(null);
      setEditing(false);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("sheets")
      .update({ description: next || null })
      .eq("id", sheetId);
    setSaving(false);
    if (error) {
      alert(error.message || "Kunde inte spara beskrivningen");
      return;
    }
    setDraft(null);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void save();
          }
          if (e.key === "Escape") {
            setDraft(null);
            setEditing(false);
          }
        }}
        placeholder="Beskriv din spelbok…"
        maxLength={200}
        className="ml-1 min-w-[180px] flex-1 rounded border border-line bg-bg-soft px-2 py-0.5 text-[14px] text-text outline-none focus:border-blue"
      />
    );
  }

  const text = description?.trim();

  if (!canEdit) {
    return (
      <span className="text-muted">{text || "Ingen beskrivning."}</span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(description || "");
        setEditing(true);
      }}
      className={cn(
        "ml-0 border-none bg-transparent p-0 text-left text-[14px]",
        text
          ? "text-muted hover:text-text"
          : "text-faint italic hover:text-muted"
      )}
      title="Klicka för att redigera beskrivning"
    >
      {text || "Lägg till beskrivning…"}
    </button>
  );
}
