"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/client";

export function NewSheetForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Min spelbok");
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

    await supabase.from("sheets").insert({
      user_id: user.id,
      name: name.trim() || "Min spelbok",
      start_bankroll: Number(bankroll) || 0,
      is_public: isPublic,
      currency: "SEK",
    });

    setLoading(false);
    setOpen(false);
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
      <div className="grid gap-3 md:grid-cols-3">
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
        <label className="flex items-end gap-2 pb-3 text-sm text-[#C3CBDB]">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="accent-win h-4 w-4"
          />
          Publik (syns i topplista)
        </label>
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
