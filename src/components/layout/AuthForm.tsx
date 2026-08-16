"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { createClient } from "@/lib/supabase/client";

function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/hem";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      if (mode === "register") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username.trim() },
          },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <div className="font-display text-2xl font-bold tracking-[0.14em]">
            SPELBOK
          </div>
        </div>
        <Panel className="p-[26px]">
          <div className="mb-5 flex gap-1 rounded-[10px] border border-line-soft bg-bg-soft p-1">
            <Link
              href="/login"
              className={`flex-1 rounded-[7px] px-2 py-2.5 text-center text-sm font-semibold no-underline ${
                mode === "login"
                  ? "bg-panel-2 text-text"
                  : "text-muted hover:text-text"
              }`}
            >
              Logga in
            </Link>
            <Link
              href="/registrera"
              className={`flex-1 rounded-[7px] px-2 py-2.5 text-center text-sm font-semibold no-underline ${
                mode === "register"
                  ? "bg-panel-2 text-text"
                  : "text-muted hover:text-text"
              }`}
            >
              Registrera
            </Link>
          </div>

          <form onSubmit={onSubmit} className="space-y-3.5">
            {mode === "register" ? (
              <Input
                label="Användarnamn"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="t.ex. valuejagaren"
                required
                minLength={3}
              />
            ) : null}
            <Input
              label="E-post"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namn@exempel.se"
              required
            />
            <Input
              label="Lösenord"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />

            {error ? (
              <div className="rounded-[9px] border border-[rgba(255,92,108,.35)] bg-[rgba(255,92,108,.1)] px-3 py-2.5 text-sm text-[#FF8A96]">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Vänta…"
                : mode === "login"
                  ? "Logga in"
                  : "Skapa konto"}
            </Button>
          </form>
        </Panel>
        <div className="mt-[18px] text-center">
          <Link href="/">Tillbaka till startsidan</Link>
        </div>
      </div>
    </div>
  );
}

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-20 font-mono-num text-faint">
          LADDAR …
        </div>
      }
    >
      <AuthForm mode={mode} />
    </Suspense>
  );
}
