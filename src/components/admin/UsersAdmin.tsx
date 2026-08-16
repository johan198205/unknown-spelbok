"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function UsersAdmin({ users }: { users: Profile[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(q.toLowerCase())
  );

  async function setRole(id: string, role: "user" | "admin") {
    const supabase = createClient();
    await supabase.from("profiles").update({ role }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Input
        label="Sök användare"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Användarnamn…"
      />
      <Panel className="overflow-hidden">
        {filtered.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center gap-3 border-b border-line-soft px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{u.username}</div>
              <div className="font-mono-num text-[12px] text-faint">{u.id}</div>
            </div>
            <span className="text-sm text-muted">{u.role}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setRole(u.id, u.role === "admin" ? "user" : "admin")}
            >
              {u.role === "admin" ? "Gör till user" : "Gör till admin"}
            </Button>
          </div>
        ))}
        {!filtered.length ? (
          <div className="px-4 py-8 text-center text-muted">Inga träffar</div>
        ) : null}
      </Panel>
    </div>
  );
}
