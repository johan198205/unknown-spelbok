import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Kontakta Spelbok",
  description:
    "Hör av dig till Spelbok — support, press, annonsering och samarbeten.",
};

const CHANNELS = [
  {
    badge: "@",
    title: "Allmänna frågor och support",
    href: "mailto:hej@spelbok.se",
    label: "hej@spelbok.se",
  },
  {
    badge: "AD",
    title: "Annonsering och samarbeten",
    href: "mailto:partner@spelbok.se",
    label: "partner@spelbok.se",
  },
  {
    badge: "PR",
    title: "Press",
    href: "mailto:press@spelbok.se",
    label: "press@spelbok.se",
  },
  {
    badge: "AB",
    title: "Spelbok Sverige AB",
    href: null as string | null,
    label: null as string | null,
    lines: ["Org.nr 559xxx-xxxx", "Sveavägen 00, 111 00 Stockholm"],
  },
] as const;

export default function KontaktPage() {
  return (
    <div className="animate-sbfade mx-auto grid max-w-[1220px] grid-cols-1 items-start gap-12 px-5 pb-20 pt-[72px] lg:grid-cols-[1fr_1.15fr] lg:gap-16">
      <div>
        <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-win">
          Kontakt
        </p>
        <h1 className="font-display text-[52px] font-semibold leading-[1.05] text-text [text-wrap:balance]">
          Hör av dig.
        </h1>
        <p className="mt-[18px] mb-9 text-[17px] leading-[1.6] text-[#C3CBDB] [text-wrap:pretty]">
          Vi är tre personer och läser allt själva. Vardagar svarar vi inom 24
          timmar, helger lite långsammare — då har vi oftast egna spel att
          rätta.
        </p>

        <div className="flex flex-col">
          {CHANNELS.map((ch, i) => (
            <div
              key={ch.title}
              className={`flex gap-4 border-t border-line-soft py-[18px]${
                i === CHANNELS.length - 1 ? " border-b" : ""
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-line bg-panel font-display text-[12px] text-win">
                {ch.badge}
              </span>
              <div>
                <div className="text-[15.5px] font-semibold text-text">
                  {ch.title}
                </div>
                {ch.href && ch.label ? (
                  <a
                    href={ch.href}
                    className="font-mono-num text-[14px] text-blue no-underline hover:underline"
                  >
                    {ch.label}
                  </a>
                ) : (
                  <div className="mt-0.5 font-mono-num text-[14px] leading-relaxed text-[#8A94AB]">
                    {"lines" in ch &&
                      ch.lines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 flex gap-3.5 rounded-xl border border-line bg-panel px-[18px] py-4">
          <span className="shrink-0 rounded-md border border-line-strong px-2.5 py-1 font-display text-[12px] font-semibold text-[#8A94AB]">
            18+
          </span>
          <p className="text-[13.5px] leading-[1.55] text-[#8A94AB]">
            Behöver du prata med någon om ditt spelande? Vi är inte rätt
            mottagare, men{" "}
            <a
              href="https://www.stodlinjen.se"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stödlinjen
            </a>{" "}
            är det —{" "}
            <span className="font-mono-num text-[#C3CBDB]">
              020-81&nbsp;91&nbsp;00
            </span>
            , gratis och anonymt. Du kan också stänga av dig via{" "}
            <a
              href="https://www.spelpaus.se"
              target="_blank"
              rel="noopener noreferrer"
            >
              Spelpaus
            </a>
            .
          </p>
        </div>
      </div>

      <ContactForm />
    </div>
  );
}
