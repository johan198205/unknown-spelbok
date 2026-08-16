import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("title, seo_title, seo_description")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!data) return { title: "Sidan hittades inte" };
  return {
    title: data.seo_title || data.title,
    description: data.seo_description || undefined,
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;

  // Reserved public routes — handled by dedicated pages
  if (["topplista", "spelbolag", "login", "registrera"].includes(slug)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!page) notFound();

  return (
    <article className="animate-sbfade mx-auto max-w-[760px] px-7 py-12">
      <h1 className="font-display mb-6 text-[40px] font-semibold">{page.title}</h1>
      <div className="prose prose-invert max-w-none text-[#C3CBDB] [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-text [&_a]:text-blue [&_code]:font-mono-num">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.content}</ReactMarkdown>
      </div>
    </article>
  );
}
