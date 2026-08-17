import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PushBroadcastForm } from "@/components/admin/PushBroadcastForm";

export const metadata = { title: "Notiser" };

export default async function AdminPushPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold">Notiser</h1>
        <p className="text-muted">
          Skicka ett push-meddelande till alla som aktiverat notiser.
        </p>
      </div>
      <PushBroadcastForm initialCount={error ? 0 : (count ?? 0)} />
    </div>
  );
}
