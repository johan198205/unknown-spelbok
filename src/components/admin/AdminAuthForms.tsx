"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import {
  adminSignIn,
  registerAdmin,
  type AdminAuthState,
} from "@/lib/admin/admin-auth";

const initial: AdminAuthState = { error: null };

export function AdminAuthShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-bg-soft px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <div className="font-display text-2xl font-bold tracking-[0.14em]">
            SPELBOK
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Admin
          </div>
        </div>
        <Panel className="p-[26px]">
          <h1 className="mb-1 text-lg font-semibold">{title}</h1>
          <p className="mb-5 text-sm text-muted">{lead}</p>
          {children}
        </Panel>
      </div>
    </div>
  );
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="rounded-[9px] border border-[rgba(255,92,108,.35)] bg-[rgba(255,92,108,.1)] px-3 py-2.5 text-sm text-[#FF8A96]">
      {error}
    </div>
  );
}

export function AdminLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(adminSignIn, initial);

  return (
    <form action={action} className="space-y-3.5">
      <input type="hidden" name="next" value={next} />
      <Input
        label="E-post"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="namn@exempel.se"
        defaultValue={state.email}
        key={state.email}
        required
      />
      <Input
        label="Lösenord"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
      />
      <ErrorBox error={state.error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Vänta…" : "Logga in"}
      </Button>
    </form>
  );
}

export function AdminRegisterForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(registerAdmin, initial);

  return (
    <form action={action} className="space-y-3.5">
      <input type="hidden" name="token" value={token} />
      <Input
        label="E-post"
        type="email"
        value={email}
        autoComplete="username"
        readOnly
        className="text-muted"
      />
      <Input
        label="Användarnamn"
        name="username"
        placeholder="t.ex. johan"
        required
        minLength={3}
        maxLength={30}
      />
      <Input
        label="Lösenord"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Minst 8 tecken"
        required
        minLength={8}
      />
      <ErrorBox error={state.error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Skapar konto…" : "Skapa admininlogg"}
      </Button>
    </form>
  );
}
