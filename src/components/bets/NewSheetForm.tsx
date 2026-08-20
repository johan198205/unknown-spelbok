"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/client";
import { randomSheetSlug } from "@/lib/sheet-slug";

export function NewSheetForm({
  onCreated,
}: {
  onCreated?: (sheetId: string) => void;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Min spelbok");
  const [description, setDescription] = useState("");
  const [bankroll, setBankroll] = useState("10000");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("sheets")
      .insert({
        user_id: user.id,
        name: name.trim() || "Min spelbok",
        description: description.trim() || null,
        start_bankroll: Number(bankroll) || 0,
        is_public: isPublic,
        currency: "SEK",
        slug: randomSheetSlug(),
      })
      .select("id")
      .maybeSingle();

    setLoading(false);
    if (error) {
      alert(error.message || "Kunde inte skapa spelbok");
      return;
    }
    setOpen(false);
    if (data?.id) onCreated?.(data.id);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Nytt spreadsheet
      </Button>
    );
  }

  return (
    <Panel className="p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Namn"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Startbankroll"
          type="number"
          value={bankroll}
          onChange={(e) => setBankroll(e.target.value)}
        />
        <div className="md:col-span-2">
          <Input
            label="Beskrivning"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="t.ex. Allt jag spelar, ingen filtrering."
            maxLength={200}
          />
        </div>
        <div className="md:col-span-2">
          <label className="flex items-start gap-2 text-sm text-[#C3CBDB]">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="accent-win mt-0.5 h-4 w-4"
            />
            <span>
              <span className="font-semibold text-text">Publik spelbok</span>
              {isPublic ? (
                <span className="mt-0.5 block text-[12.5px] text-muted">
                  Din spelbok blir synlig för alla och kan delas via länk.
                </span>
              ) : null}
            </span>
          </label>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={create} disabled={loading}>
          {loading ? "Skapar…" : "Skapa"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Avbryt
        </Button>
      </div>
    </Panel>
  );
}
