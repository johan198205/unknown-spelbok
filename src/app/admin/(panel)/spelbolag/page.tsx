import { BookmakersAdmin } from "@/components/admin/BookmakersAdmin";
import { getBookmakersWithClicks } from "@/lib/admin/bookmakers";

export default async function AdminBookmakersPage() {
  const items = await getBookmakersWithClicks();

  return <BookmakersAdmin items={items} />;
}
