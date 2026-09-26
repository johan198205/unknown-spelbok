import { AdminInvites } from "@/components/admin/AdminInvites";
import { UsersAdminView } from "@/components/admin/UsersAdmin";
import { getAdminInvites } from "@/lib/admin/admin-auth";
import { getAdminUsers } from "@/lib/admin/users";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const [{ rows, total, page }, invites] = await Promise.all([
    getAdminUsers({
      q: sp.q,
      filter: sp.filter ?? "all",
      page: Number(sp.page || 1),
    }),
    getAdminInvites(),
  ]);

  return (
    <>
      <UsersAdminView
        rows={rows}
        total={total}
        page={page}
        q={sp.q ?? ""}
        filter={sp.filter ?? "all"}
      />
      <AdminInvites invites={invites} />
    </>
  );
}
