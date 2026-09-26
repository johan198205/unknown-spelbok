import { UsersAdminView } from "@/components/admin/UsersAdmin";
import { getAdminUsers } from "@/lib/admin/users";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { rows, total, page } = await getAdminUsers({
    q: sp.q,
    filter: sp.filter ?? "all",
    page: Number(sp.page || 1),
  });

  return (
    <UsersAdminView
      rows={rows}
      total={total}
      page={page}
      q={sp.q ?? ""}
      filter={sp.filter ?? "all"}
    />
  );
}
