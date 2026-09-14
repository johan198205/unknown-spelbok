import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ContactForm } from "@/components/contact/ContactForm";
import { fetchContactPage } from "@/lib/contact-content";

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchContactPage();
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || undefined,
  };
}

export default async function KontaktPage() {
  const page = await fetchContactPage();

  return (
    <div className="animate-sbfade mx-auto grid max-w-[1220px] grid-cols-1 items-start gap-12 px-5 pb-20 pt-[72px] lg:grid-cols-[1fr_1.15fr] lg:gap-16">
      <div>
        <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-win">
          {page.eyebrow}
        </p>
        <h1 className="font-display text-[52px] font-semibold leading-[1.05] text-text [text-wrap:balance]">
          {page.headline}
        </h1>
        <p className="mt-[18px] mb-9 text-[17px] leading-[1.6] text-[#C3CBDB] [text-wrap:pretty]">
          {page.intro}
        </p>

        <div className="flex flex-col">
          {page.channels.map((ch, i) => {
            const lines = ch.lines
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);
            const hasLink = Boolean(ch.href && ch.label);

            return (
              <div
                key={`${ch.title}-${i}`}
                className={`flex gap-4 border-t border-line-soft py-[18px]${
                  i === page.channels.length - 1 ? " border-b" : ""
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-line bg-panel font-display text-[12px] text-win">
                  {ch.badge}
                </span>
                <div>
                  <div className="text-[15.5px] font-semibold text-text">
                    {ch.title}
                  </div>
                  {hasLink ? (
                    <a
                      href={ch.href}
                      className="font-mono-num text-[14px] text-blue no-underline hover:underline"
                    >
                      {ch.label}
                    </a>
                  ) : (
                    <div className="mt-0.5 font-mono-num text-[14px] leading-relaxed text-[#8A94AB]">
                      {lines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-7 flex gap-3.5 rounded-xl border border-line bg-panel px-[18px] py-4">
          <span className="shrink-0 rounded-md border border-line-strong px-2.5 py-1 font-display text-[12px] font-semibold text-[#8A94AB]">
            {page.noticeBadge}
          </span>
          <div className="prose prose-invert max-w-none text-[13.5px] leading-[1.55] text-[#8A94AB] [&_a]:text-blue [&_p]:m-0 [&_strong]:font-mono-num [&_strong]:font-normal [&_strong]:text-[#C3CBDB]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {page.noticeBody}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      <ContactForm />
    </div>
  );
}
