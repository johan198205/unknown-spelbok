"use client";

import type { ReactNode } from "react";
import type { AboutContent, AboutPrinciple } from "@/lib/about-content";

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

export function AboutSectionsEditor({
  value,
  onChange,
}: {
  value: AboutContent;
  onChange: (next: AboutContent) => void;
}) {
  function patch(partial: Partial<AboutContent>) {
    onChange({ ...value, ...partial });
  }

  function patchCta(partial: Partial<AboutContent["cta"]>) {
    onChange({ ...value, cta: { ...value.cta, ...partial } });
  }

  function patchPrinciple(index: number, partial: Partial<AboutPrinciple>) {
    const principles = value.principles.map((p, i) =>
      i === index ? { ...p, ...partial } : p
    );
    patch({ principles });
  }

  function addPrinciple() {
    const n = String(value.principles.length + 1).padStart(2, "0");
    patch({
      principles: [
        ...value.principles,
        { n, title: "Ny princip", body: "" },
      ],
    });
  }

  function removePrinciple(index: number) {
    if (value.principles.length <= 1) return;
    patch({ principles: value.principles.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <SectionCard
        title="Hero"
        hint="Sidans titel-fält ovan används som footerns etikett (t.ex. Om oss)."
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

      <SectionCard title="Principer">
        <Field label="Sektionsrubrik">
          <input
            value={value.principlesTitle}
            onChange={(e) => patch({ principlesTitle: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="Sektionsingress">
          <textarea
            value={value.principlesIntro}
            onChange={(e) => patch({ principlesIntro: e.target.value })}
            rows={2}
            className={`${fieldClass} resize-y leading-[1.5] text-text-soft`}
          />
        </Field>

        {value.principles.map((p, i) => (
          <div
            key={`${p.n}-${i}`}
            className="grid gap-3 rounded-[12px] border border-line-soft bg-bg-soft p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-[13px] font-semibold tracking-[0.08em] text-win">
                Princip {p.n || i + 1}
              </div>
              <button
                type="button"
                onClick={() => removePrinciple(i)}
                disabled={value.principles.length <= 1}
                className="text-[12.5px] font-semibold text-loss disabled:opacity-40"
              >
                Ta bort
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nummer">
                <input
                  value={p.n}
                  onChange={(e) => patchPrinciple(i, { n: e.target.value })}
                  className={fieldClass}
                />
              </Field>
              <Field label="Rubrik">
                <input
                  value={p.title}
                  onChange={(e) => patchPrinciple(i, { title: e.target.value })}
                  className={fieldClass}
                />
              </Field>
            </div>
            <Field label="Text">
              <textarea
                value={p.body}
                onChange={(e) => patchPrinciple(i, { body: e.target.value })}
                rows={3}
                className={`${fieldClass} resize-y leading-[1.5] text-text-soft`}
              />
            </Field>
          </div>
        ))}

        <button
          type="button"
          onClick={addPrinciple}
          className="rounded-[9px] border border-line-strong bg-panel-2 px-3.5 py-2.5 text-[13px] font-semibold text-text-soft"
        >
          + Lägg till princip
        </button>
      </SectionCard>

      <SectionCard title="Avslutande CTA">
        <Field label="Rubrik">
          <input
            value={value.cta.title}
            onChange={(e) => patchCta({ title: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="Text">
          <input
            value={value.cta.body}
            onChange={(e) => patchCta({ body: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Primärknapp — text">
            <input
              value={value.cta.primaryLabel}
              onChange={(e) => patchCta({ primaryLabel: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="Primärknapp — länk">
            <input
              value={value.cta.primaryHref}
              onChange={(e) => patchCta({ primaryHref: e.target.value })}
              className={`font-mono-num ${fieldClass} text-[12.5px]`}
            />
          </Field>
          <Field label="Sekundärknapp — text">
            <input
              value={value.cta.secondaryLabel}
              onChange={(e) => patchCta({ secondaryLabel: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="Sekundärknapp — länk">
            <input
              value={value.cta.secondaryHref}
              onChange={(e) => patchCta({ secondaryHref: e.target.value })}
              className={`font-mono-num ${fieldClass} text-[12.5px]`}
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}
