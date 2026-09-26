import { notFound } from "next/navigation";
import { PageEditor } from "@/components/admin/PageEditor";
import { getPage } from "@/lib/admin/pages";

export default async function AdminPageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getPage(id);
  if (!page) notFound();

  return <PageEditor page={page} />;
}
