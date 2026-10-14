"use client";

import { Switch } from "@/components/ui/Switch";
import type { PageIntroContent } from "@/lib/page-intro";

const fieldClass =
  "w-full rounded-[9px] border border-line bg-bg-soft px-[11px] py-2.5 text-[13.5px] text-text outline-none";
const labelClass =
  "mb-1.5 text-[10.5px] uppercase tracking-[0.11em] text-dim";

export function IntroSectionsEditor({
  value,
  onChange,
  showBody = true,
}: {
  value: PageIntroContent;
  onChange: (next: PageIntroContent) => void;
  showBody?: boolean;
}) {
  function patch(partial: Partial<PageIntroContent>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="grid gap-3.5">
      <div className="overflow-hidden rounded-[14px] border border-line bg-panel">
        <div className="flex items-center gap-3 border-b border-line-soft px-4 py-3">
          <div className="flex-1">
            <div className="font-display text-[15px] font-semibold uppercase tracking-[0.06em]">
              Rubrik och intro
            </div>
            <p className="mt-1 text-[12.5px] text-muted">
              Högst upp på sidan: H1 och en kort, lättläst introduktion.
            </p>
          </div>
          <Switch
            checked={value.show}
            label="Visa rubrik och intro"
            onChange={(next) => patch({ show: next })}
          />
        </div>
        <div className="grid gap-3 p-4">
          <div>
            <div className={labelClass}>Rubrik (H1)</div>
            <input
              value={value.headline}
              onChange={(e) => patch({ headline: e.target.value })}
              className={fieldClass}
            />
          </div>
          <div>
            <div className={labelClass}>Introduktion</div>
            <textarea
              value={value.intro}
              onChange={(e) => patch({ intro: e.target.value })}
              rows={3}
              className={`${fieldClass} resize-y leading-[1.5]`}
            />
          </div>
        </div>
      </div>

      {showBody ? (
        <div className="overflow-hidden rounded-[14px] border border-line bg-panel">
          <div className="border-b border-line-soft px-4 py-3">
            <div className="font-display text-[15px] font-semibold uppercase tracking-[0.06em]">
              Text under innehållet
            </div>
            <p className="mt-1 text-[12.5px] text-muted">
              Längre SEO-text längst ner på sidan, i markdown.{" "}
              <code className="font-mono-num">## Rubrik</code> blir H2,{" "}
              <code className="font-mono-num">### Rubrik</code> H3,{" "}
              <code className="font-mono-num">- punkt</code> en punktlista och{" "}
              <code className="font-mono-num">&gt; text</code> en faktaruta.
              Tomt fält = ingen sektion.
            </p>
          </div>
          <textarea
            value={value.body}
            onChange={(e) => patch({ body: e.target.value })}
            rows={18}
            placeholder={"## Så väljer du spelbolag\n\nSkriv texten här …"}
            className="font-mono-num w-full resize-y border-0 bg-transparent p-[18px] text-[13.5px] leading-[1.75] text-text-soft outline-none"
          />
        </div>
      ) : null}
    </div>
  );
}
