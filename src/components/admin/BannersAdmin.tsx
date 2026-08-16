"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { createClient } from "@/lib/supabase/client";
import type { Banner, BannerPlacement } from "@/lib/types";

const placements: BannerPlacement[] = [
  "home",
  "sheet",
  "topplista",
  "spelbolag",
];

export function BannersAdmin({ items }: { items: Banner[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing?.title || !editing.image_url) return;
    const supabase = createClient();
    const payload = {
      title: editing.title,
      image_url: editing.image_url,
      link_url: editing.link_url || null,
      placement: editing.placement || "home",
      sort: Number(editing.sort || 0),
      active: editing.active !== false,
    };
    if (editing.id) {
      await supabase.from("banners").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("banners").insert(payload);
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Ta bort banner?")) return;
    const supabase = createClient();
    await supabase.from("banners").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={() =>
          setEditing({
            title: "",
            image_url: "",
            placement: "home",
            sort: 0,
            active: true,
          })
        }
      >
        + Ny banner
      </Button>

      {editing ? (
        <Panel className="p-4">
          <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
            <Input
              label="Titel"
              value={editing.title || ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              required
            />
            <Select
              label="Placering"
              value={editing.placement || "home"}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  placement: e.target.value as BannerPlacement,
                })
              }
            >
              {placements.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Input
              label="Länk"
              value={editing.link_url || ""}
              onChange={(e) =>
                setEditing({ ...editing, link_url: e.target.value })
              }
            />
            <Input
              label="Sortering"
              type="number"
              value={editing.sort ?? 0}
              onChange={(e) =>
                setEditing({ ...editing, sort: Number(e.target.value) })
              }
            />
            <div className="md:col-span-2">
              <ImageUpload
                bucket="banners"
                label="Bild"
                value={editing.image_url || ""}
                onChange={(url) => setEditing({ ...editing, image_url: url })}
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
            <div className="flex-1">
              <div className="font-semibold">{b.title}</div>
              <div className="text-[12px] text-muted">
                {b.placement} · sort {b.sort}
              </div>
            </div>
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
