"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import type { Bookmaker } from "@/lib/types";
import { ImageUpload } from "@/components/admin/ImageUpload";

export function BookmakersAdmin({ items }: { items: Bookmaker[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<Bookmaker> | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing?.name) return;
    const supabase = createClient();
    const payload = {
      name: editing.name,
      slug: editing.slug || slugify(editing.name),
      rank: Number(editing.rank || 99),
      bonus: editing.bonus || null,
      bonus_value: Number(editing.bonus_value || 0),
      terms: editing.terms || null,
      usp: editing.usp || null,
      rating: editing.rating != null ? Number(editing.rating) : null,
      fast_payout: !!editing.fast_payout,
      tracking_url: editing.tracking_url || null,
      review: editing.review || null,
      logo_url: editing.logo_url || null,
      active: editing.active !== false,
      updated_at: new Date().toISOString(),
    };

    if (editing.id) {
      await supabase.from("bookmakers").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("bookmakers").insert(payload);
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Ta bort spelbolag?")) return;
    const supabase = createClient();
    await supabase.from("bookmakers").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={() =>
          setEditing({
            name: "",
            rank: items.length + 1,
            active: true,
            fast_payout: false,
            bonus_value: 0,
          })
        }
      >
        + Nytt spelbolag
      </Button>

      {editing ? (
        <Panel className="p-4">
          <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
            <Input
              label="Namn"
              value={editing.name || ""}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              required
            />
            <Input
              label="Rank"
              type="number"
              value={editing.rank ?? 99}
              onChange={(e) =>
                setEditing({ ...editing, rank: Number(e.target.value) })
              }
            />
            <Input
              label="Bonus"
              value={editing.bonus || ""}
              onChange={(e) => setEditing({ ...editing, bonus: e.target.value })}
            />
            <Input
              label="Bonusvärde"
              type="number"
              value={editing.bonus_value ?? 0}
              onChange={(e) =>
                setEditing({ ...editing, bonus_value: Number(e.target.value) })
              }
            />
            <Input
              label="USP"
              value={editing.usp || ""}
              onChange={(e) => setEditing({ ...editing, usp: e.target.value })}
            />
            <Input
              label="Tracking-URL"
              value={editing.tracking_url || ""}
              onChange={(e) =>
                setEditing({ ...editing, tracking_url: e.target.value })
              }
            />
            <Input
              label="Betyg"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={editing.rating ?? ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  rating: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <label className="flex items-end gap-2 pb-3 text-sm">
              <input
                type="checkbox"
                checked={!!editing.fast_payout}
                onChange={(e) =>
                  setEditing({ ...editing, fast_payout: e.target.checked })
                }
                className="accent-win h-4 w-4"
              />
              Snabba uttag
            </label>
            <div className="md:col-span-2">
              <Textarea
                label="Recension"
                value={editing.review || ""}
                onChange={(e) =>
                  setEditing({ ...editing, review: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <ImageUpload
                bucket="logos"
                label="Logotyp"
                value={editing.logo_url || ""}
                onChange={(url) => setEditing({ ...editing, logo_url: url })}
              />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">Spara</Button>
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
                Avbryt
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden">
        {items.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-3 border-b border-line-soft px-4 py-3"
          >
            <span className="font-display w-8 text-muted">{b.rank}</span>
            <div className="flex-1 font-semibold">{b.name}</div>
            <Button size="sm" variant="secondary" onClick={() => setEditing(b)}>
              Redigera
            </Button>
            <Button size="sm" variant="danger" onClick={() => remove(b.id)}>
              Ta bort
            </Button>
          </div>
        ))}
      </Panel>
    </div>
  );
}
