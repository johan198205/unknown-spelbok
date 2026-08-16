"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [username, setUsername] = useState(profile.username);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", profile.id);

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Sparat.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Användarnamn"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        minLength={3}
      />
      <Input
        label="Avatar-URL"
        value={avatarUrl}
        onChange={(e) => setAvatarUrl(e.target.value)}
        placeholder="https://…"
      />
      <div className="text-sm text-muted">
        Roll: <span className="text-text">{profile.role}</span>
      </div>
      {message ? <div className="text-sm text-win">{message}</div> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Sparar…" : "Spara"}
      </Button>
    </form>
  );
}
