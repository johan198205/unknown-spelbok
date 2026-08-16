import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-bg-soft text-text">
      <AdminSidebar
        username={profile.username}
        avatarUrl={profile.avatar_url}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          username={profile.username}
          avatarUrl={profile.avatar_url}
        />
        <div className="w-full max-w-[1560px] flex-1 px-7 pb-14 pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
