"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { RuleEditor } from "@/components/admin/RuleEditor";
import { SIGNAL_BET_TYPES, SIGNAL_SPORTS } from "@/lib/signals/fields";
import type { SignalConditions } from "@/lib/signals/evaluate";
import type { SignalRule } from "@/lib/types";

function conditionCount(conditions: SignalRule["conditions"]) {
  const all = (conditions as SignalConditions | null)?.all;
  return Array.isArray(all) ? all.length : 0;
}

function label(list: readonly { value: string; label: string }[], value: string) {
  return list.find((item) => item.value === value)?.label ?? value;
}

function updatedLabel(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RulesAdmin({ initialRules }: { initialRules: SignalRule[] }) {
  const [rules, setRules] = useState(initialRules);
  const [editing, setEditing] = useState<SignalRule | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upsert = useCallback((rule: SignalRule) => {
    setRules((prev) => {
      const index = prev.findIndex((r) => r.id === rule.id);
      if (index === -1) return [rule, ...prev];
      const next = [...prev];
      next[index] = rule;
      return next;
    });
  }, []);

  /**
   * Aktiv-toggeln slår om optimistiskt. Misslyckas PATCH:en rullas den
   * tillbaka — en regel som ser aktiv ut men inte är det vore värre än en
   * halv sekunds fördröjning.
   */
  async function toggleActive(rule: SignalRule) {
    const next = !rule.active;
    setBusy(rule.id);
    setError(null);
    upsert({ ...rule, active: next });
    try {
      const res = await fetch(`/api/admin/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        upsert(rule);
        setError(json.error ?? "Kunde inte uppdatera regeln");
        return;
      }
      upsert(json.rule as SignalRule);
    } catch {
      upsert(rule);
      setError("Kunde inte uppdatera regeln");
    } finally {
      setBusy(null);
    }
  }

  if (editing) {
    return (
      <RuleEditor
        rule={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(rule) => {
          upsert(rule);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-muted">
          {rules.length} regler · {rules.filter((r) => r.active).length} aktiva
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 inline size-4" />
          Ny regel
        </Button>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-panel)] border border-loss/35 bg-loss/10 px-4 py-3 text-sm text-loss">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-panel">
        <table className="w-full min-w-[760px] text-left text-[13.5px]">
          <thead className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Namn</th>
              <th className="px-4 py-3 font-semibold">Spelform</th>
              <th className="px-4 py-3 font-semibold">Sport</th>
              <th className="px-4 py-3 font-semibold">Vikt</th>
              <th className="px-4 py-3 font-semibold">Villkor</th>
              <th className="px-4 py-3 font-semibold">Ändrad</th>
              <th className="px-4 py-3 font-semibold">Aktiv</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr
                key={rule.id}
                className="border-b border-line-row last:border-0 hover:bg-hover"
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setEditing(rule)}
                    className="font-semibold text-text hover:text-cyan"
                  >
                    {rule.name}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <Badge tone="cyan">
                    {label(SIGNAL_BET_TYPES, rule.bet_type)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted">
                  {label(SIGNAL_SPORTS, rule.sport)}
                </td>
                <td className="px-4 py-3 font-mono-num">{rule.weight}</td>
                <td className="px-4 py-3 font-mono-num text-muted">
                  {conditionCount(rule.conditions)}
                </td>
                <td className="px-4 py-3 text-[12.5px] text-faint">
                  {updatedLabel(rule.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <Switch
                    size="sm"
                    checked={rule.active}
                    disabled={busy === rule.id}
                    label={`${rule.active ? "Inaktivera" : "Aktivera"} ${rule.name}`}
                    onChange={() => toggleActive(rule)}
                  />
                </td>
              </tr>
            ))}
            {!rules.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Inga regler ännu. Seed-reglerna kommer med
                  db/signal-rules.sql.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="px-1 text-[12px] leading-snug text-faint">
        Regler går inte att radera — historiska förslag refererar dem i sina
        skäl. Inaktivera i stället.
      </p>
    </div>
  );
}
