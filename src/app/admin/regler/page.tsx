import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { RulesAdmin } from "@/components/admin/RulesAdmin";
import type { SignalRule } from "@/lib/types";

export const metadata = { title: "Signalregler" };

export default async function AdminRulesPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("signal_rules")
    .select("*")
    .is("user_id", null)
    .order("updated_at", { ascending: false });

  // Migrationen kanske inte är körd — sidan ska säga det, inte krascha.
  const rules = error ? [] : ((data ?? []) as SignalRule[]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold">Signalregler</h1>
        <p className="text-muted">
          Statistiska matchsignaler som förstärker dagens förslag. Reglerna är
          data — de träder i kraft utan deploy.
        </p>
      </div>
      {error ? (
        <div className="rounded-[var(--radius-panel)] border border-loss/35 bg-loss/10 px-4 py-3 text-sm text-loss">
          Kunde inte läsa reglerna: {error.message}. Är db/signal-rules.sql körd?
        </div>
      ) : null}
      <RulesAdmin initialRules={JSON.parse(JSON.stringify(rules))} />
    </div>
  );
}
