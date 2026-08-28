"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Switch } from "@/components/ui/Switch";
import { deletePage, publishPage, savePage, type PageDraft } from "@/lib/admin/pages";
import { cn, slugify } from "@/lib/utils";
import type { Page } from "@/lib/types";

const TOOLS = [
  { key: "h2", label: "H2" },
  { key: "h3", label: "H3" },
  { key: "bold", label: "B" },
  { key: "italic", label: "I" },
  { key: "link", label: "Länk" },
  { key: "list", label: "Lista" },
  { key: "quote", label: "Citat" },
] as const;

type ToolKey = (typeof TOOLS)[number]["key"];

function fmtTime(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}


export function PageEditor({ page }: { page: Page }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [draft, setDraft] = useState<PageDraft>({
    title: page.title,
    slug: page.slug,
    content: page.content,
    seo_title: page.seo_title ?? "",
    seo_description: page.seo_description ?? "",
    show_in_footer: page.show_in_footer,
  });
  const [published, setPublished] = useState(page.published);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [savedAt, setSavedAt] = useState<string | null>(page.updated_at);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const savedRef = useRef(JSON.stringify(draft));

  const persist = useCallback(async () => {
    const snapshot = draft;
    setSaving(true);
    try {
      const res = await savePage(page.id, snapshot);
      savedRef.current = JSON.stringify({ ...snapshot, slug: res.slug });
      if (res.slug !== snapshot.slug) {
        setDraft((d) => ({ ...d, slug: res.slug }));
      }
      setSavedAt(res.savedAt);
      return res;
    } finally {
      setSaving(false);
    }
  }, [draft, page.id]);

  // Autosave 3 s efter sista tangenttryckningen
  useEffect(() => {
    if (JSON.stringify(draft) === savedRef.current) return;
    const timer = setTimeout(() => {
      void persist();
    }, 3000);
    return () => clearTimeout(timer);
  }, [draft, persist]);

  function patch(next: Partial<PageDraft>) {
    setDraft((d) => ({ ...d, ...next }));
  }

  function onTitle(value: string) {
    setDraft((d) => ({
      ...d,
      title: value,
      slug: slugTouched ? d.slug : slugify(value),
    }));
  }

  function applyTool(kind: ToolKey) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = draft.content;
    const selected = value.slice(start, end);

    const linePrefix = (prefix: string, fallback: string) => {
      const body = selected || fallback;
      return {
        text: body
          .split("\n")
          .map((line) => `${prefix}${line}`)
          .join("\n"),
        from: prefix.length,
        to: prefix.length + body.split("\n")[0].length,
      };
    };
    const wrap = (marker: string, fallback: string) => {
      const body = selected || fallback;
      return {
        text: `${marker}${body}${marker}`,
        from: marker.length,
        to: marker.length + body.length,
      };
    };

    let piece: { text: string; from: number; to: number };
    switch (kind) {
      case "h2":
        piece = linePrefix("## ", "Rubrik");
        break;
      case "h3":
        piece = linePrefix("### ", "Rubrik");
        break;
      case "bold":
        piece = wrap("**", "fet text");
        break;
      case "italic":
        piece = wrap("*", "kursiv text");
        break;
      case "list":
        piece = linePrefix("- ", "Punkt");
        break;
      case "quote":
        piece = linePrefix("> ", "Citat");
        break;
      case "link": {
        const body = selected || "länktext";
        piece = {
          text: `[${body}](https://)`,
          from: body.length + 3,
          to: body.length + 11,
        };
        break;
      }
    }

    const blockTool =
      kind === "h2" || kind === "h3" || kind === "list" || kind === "quote";
    const lead = blockTool && start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    patch({
      content: `${value.slice(0, start)}${lead}${piece.text}${value.slice(end)}`,
    });

    const base = start + lead.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(base + piece.from, base + piece.to);
    });
  }

  const seoTitle = draft.seo_title || draft.title;
  const seoDesc = draft.seo_description;
  const titleCount = draft.seo_title.length;
  const descCount = draft.seo_description.length;

  return (
    <div className="animate-[admfade_.22s_ease] grid items-start gap-[18px] lg:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-3">
          <Link
            href="/admin/sidor"
            className="text-[14px] font-semibold text-cyan no-underline hover:no-underline"
          >
            ‹ Alla sidor
          </Link>
          <span className="font-mono-num ml-auto text-[12px] text-dim">
            {saving ? "Sparar …" : `Sparad ${fmtTime(savedAt)}`}
          </span>
        </div>

        <input
          value={draft.title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Sidans titel"
          className="font-display mb-3.5 w-full rounded-[12px] border border-line bg-panel p-4 text-[24px] font-semibold text-text outline-none"
        />

        <div className="overflow-hidden rounded-[14px] border border-line bg-panel">
          <div className="flex flex-wrap items-center gap-1 border-b border-line-soft px-3 py-2.5">
            {TOOLS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => applyTool(t.key)}
                className="h-[30px] min-w-8 rounded-[7px] border border-line bg-transparent px-2.5 text-[12.5px] font-semibold text-text-soft hover:bg-hover2"
              >
                {t.label}
              </button>
            ))}
            <div className="ml-auto flex gap-[3px] rounded-[9px] border border-line-soft bg-bg-soft p-[3px]">
              {(
                [
                  { key: "write", label: "Redigera" },
                  { key: "preview", label: "Förhandsgranska" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-semibold",
                    tab === t.key
                      ? "bg-panel-2 text-text"
                      : "bg-transparent text-muted"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "write" ? (
            <textarea
              ref={textareaRef}
              value={draft.content}
              onChange={(e) => patch({ content: e.target.value })}
              rows={22}
              placeholder="Skriv innehållet i markdown …"
              className="font-mono-num w-full resize-y border-0 bg-transparent p-[18px] text-[13.5px] leading-[1.75] text-text-soft outline-none"
            />
          ) : (
            <div className="prose prose-invert max-w-none px-[26px] py-[22px] text-[#C3CBDB] [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-text [&_a]:text-blue [&_code]:font-mono-num">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {draft.content || "_Inget innehåll ännu._"}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 lg:sticky lg:top-[88px]">
        <div className="rounded-[14px] border border-line bg-panel p-4">
          <div className="font-display mb-3 text-[15px] font-semibold uppercase tracking-[0.06em]">
            Publicering
          </div>

          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex-1 text-[13.5px] text-muted">Status</span>
            <span
              className={cn(
                "rounded-[6px] px-[9px] py-1 text-[10.5px] font-bold tracking-[0.09em]",
                published ? "bg-win/15 text-win" : "bg-panel-2 text-muted"
              )}
            >
              {published ? "PUBLICERAD" : "UTKAST"}
            </span>
          </div>

          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex-1 text-[13.5px] text-text-soft">
              Publicerad
            </span>
            <Switch
              checked={published}
              label="Publicerad"
              onChange={(next) =>
                startTransition(async () => {
                  await persist();
                  await publishPage(page.id, next);
                  setPublished(next);
                  router.refresh();
                })
              }
            />
          </div>

          <button
            type="button"
            disabled={pending || saving}
            onClick={() =>
              startTransition(async () => {
                await persist();
                await publishPage(page.id, true);
                setPublished(true);
                router.refresh();
              })
            }
            className="mb-2 w-full rounded-[10px] bg-win py-3 text-[14.5px] font-bold text-win-ink disabled:opacity-60"
          >
            {published ? "Publicera ändringar" : "Publicera"}
          </button>
          <button
            type="button"
            disabled={pending || saving}
            onClick={() =>
              startTransition(async () => {
                await persist();
              })
            }
            className="w-full rounded-[10px] border border-line-strong bg-panel-2 py-3 text-[14px] font-semibold text-text-soft disabled:opacity-60"
          >
            Spara utkast
          </button>

          <div className="font-mono-num mt-2.5 text-center text-[11.5px] text-dim">
            Senast sparad {fmtTime(savedAt)}
          </div>

          {published ? (
            <a
              href={`/${draft.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 block text-center text-[13px] font-semibold"
            >
              Visa sida ↗
            </a>
          ) : null}
        </div>

        <div className="rounded-[14px] border border-line bg-panel p-4">
          <div className="font-display mb-3 text-[15px] font-semibold uppercase tracking-[0.06em]">
            SEO
          </div>

          <div className="mb-[11px]">
            <div className="mb-1.5 flex justify-between text-[10.5px] uppercase tracking-[0.11em] text-dim">
              <span>SEO-titel</span>
              <span
                className={cn(
                  "font-mono-num",
                  titleCount > 60 ? "text-loss" : "text-dim"
                )}
              >
                {titleCount}/60
              </span>
            </div>
            <input
              value={draft.seo_title}
              onChange={(e) => patch({ seo_title: e.target.value })}
              placeholder={draft.title}
              className="w-full rounded-[9px] border border-line bg-bg-soft px-[11px] py-2.5 text-[13.5px] text-text outline-none"
            />
          </div>

          <div className="mb-[11px]">
            <div className="mb-1.5 flex justify-between text-[10.5px] uppercase tracking-[0.11em] text-dim">
              <span>Metabeskrivning</span>
              <span
                className={cn(
                  "font-mono-num",
                  descCount > 160 ? "text-loss" : "text-dim"
                )}
              >
                {descCount}/160
              </span>
            </div>
            <textarea
              value={draft.seo_description}
              onChange={(e) => patch({ seo_description: e.target.value })}
              rows={3}
              className="w-full resize-y rounded-[9px] border border-line bg-bg-soft px-[11px] py-2.5 text-[13px] leading-[1.5] text-text-soft outline-none"
            />
          </div>

          <div className="mb-3">
            <div className="mb-1.5 text-[10.5px] uppercase tracking-[0.11em] text-dim">
              Slug
            </div>
            <input
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                patch({ slug: slugify(e.target.value) });
              }}
              className="font-mono-num w-full rounded-[9px] border border-line bg-bg-soft px-[11px] py-2.5 text-[12.5px] text-text-soft outline-none"
            />
          </div>

          <div className="rounded-[10px] border border-line-soft bg-bg-soft p-3">
            <div className="mb-[7px] text-[10px] uppercase tracking-[0.11em] text-dim">
              Så här syns sidan i Google
            </div>
            <div className="mb-0.5 text-[15px] leading-[1.3] text-[#8AB4F8]">
              {seoTitle || "Sidans titel"}
            </div>
            <div className="font-mono-num mb-1 text-[12px] text-win">
              spelbok.se/{draft.slug}
            </div>
            <div className="text-[12.5px] leading-[1.45] text-muted">
              {seoDesc || "Lägg till en metabeskrivning för att styra texten i sökresultatet."}
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-line bg-panel p-4">
          <div className="font-display mb-3 text-[15px] font-semibold uppercase tracking-[0.06em]">
            Sidoinställningar
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex-1 text-[13.5px] text-text-soft">
              Visa i footer
            </span>
            <Switch
              checked={draft.show_in_footer}
              label="Visa i footer"
              onChange={(next) => patch({ show_in_footer: next })}
            />
          </div>
        </div>

        <div className="rounded-[12px] border border-[rgba(255,92,108,.35)] bg-[rgba(255,92,108,.09)] p-4">
          <div className="font-display text-[15px] font-semibold uppercase tracking-[0.06em] text-loss">
            Riskzon
          </div>
          <p className="mt-1 text-[13px] text-muted">
            Raderade sidor går inte att återställa.
          </p>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-3 rounded-[9px] border border-[rgba(255,92,108,.35)] bg-transparent px-3.5 py-2 text-[13.5px] font-bold text-loss"
          >
            Radera sida
          </button>
        </div>
      </div>

      {confirmDelete ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(5,7,12,.7)] p-4">
          <div className="w-full max-w-md rounded-[14px] border border-line bg-panel p-5 shadow-[0_40px_90px_rgba(0,0,0,.65)]">
            <div className="font-display text-[18px] font-semibold uppercase tracking-[0.05em]">
              Radera sida?
            </div>
            <p className="mt-2 text-[14px] text-muted">
              {draft.title} · /{draft.slug}
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deletePage(page.id);
                    router.push("/admin/sidor");
                  })
                }
                className="rounded-[9px] bg-loss px-4 py-2.5 text-[13.5px] font-bold text-[#1A0508] disabled:opacity-60"
              >
                Ja, radera
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-[9px] border border-line-strong bg-panel-2 px-4 py-2.5 font-semibold text-text-soft"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
