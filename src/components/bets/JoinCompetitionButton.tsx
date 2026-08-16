"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function JoinCompetitionButton({
  competitionId,
  joined,
  fullWidth = false,
}: {
  competitionId: string;
  joined: boolean;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (joined) {
      await supabase
        .from("competition_entries")
        .delete()
        .eq("competition_id", competitionId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("competition_entries").insert({
        competition_id: competitionId,
        user_id: user.id,
      });
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <Button
      variant={joined ? "secondary" : "primary"}
      onClick={toggle}
      disabled={loading}
      className={cn(fullWidth && "w-full")}
    >
      {joined ? "Du är med" : "Gå med"}
    </Button>
  );
}
