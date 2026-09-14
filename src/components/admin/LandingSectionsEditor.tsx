"use client";

import type { ReactNode } from "react";
import type { LandingContent, LandingStep } from "@/lib/landing-content";

const fieldClass =
  "w-full rounded-[9px] border border-line bg-bg-soft px-[11px] py-2.5 text-[13.5px] text-text outline-none";
const labelClass =
  "mb-1.5 text-[10.5px] uppercase tracking-[0.11em] text-dim";
const sectionClass =
  "overflow-hidden rounded-[14px] border border-line bg-panel";

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
    <div className={sectionClass}>
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

export function LandingSectionsEditor({
  value,
  onChange,
}: {
  value: LandingContent;
  onChange: (next: LandingContent) => void;
}) {
  function patchHero(partial: Partial<LandingContent["hero"]>) {
    onChange({ ...value, hero: { ...value.hero, ...partial } });
  }

  function patchHow(partial: Partial<LandingContent["howItWorks"]>) {
    onChange({
      ...value,
      howItWorks: { ...value.howItWorks, ...partial },
    });
  }

  function patchStep(index: 0 | 1 | 2, partial: Partial<LandingStep>) {
    const steps = [...value.howItWorks.steps] as LandingContent["howItWorks"]["steps"];
    steps[index] = { ...steps[index], ...partial };
    patchHow({ steps });
  }

  function patchBoard(partial: Partial<LandingContent["leaderboard"]>) {
    onChange({
      ...value,
      leaderboard: { ...value.leaderboard, ...partial },
    });
  }

  function patchCta(partial: Partial<LandingContent["cta"]>) {
    onChange({ ...value, cta: { ...value.cta, ...partial } });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <SectionCard
        title="Hero"
        hint="Rubriken redigeras i titel-fältet ovan. Badge, brödtext, knappar och mockup-bild här."
      >
        <Field label="Badge">
          <input
            value={value.hero.badge}
            onChange={(e) => patchHero({ badge: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="Brödtext">
          <textarea
            value={value.hero.body}
            onChange={(e) => patchHero({ body: e.target.value })}
            rows={3}
            className={`${fieldClass} resize-y leading-[1.5] text-text-soft`}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Primärknapp — text">
            <input
              value={value.hero.primaryCta.label}
              onChange={(e) =>
                patchHero({
                  primaryCta: {
                    ...value.hero.primaryCta,
                    label: e.target.value,
                  },
                })
              }
              className={fieldClass}
            />
          </Field>
          <Field label="Primärknapp — länk">
            <input
              value={value.hero.primaryCta.href}
              onChange={(e) =>
                patchHero({
                  primaryCta: {
                    ...value.hero.primaryCta,
                    href: e.target.value,
                  },
                })
              }
              className={`font-mono-num ${fieldClass} text-[12.5px]`}
            />
          </Field>
          <Field label="Sekundärknapp — text">
            <input
              value={value.hero.secondaryCta.label}
              onChange={(e) =>
                patchHero({
                  secondaryCta: {
                    ...value.hero.secondaryCta,
                    label: e.target.value,
                  },
                })
              }
              className={fieldClass}
            />
          </Field>
          <Field label="Sekundärknapp — länk">
            <input
              value={value.hero.secondaryCta.href}
              onChange={(e) =>
                patchHero({
                  secondaryCta: {
                    ...value.hero.secondaryCta,
                    href: e.target.value,
                  },
                })
              }
              className={`font-mono-num ${fieldClass} text-[12.5px]`}
            />
          </Field>
        </div>
        <Field label="Mockup-bild (sökväg eller URL)">
          <input
            value={value.hero.image}
            onChange={(e) => patchHero({ image: e.target.value })}
            className={`font-mono-num ${fieldClass} text-[12.5px]`}
          />
        </Field>
        <Field label="Bild-alt">
          <input
            value={value.hero.imageAlt}
            onChange={(e) => patchHero({ imageAlt: e.target.value })}
            className={fieldClass}
          />
        </Field>
      </SectionCard>

      <SectionCard title="Så funkar det" hint="Rubrik, ingress och de tre stegen.">
        <Field label="Rubrik">
          <input
            value={value.howItWorks.title}
            onChange={(e) => patchHow({ title: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="Ingress">
          <textarea
            value={value.howItWorks.body}
            onChange={(e) => patchHow({ body: e.target.value })}
            rows={2}
            className={`${fieldClass} resize-y leading-[1.5] text-text-soft`}
          />
        </Field>

        {value.howItWorks.steps.map((s, i) => (
          <div
            key={s.no}
            className="grid gap-3 rounded-[12px] border border-line-soft bg-bg-soft p-3.5"
          >
            <div className="font-display text-[13px] font-semibold tracking-[0.08em] text-win">
              Steg {s.no}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nummer">
                <input
                  value={s.no}
                  onChange={(e) =>
                    patchStep(i as 0 | 1 | 2, { no: e.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Rubrik">
                <input
                  value={s.title}
                  onChange={(e) =>
                    patchStep(i as 0 | 1 | 2, { title: e.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
            </div>
            <Field label="Text">
              <textarea
                value={s.body}
                onChange={(e) =>
                  patchStep(i as 0 | 1 | 2, { body: e.target.value })
                }
                rows={2}
                className={`${fieldClass} resize-y leading-[1.5] text-text-soft`}
              />
            </Field>
            <Field label="Bild (sökväg eller URL)">
              <input
                value={s.img}
                onChange={(e) =>
                  patchStep(i as 0 | 1 | 2, { img: e.target.value })
                }
                className={`font-mono-num ${fieldClass} text-[12.5px]`}
              />
            </Field>
            <Field label="Bild-alt">
              <input
                value={s.alt}
                onChange={(e) =>
                  patchStep(i as 0 | 1 | 2, { alt: e.target.value })
                }
                className={fieldClass}
              />
            </Field>
          </div>
        ))}
      </SectionCard>

      <SectionCard
        title="Topplistan"
        hint="Själva listan hämtas live från publika spreadsheets. Här redigerar du rubrik, ingress och knappen."
      >
        <Field label="Rubrik">
          <input
            value={value.leaderboard.title}
            onChange={(e) => patchBoard({ title: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <Field label="Ingress">
          <input
            value={value.leaderboard.body}
            onChange={(e) => patchBoard({ body: e.target.value })}
            className={fieldClass}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Knapp — text">
            <input
              value={value.leaderboard.ctaLabel}
              onChange={(e) => patchBoard({ ctaLabel: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="Knapp — länk">
            <input
              value={value.leaderboard.ctaHref}
              onChange={(e) => patchBoard({ ctaHref: e.target.value })}
              className={`font-mono-num ${fieldClass} text-[12.5px]`}
            />
          </Field>
        </div>
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
          <textarea
            value={value.cta.body}
            onChange={(e) => patchCta({ body: e.target.value })}
            rows={2}
            className={`${fieldClass} resize-y leading-[1.5] text-text-soft`}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Knapp — text">
            <input
              value={value.cta.buttonLabel}
              onChange={(e) => patchCta({ buttonLabel: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="Knapp — länk">
            <input
              value={value.cta.buttonHref}
              onChange={(e) => patchCta({ buttonHref: e.target.value })}
              className={`font-mono-num ${fieldClass} text-[12.5px]`}
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}
