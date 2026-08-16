"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import type { Page } from "@/lib/types";

export function PagesAdmin({ items }: { items: Page[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<Page> | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing?.title) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const payload = {
      title: editing.title,
      slug: editing.slug || slugify(editing.title),
      content: editing.content || "",
      seo_title: editing.seo_title || null,
      seo_description: editing.seo_description || null,
      published: !!editing.published,
      author_id: user?.id || null,
      updated_at: new Date().toISOString(),
    };
    if (editing.id) {
      await supabase.from("pages").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("pages").insert(payload);
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Ta bort sida?")) return;
    const supabase = createClient();
    await supabase.from("pages").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={() =>
          setEditing({
            title: "",
            slug: "",
            content: "",
            published: false,
          })
        }
      >
        + Ny sida
      </Button>

      {editing ? (
        <Panel className="p-4">
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Titel"
                value={editing.title || ""}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
                required
              />
              <Input
                label="Slug"
                value={editing.slug || ""}
                onChange={(e) =>
                  setEditing({ ...editing, slug: e.target.value })
                }
                placeholder="om-oss"
              />
              <Input
                label="SEO-titel"
                value={editing.seo_title || ""}
                onChange={(e) =>
                  setEditing({ ...editing, seo_title: e.target.value })
                }
              />
              <Input
                label="SEO-beskrivning"
                value={editing.seo_description || ""}
                onChange={(e) =>
                  setEditing({ ...editing, seo_description: e.target.value })
                }
              />
            </div>
            <Textarea
              label="Innehåll (markdown)"
              value={editing.content || ""}
              onChange={(e) =>
                setEditing({ ...editing, content: e.target.value })
              }
              rows={12}
              className="font-mono-num text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editing.published}
                onChange={(e) =>
                  setEditing({ ...editing, published: e.target.checked })
                }
                className="accent-win h-4 w-4"
              />
              Publicerad
            </label>
            <div className="flex gap-2">
              <Button type="submit">Spara</Button>
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
                Avbryt
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden">
        {items.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 border-b border-line-soft px-4 py-3"
          >
            <div className="flex-1">
              <div className="font-semibold">{p.title}</div>
              <div className="text-[12px] text-muted">
                /{p.slug} · {p.published ? "publicerad" : "utkast"}
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>
              Redigera
            </Button>
            <Button size="sm" variant="danger" onClick={() => remove(p.id)}>
              Ta bort
            </Button>
          </div>
        ))}
      </Panel>
    </div>
  );
}
