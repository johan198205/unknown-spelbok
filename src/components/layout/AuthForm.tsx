"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { track } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";

/** Googles logotyp — måste vara flerfärgad enligt deras varumärkesregler. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/hem";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // /auth/callback skickar tillbaka hit med ?error= när OAuth misslyckas.
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onGoogle() {
    setError(null);
    setGoogleLoading(true);
    const supabase = createClient();

    const callback = new URL("/auth/callback", window.location.origin);
    if (next !== "/hem") callback.searchParams.set("next", next);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        // Utan detta loggas man tyst in på det Google-konto webbläsaren
        // redan har, vilket är fel så fort någon har flera konton.
        queryParams: { prompt: "select_account" },
      },
    });

    // Vid succé lämnar webbläsaren sidan, så hit når vi bara om det gick fel.
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  }

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
        track({ event: "sign_up", method: "password" });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        track({ event: "login", method: "password" });
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
              href={next !== "/hem" ? `/login?next=${encodeURIComponent(next)}` : "/login"}
              className={`flex-1 rounded-[7px] px-2 py-2.5 text-center text-sm font-semibold no-underline ${
                mode === "login"
                  ? "bg-panel-2 text-text"
                  : "text-muted hover:text-text"
              }`}
            >
              Logga in
            </Link>
            <Link
              href={
                next !== "/hem"
                  ? `/registrera?next=${encodeURIComponent(next)}`
                  : "/registrera"
              }
              className={`flex-1 rounded-[7px] px-2 py-2.5 text-center text-sm font-semibold no-underline ${
                mode === "register"
                  ? "bg-panel-2 text-text"
                  : "text-muted hover:text-text"
              }`}
            >
              Registrera
            </Link>
          </div>

          {/* Google först: det är den snabba vägen in för de flesta.
              Egen knapp istället för <Button> — Googles vita platta med
              mörk text går tvärtemot varenda variant i knappkomponenten. */}
          <button
            type="button"
            onClick={onGoogle}
            disabled={googleLoading || loading}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[9px] border border-transparent bg-white px-4 py-2.5 text-[14.5px] font-semibold text-[#1F1F1F] transition hover:bg-[#F1F3F4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleIcon />
            {googleLoading
              ? "Öppnar Google …"
              : mode === "login"
                ? "Logga in med Google"
                : "Fortsätt med Google"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line-soft" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
              eller
            </span>
            <div className="h-px flex-1 bg-line-soft" />
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

            <Button
              type="submit"
              className="w-full"
              disabled={loading || googleLoading}
            >
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
