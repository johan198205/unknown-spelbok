"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function onLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      className="cursor-pointer rounded-[var(--radius-btn-sm)] border border-line-strong bg-transparent px-3 py-[7px] text-[13px] text-muted transition hover:border-line-hover hover:text-text"
    >
      Logga ut
    </button>
  );
}
