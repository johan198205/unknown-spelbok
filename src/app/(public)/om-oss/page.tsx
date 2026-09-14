import Link from "next/link";
import type { Metadata } from "next";
import { fetchAboutPage } from "@/lib/about-content.server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchAboutPage();
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || undefined,
  };
}

export default async function OmOssPage() {
  const page = await fetchAboutPage();

  return (
    <div className="animate-sbfade pb-20">
      <section className="mx-auto max-w-[1220px] px-5 pt-[72px]">
        <div className="max-w-[760px]">
          <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-win">
            {page.eyebrow}
          </p>
          <h1 className="font-display text-[52px] font-semibold leading-[1.05] text-text [text-wrap:balance]">
            {page.headline}
          </h1>
          <p className="mt-5 text-[19px] leading-[1.6] text-[#C3CBDB] [text-wrap:pretty]">
            {page.intro}
          </p>
        </div>
      </section>

      <section className="mx-auto mt-[72px] max-w-[1220px] px-5">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_1.3fr] md:gap-14">
          <div>
            <h2 className="font-display text-[32px] font-semibold leading-[1.1] text-text">
              {page.principlesTitle}
            </h2>
            <p className="mt-3 text-[16px] leading-[1.6] text-[#8A94AB]">
              {page.principlesIntro}
            </p>
          </div>
          <div className="flex flex-col">
            {page.principles.map((p, i) => (
              <div
                key={`${p.n}-${i}`}
                className={cn(
                  "flex gap-5 border-t border-line-soft py-[22px]",
                  i === page.principles.length - 1 && "border-b"
                )}
              >
                <span className="w-7 shrink-0 pt-1 font-mono-num text-[13px] text-[#5D6883]">
                  {p.n}
                </span>
                <div>
                  <h3 className="font-display mb-1.5 text-[20px] font-semibold text-text">
                    {p.title}
                  </h3>
                  <p className="text-[15px] leading-[1.6] text-[#8A94AB]">
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-[72px] max-w-[1220px] px-5">
        <div className="flex flex-col gap-5 rounded-2xl border border-line bg-panel p-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-[28px] font-semibold leading-tight text-text">
              {page.cta.title}
            </h2>
            <p className="mt-1.5 text-[15.5px] text-[#8A94AB]">{page.cta.body}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href={page.cta.primaryHref}
              className="rounded-[10px] bg-win px-6 py-[13px] text-center text-[15px] font-bold text-win-ink no-underline hover:text-win-ink hover:no-underline hover:brightness-105"
            >
              {page.cta.primaryLabel}
            </Link>
            <Link
              href={page.cta.secondaryHref}
              className="rounded-[10px] border border-line-strong bg-panel-2 px-6 py-[13px] text-center text-[15px] font-semibold text-text no-underline hover:text-text hover:no-underline"
            >
              {page.cta.secondaryLabel}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
