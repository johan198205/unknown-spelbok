"use client";

import type { ReactNode } from "react";
import type { ContactChannel, ContactContent } from "@/lib/contact-content";

const fieldClass =
  "w-full rounded-[9px] border border-line bg-bg-soft px-[11px] py-2.5 text-[13.5px] text-text outline-none";
const labelClass =
  "mb-1.5 text-[10.5px] uppercase tracking-[0.11em] text-dim";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className={labelClass}>{label}</div>
      {children}
    </div>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-panel">
      <div className="border-b border-line-soft px-4 py-3">
        <div className="font-display text-[15px] font-semibold uppercase tracking-[0.06em]">
          {title}
        </div>
        {hint ? (
          <p className="mt-1 text-[12.5px] text-muted">{hint}</p>
        ) : null}
      </div>
      <div className="grid gap-3 p-4">{children}</div>
    </div>
  );
}

export function ContactSectionsEditor({
  value,
  onChange,
}: {
  value: ContactContent;
  onChange: (next: ContactContent) => void;
}) {
  function patch(partial: Partial<ContactContent>) {
    onChange({ ...value, ...partial });
  }

  function patchChannel(index: number, partial: Partial<ContactChannel>) {
    const channels = value.channels.map((c, i) =>
      i === index ? { ...c, ...partial } : c
    );
    patch({ channels });
  }

  function addChannel() {
    patch({
      channels: [
        ...value.channels,
        {
          badge: "+",
          title: "Ny kanal",
          href: "mailto:",
          label: "",
          lines: "",
        },
      ],
    });
  }

  function removeChannel(index: number) {
    if (value.channels.length <= 1) return;
    patch({ channels: value.channels.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <SectionCard
        title="Hero"
        hint="Sidans titel-fält ovan används som footerns etikett. Kontaktformuläret till höger på sidan styrs i koden."
      >
        <Field label="Eyebrow">
          <input
            value={value.eyebrow}
            onChange={(e) => patch({ eyebrow: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="Rubrik">
          <input
            value={value.headline}
            onChange={(e) => patch({ headline: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="Ingress">
          <textarea
            value={value.intro}
            onChange={(e) => patch({ intro: e.target.value })}
            rows={4}
            className={`${fieldClass} resize-y leading-[1.5] text-text-soft`}
          />
        </Field>
      </SectionCard>

      <SectionCard
        title="Kontaktkanaler"
        hint="Fyll i länk + etikett för mejl/webb, eller adressrader (en per rad) om länken lämnas tom."
      >
        {value.channels.map((ch, i) => (
          <div
            key={`${ch.badge}-${i}`}
            className="grid gap-3 rounded-[12px] border border-line-soft bg-bg-soft p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-[13px] font-semibold tracking-[0.08em] text-win">
                Kanal {i + 1}
              </div>
              <button
                type="button"
                onClick={() => removeChannel(i)}
                disabled={value.channels.length <= 1}
                className="text-[12.5px] font-semibold text-loss disabled:opacity-40"
              >
                Ta bort
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Badge">
                <input
                  value={ch.badge}
                  onChange={(e) => patchChannel(i, { badge: e.target.value })}
                  className={fieldClass}
                />
              </Field>
              <Field label="Rubrik">
                <input
                  value={ch.title}
                  onChange={(e) => patchChannel(i, { title: e.target.value })}
                  className={fieldClass}
                />
              </Field>
              <Field label="Länk (mailto: / https)">
                <input
                  value={ch.href}
                  onChange={(e) => patchChannel(i, { href: e.target.value })}
                  className={`font-mono-num ${fieldClass} text-[12.5px]`}
                />
              </Field>
              <Field label="Länketikett">
                <input
                  value={ch.label}
                  onChange={(e) => patchChannel(i, { label: e.target.value })}
                  className={fieldClass}
                />
              </Field>
            </div>
            <Field label="Adressrader (om ingen länk)">
              <textarea
                value={ch.lines}
                onChange={(e) => patchChannel(i, { lines: e.target.value })}
                rows={2}
                className={`font-mono-num ${fieldClass} resize-y text-[12.5px] leading-[1.5] text-text-soft`}
              />
            </Field>
          </div>
        ))}

        <button
          type="button"
          onClick={addChannel}
          className="rounded-[9px] border border-line-strong bg-panel-2 px-3.5 py-2.5 text-[13px] font-semibold text-text-soft"
        >
          + Lägg till kanal
        </button>
      </SectionCard>

      <SectionCard
        title="Ansvarsfullt spelande"
        hint="Brödtexten stödjer markdown (länkar, fetstil)."
      >
        <Field label="Badge">
          <input
            value={value.noticeBadge}
            onChange={(e) => patch({ noticeBadge: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="Text">
          <textarea
            value={value.noticeBody}
            onChange={(e) => patch({ noticeBody: e.target.value })}
            rows={4}
            className={`${fieldClass} resize-y leading-[1.5] text-text-soft`}
          />
        </Field>
      </SectionCard>
    </div>
  );
}
