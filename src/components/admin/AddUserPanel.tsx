"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createUserAccount } from "@/lib/admin/admin-auth";
import { cn } from "@/lib/utils";

/** 14 tecken utan lättförväxlade tecken (0/O, 1/l/I). */
function generatePassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

const field =
  "w-full rounded-[10px] border border-line bg-bg-soft px-3.5 py-2.5 text-[14px] outline-none placeholder:text-dim";

/**
 * Superadmin lägger in ett konto direkt. Admin-konton loggar in på
 * /admin/login, spelbokskonton på /login — inloggningarna är skilda åt.
 */
export function AddUserPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("admin");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    startTransition(async () => {
      const res = await createUserAccount({ email, username, password, role });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setDone(
        role === "admin"
          ? `${email} är skapat som admin och loggar in på /admin/login.`
          : `${email} är skapat och loggar in i spelboken på /login.`
      );
      setEmail("");
      setUsername("");
      setPassword("");
      router.refresh();
    });
  }

  return (
    <div className="mt-8 rounded-[14px] border border-line bg-panel">
      <div className="border-b border-line px-[18px] py-3.5">
        <div className="font-semibold">Lägg till användare</div>
        <div className="mt-0.5 text-[13px] text-muted">
          Kontot skapas direkt och är aktivt. Lämna över e-post och lösenord
          till personen själv.
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 px-[18px] py-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
            E-post
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="namn@exempel.se"
            required
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
            Användarnamn
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="t.ex. johan"
            required
            minLength={3}
            maxLength={30}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
            Lösenord
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minst 8 tecken"
              autoComplete="new-password"
              required
              minLength={8}
              className={cn(field, "font-mono-num")}
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="shrink-0 rounded-[10px] border border-line bg-panel px-3 text-[13px] font-semibold"
            >
              Generera
            </button>
          </div>
        </label>
        <div>
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
            Roll
          </span>
          <div className="flex gap-[7px]">
            {(
              [
                { key: "admin", label: "Admin" },
                { key: "user", label: "Spelboksanvändare" },
              ] as const
            ).map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={cn(
                  "rounded-full border px-3.5 py-2.5 text-[13.5px] font-semibold",
                  role === r.key
                    ? "border-[rgba(102,227,138,.45)] bg-win/15 text-win"
                    : "border-line bg-panel text-text-soft"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[10px] border border-transparent bg-win px-4 py-2.5 text-[14px] font-bold text-win-ink disabled:opacity-50"
          >
            {pending ? "Skapar…" : "Skapa konto"}
          </button>
          {error ? <span className="text-[13px] text-loss">{error}</span> : null}
          {done ? <span className="text-[13px] text-win">{done}</span> : null}
        </div>
      </form>
    </div>
  );
}
