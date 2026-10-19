"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/TextsProvider";
import type { Profile } from "@/lib/types";

export function SettingsForm({ profile }: { profile: Profile }) {
  const t = useT();
  const router = useRouter();
  const [username, setUsername] = useState(profile.username);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [bio, setBio] = useState(profile.bio || "");
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
        bio: bio.trim() || null,
      })
      .eq("id", profile.id);

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(t("installningar.profile.saved"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label={t("installningar.profile.username")}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        minLength={3}
      />
      <ImageUpload
        bucket="avatars"
        folder={profile.id}
        label={t("installningar.profile.avatar")}
        value={avatarUrl}
        onChange={setAvatarUrl}
        hint={t("installningar.profile.avatarHint")}
      />
      <label className="block space-y-1.5">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
          {t("installningar.profile.bio")}
        </span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 280))}
          rows={3}
          maxLength={280}
          placeholder={t("installningar.profile.bioPlaceholder")}
          className="w-full rounded-[10px] border border-line bg-bg-soft px-3 py-2.5 text-[14px] text-text outline-none focus:border-line-hover"
        />
        <span className="block text-[11px] text-faint">{t("installningar.profile.bioCount", { count: bio.length })}</span>
      </label>
      <div className="text-sm text-muted">
        {t("installningar.profile.role")} <span className="text-text">{profile.role}</span>
      </div>
      {message ? <div className="text-sm text-win">{message}</div> : null}
      <Button type="submit" disabled={loading}>
        {loading ? t("installningar.profile.saving") : t("installningar.profile.save")}
      </Button>
    </form>
  );
}
