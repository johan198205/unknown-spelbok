import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { IntroPageSlug } from "@/lib/page-intro";
import { fetchPageIntro } from "@/lib/page-intro.server";
import { cn } from "@/lib/utils";

/**
 * H1 + kort introduktion högst upp på en undersida. Text och synlighet
 * styrs i admin → Sidor. Avstängd = ingenting renderas.
 */
export async function PageIntro({
  slug,
  className,
  align = "left",
}: {
  slug: IntroPageSlug;
  className?: string;
  align?: "left" | "center";
}) {
  const intro = await fetchPageIntro(slug);
  if (!intro.show || (!intro.headline.trim() && !intro.intro.trim())) {
    return null;
  }

  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {intro.headline.trim() ? (
        <h1 className="font-display text-[28px] font-semibold leading-tight lg:text-[34px]">
          {intro.headline}
        </h1>
      ) : null}
      {intro.intro.trim() ? (
        <p
          className={cn(
            "mt-1.5 max-w-[68ch] whitespace-pre-line text-[14.5px] leading-relaxed text-muted lg:text-[15px]",
            align === "center" && "mx-auto"
          )}
        >
          {intro.intro}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Den längre texten under sidans innehåll (SEO-text). Markdown: ## och ###
 * blir rubriker, - blir punktlistor och > blir en faktaruta.
 */
export async function PageBodyContent({
  slug,
  className,
}: {
  slug: IntroPageSlug;
  className?: string;
}) {
  const intro = await fetchPageIntro(slug);
  if (!intro.body.trim()) return null;

  return (
    <section
      className={cn(
        "mx-auto max-w-[820px] border-t border-line-soft pt-8 text-[15px] leading-[1.7] text-text-soft",
        "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:text-text first:[&_h2]:mt-0",
        "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-[19px] [&_h3]:font-semibold [&_h3]:text-text",
        "[&_p]:my-3 [&_a]:text-win [&_a]:underline [&_strong]:text-text",
        "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
        "[&_blockquote]:my-5 [&_blockquote]:rounded-[12px] [&_blockquote]:border [&_blockquote]:border-win/30 [&_blockquote]:bg-win/[.06] [&_blockquote]:px-5 [&_blockquote]:py-1",
        "[&_table]:my-4 [&_table]:w-full [&_table]:text-[14px] [&_td]:border-b [&_td]:border-line-soft [&_td]:py-2 [&_th]:border-b [&_th]:border-line [&_th]:py-2 [&_th]:text-left [&_th]:text-text",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro.body}</ReactMarkdown>
    </section>
  );
}
