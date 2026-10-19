"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { track } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import { randomSheetSlug } from "@/lib/sheet-slug";
import { useT } from "@/components/TextsProvider";

export function NewSheetForm({
  onCreated,
  buttonLabel,
}: {
  onCreated?: (sheetId: string) => void;
  /** Flikraden i spelboken har ont om plats — där heter knappen "+ Ny". */
  buttonLabel?: string;
} = {}) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(() => t("betform.newSheet.defaultName"));
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
        name: name.trim() || t("betform.newSheet.defaultName"),
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
      alert(error.message || t("betform.newSheet.error"));
      return;
    }
    track({ event: "create_spelbok" });
    setOpen(false);
    if (data?.id) onCreated?.(data.id);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {buttonLabel ?? t("betform.newSheet.trigger")}
      </Button>
    );
  }

  return (
    <Panel className="p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label={t("betform.newSheet.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label={t("betform.newSheet.bankroll")}
          type="number"
          value={bankroll}
          onChange={(e) => setBankroll(e.target.value)}
        />
        <div className="md:col-span-2">
          <Input
            label={t("betform.newSheet.description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("betform.newSheet.descriptionPlaceholder")}
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
              <span className="font-semibold text-text">{t("betform.newSheet.public")}</span>
              {isPublic ? (
                <span className="mt-0.5 block text-[12.5px] text-muted">
                  {t("betform.newSheet.publicHint")}
                </span>
              ) : null}
            </span>
          </label>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={create} disabled={loading}>
          {loading ? t("betform.newSheet.creating") : t("betform.newSheet.create")}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t("betform.newSheet.cancel")}
        </Button>
      </div>
    </Panel>
  );
}
