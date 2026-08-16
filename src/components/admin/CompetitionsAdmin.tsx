"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/client";
import type { Competition } from "@/lib/types";

export function CompetitionsAdmin({ items }: { items: Competition[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<Competition> | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing?.name || !editing.starts_at || !editing.ends_at) return;
    const supabase = createClient();
    const payload = {
      name: editing.name,
      description: editing.description || null,
      starts_at: editing.starts_at,
      ends_at: editing.ends_at,
      active: editing.active !== false,
    };
    if (editing.id) {
      await supabase.from("competitions").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("competitions").insert(payload);
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Ta bort tävling?")) return;
    const supabase = createClient();
    await supabase.from("competitions").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={() => {
          const start = new Date();
          const end = new Date();
          end.setMonth(end.getMonth() + 1);
          setEditing({
            name: "",
            description: "",
            starts_at: start.toISOString().slice(0, 16),
            ends_at: end.toISOString().slice(0, 16),
            active: true,
          });
        }}
      >
        + Ny tävling
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
            <label className="flex items-end gap-2 pb-3 text-sm">
              <input
                type="checkbox"
                checked={editing.active !== false}
                onChange={(e) =>
                  setEditing({ ...editing, active: e.target.checked })
                }
                className="accent-win h-4 w-4"
              />
              Aktiv
            </label>
            <Input
              label="Start"
              type="datetime-local"
              value={(editing.starts_at || "").slice(0, 16)}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  starts_at: new Date(e.target.value).toISOString(),
                })
              }
              required
            />
            <Input
              label="Slut"
              type="datetime-local"
              value={(editing.ends_at || "").slice(0, 16)}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  ends_at: new Date(e.target.value).toISOString(),
                })
              }
              required
            />
            <div className="md:col-span-2">
              <Textarea
                label="Beskrivning"
                value={editing.description || ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                rows={3}
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
        {items.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 border-b border-line-soft px-4 py-3"
          >
            <div className="flex-1">
              <div className="font-semibold">{c.name}</div>
              <div className="text-[12px] text-muted">
                {new Date(c.starts_at).toLocaleDateString("sv-SE")} –{" "}
                {new Date(c.ends_at).toLocaleDateString("sv-SE")} ·{" "}
                {c.active ? "aktiv" : "inaktiv"}
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>
              Redigera
            </Button>
            <Button size="sm" variant="danger" onClick={() => remove(c.id)}>
              Ta bort
            </Button>
          </div>
        ))}
      </Panel>
    </div>
  );
}
