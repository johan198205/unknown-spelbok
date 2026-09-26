import { AddUserPanel } from "@/components/admin/AddUserPanel";
import { AdminInvites } from "@/components/admin/AdminInvites";
import { UsersAdminView } from "@/components/admin/UsersAdmin";
import { getAdminInvites } from "@/lib/admin/admin-auth";
import { requireAdmin } from "@/lib/auth";
import { getAdminUsers } from "@/lib/admin/users";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const me = await requireAdmin();
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
        canManageRoles={me.is_superadmin}
      />
      {me.is_superadmin ? (
        <>
          <AddUserPanel />
          <AdminInvites invites={invites} />
        </>
      ) : null}
    </>
  );
}
