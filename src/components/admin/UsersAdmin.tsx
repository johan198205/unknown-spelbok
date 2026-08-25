"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  setUserBanned,
  setUserRole,
  getUserDetail,
  type AdminUserRow,
} from "@/lib/admin/users";
import { formatPick } from "@/lib/picks";
import { cn, formatMoney, initialOf } from "@/lib/utils";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE");
}

function fmtSeen(iso: string | null) {
  if (!iso) return "–";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `för ${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `för ${hours} tim`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "igår";
  return `${days} dagar`;
}

export function UsersAdminView({
  rows,
  total,
  page,
  q,
  filter,
}: {
  rows: AdminUserRow[];
  total: number;
  page: number;
  q: string;
  filter: string;
}) {
  const router = useRouter();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [slideId, setSlideId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | {
    type: "role" | "ban";
    user: AdminUserRow;
    nextRole?: "user" | "admin";
    nextBanned?: boolean;
  }>(null);
  const [pending, startTransition] = useTransition();
  const pageSize = 20;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  useEffect(() => {
    function onDoc() {
      setMenuId(null);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  function navigate(patch: Record<string, string>) {
    const sp = new URLSearchParams();
    const next = {
      q,
      filter,
      page: String(page),
      ...patch,
    };
    if (next.q) sp.set("q", next.q);
    if (next.filter && next.filter !== "all") sp.set("filter", next.filter);
    if (next.page && next.page !== "1") sp.set("page", next.page);
    router.push(`/admin/anvandare?${sp.toString()}`);
  }

  const chips = [
    { key: "all", label: "Alla" },
    { key: "admins", label: "Admins" },
    { key: "banned", label: "Avstängda" },
  ];

  return (
    <div className="animate-[admfade_.22s_ease]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="text-[14px] text-muted">
          <span className="font-mono-num font-semibold text-text">
            {total.toLocaleString("sv-SE")}
          </span>{" "}
          registrerade konton
        </div>
        <div className="ml-3.5 flex flex-wrap gap-[7px]">
          {chips.map((c) => {
            const on = filter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => navigate({ filter: c.key, page: "1" })}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-[13.5px] font-semibold",
                  on
                    ? "border-[rgba(102,227,138,.45)] bg-win/15 text-win"
                    : "border-line bg-panel text-text-soft"
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <form
          className="ml-auto"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            navigate({ q: String(fd.get("q") || ""), page: "1" });
          }}
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Sök användarnamn eller e-post…"
            className="w-[260px] rounded-[10px] border border-line bg-panel px-3.5 py-2.5 text-[14px] outline-none placeholder:text-dim"
          />
        </form>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-line bg-panel">
        <div className="flex min-w-[960px] gap-3 border-b border-line bg-bg-soft px-[18px] py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span className="min-w-[220px] flex-[1.6]">Användare</span>
          <span className="w-[100px] shrink-0">Roll</span>
          <span className="w-[110px] shrink-0">Registrerad</span>
          <span className="w-[110px] shrink-0">Senast aktiv</span>
          <span className="w-[70px] shrink-0 text-right">Spel</span>
          <span className="w-[110px] shrink-0 text-right">Netto</span>
          <span className="w-[110px] shrink-0">Status</span>
          <span className="w-[34px] shrink-0" />
        </div>

        {rows.map((u) => {
          const isAdmin = u.role === "admin";
          return (
            <div
              key={u.id}
              className="relative flex min-w-[960px] items-center gap-3 border-b border-rowline px-[18px] py-3.5 transition hover:bg-hover"
            >
              <button
                type="button"
                onClick={() => setSlideId(u.id)}
                className="flex min-w-[220px] flex-[1.6] cursor-pointer items-center gap-[11px] border-0 bg-transparent p-0 text-left"
              >
                <span className="font-display flex size-[34px] shrink-0 items-center justify-center rounded-full border border-line-strong bg-panel-2 font-semibold">
                  {initialOf(u.username)}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{u.username}</div>
                  <div className="truncate text-[12.5px] text-dim">{u.email}</div>
                </div>
              </button>
              <span className="w-[100px] shrink-0">
                <span
                  className={cn(
                    "rounded-[6px] px-[9px] py-1 text-[10.5px] font-bold tracking-[0.09em]",
                    isAdmin
                      ? "bg-yellow/15 text-yellow"
                      : "bg-panel-2 text-muted"
                  )}
                >
                  {isAdmin ? "ADMIN" : "USER"}
                </span>
              </span>
              <span className="font-mono-num w-[110px] shrink-0 text-[12.5px] text-text-soft">
                {fmtDate(u.created_at)}
              </span>
              <span className="font-mono-num w-[110px] shrink-0 text-[12.5px] text-muted">
                {fmtSeen(u.last_seen_at)}
              </span>
              <span className="font-mono-num w-[70px] shrink-0 text-right text-text-soft">
                {u.bets.toLocaleString("sv-SE")}
              </span>
              <span
                className={cn(
                  "font-mono-num w-[110px] shrink-0 text-right font-semibold",
                  u.netto > 0
                    ? "text-win"
                    : u.netto < 0
                      ? "text-loss"
                      : "text-muted"
                )}
              >
                {formatMoney(u.netto)}
              </span>
              <span
                className={cn(
                  "inline-flex w-[110px] shrink-0 items-center gap-[7px] text-[13px]",
                  u.banned ? "text-loss" : "text-win"
                )}
              >
                <span
                  className={cn(
                    "size-[7px] rounded-full",
                    u.banned ? "bg-loss" : "bg-win"
                  )}
                />
                {u.banned ? "Avstängd" : "Aktiv"}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuId(menuId === u.id ? null : u.id);
                }}
                className="h-[30px] w-[34px] shrink-0 rounded-lg border border-line bg-transparent text-[14px] text-muted"
              >
                ⋯
              </button>
              {menuId === u.id ? (
                <div
                  className="absolute right-[18px] top-11 z-30 min-w-[200px] rounded-[11px] border border-line-strong bg-panel-elevated p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.55)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    href={`/profil/${u.username}`}
                    className="block rounded-[7px] px-[11px] py-[9px] text-[13.5px] font-semibold text-text no-underline hover:bg-hover2"
                  >
                    Visa profil
                  </Link>
                  <button
                    type="button"
                    className="w-full rounded-[7px] px-[11px] py-[9px] text-left text-[13.5px] font-semibold hover:bg-hover2"
                    onClick={() => {
                      setMenuId(null);
                      setConfirm({
                        type: "role",
                        user: u,
                        nextRole: isAdmin ? "user" : "admin",
                      });
                    }}
                  >
                    {isAdmin ? "Ta bort admin" : "Gör till admin"}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-[7px] px-[11px] py-[9px] text-left text-[13.5px] font-semibold hover:bg-hover2",
                      !u.banned && "text-loss"
                    )}
                    onClick={() => {
                      setMenuId(null);
                      setConfirm({
                        type: "ban",
                        user: u,
                        nextBanned: !u.banned,
                      });
                    }}
                  >
                    {u.banned ? "Aktivera konto" : "Stäng av konto"}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}

        {!rows.length ? (
          <div className="px-[18px] py-10 text-center text-muted">
            Inga användare matchar.
          </div>
        ) : null}

        <div className="flex items-center justify-between px-[18px] py-3.5">
          <span className="font-mono-num text-[12.5px] text-dim">
            Visar {total ? from : 0}–{to} av {total.toLocaleString("sv-SE")}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => navigate({ page: String(page - 1) })}
              className="rounded-[9px] border border-line bg-panel px-3.5 py-2 font-semibold text-muted disabled:opacity-40"
            >
              Föregående
            </button>
            <button
              type="button"
              disabled={to >= total}
              onClick={() => navigate({ page: String(page + 1) })}
              className="rounded-[9px] border border-line bg-panel px-3.5 py-2 font-semibold disabled:opacity-40"
            >
              Nästa
            </button>
          </div>
        </div>
      </div>

      {slideId ? (
        <UserSlideOver
          userId={slideId}
          onClose={() => setSlideId(null)}
          onConfirmRole={(user, nextRole) =>
            setConfirm({ type: "role", user, nextRole })
          }
          onConfirmBan={(user, nextBanned) =>
            setConfirm({ type: "ban", user, nextBanned })
          }
        />
      ) : null}

      {confirm ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(5,7,12,.7)] p-4">
          <div className="w-full max-w-md rounded-[14px] border border-line bg-panel p-5 shadow-[0_40px_90px_rgba(0,0,0,.65)]">
            <div className="font-display text-[18px] font-semibold uppercase tracking-[0.05em]">
              {confirm.type === "role"
                ? confirm.nextRole === "admin"
                  ? "Gör till admin?"
                  : "Ta bort admin?"
                : confirm.nextBanned
                  ? "Stäng av konto?"
                  : "Aktivera konto?"}
            </div>
            <p className="mt-2 text-[14px] text-muted">
              {confirm.user.username} · {confirm.user.email}
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    if (confirm.type === "role" && confirm.nextRole) {
                      await setUserRole(confirm.user.id, confirm.nextRole);
                    } else if (
                      confirm.type === "ban" &&
                      confirm.nextBanned != null
                    ) {
                      await setUserBanned(
                        confirm.user.id,
                        confirm.nextBanned
                      );
                    }
                    setConfirm(null);
                    router.refresh();
                  });
                }}
                className="rounded-[9px] bg-amber px-4 py-2.5 text-[13.5px] font-bold text-[#08140C]"
              >
                Ja, fortsätt
              </button>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-[9px] border border-line-strong bg-panel-2 px-4 py-2.5 font-semibold text-text-soft"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UserSlideOver({
  userId,
  onClose,
  onConfirmRole,
  onConfirmBan,
}: {
  userId: string;
  onClose: () => void;
  onConfirmRole: (user: AdminUserRow, nextRole: "user" | "admin") => void;
  onConfirmBan: (user: AdminUserRow, nextBanned: boolean) => void;
}) {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getUserDetail>
  > | null>(null);

  useEffect(() => {
    getUserDetail(userId).then(setData);
  }, [userId]);

  const p = data?.profile;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-[rgba(5,7,12,.55)]">
      <button
        type="button"
        className="flex-1 border-0 bg-transparent"
        aria-label="Stäng"
        onClick={onClose}
      />
      <div className="h-full w-full max-w-[420px] animate-[admslide_.2s_ease] overflow-y-auto border-l border-line bg-panel p-5 shadow-[0_40px_90px_rgba(0,0,0,.65)]">
        {!p || !data ? (
          <div className="text-muted">Laddar…</div>
        ) : (
          <>
            <div className="mb-5 flex items-start gap-3">
              <span className="font-display flex size-12 items-center justify-center rounded-full border border-line-strong bg-panel-2 text-lg font-semibold">
                {initialOf(p.username)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold">{p.username}</div>
                <div className="text-[13px] text-dim">{data.email}</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line px-2.5 py-1 text-muted"
              >
                ✕
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2.5">
              {[
                { label: "Registrerad", value: fmtDate(p.created_at) },
                { label: "Senast aktiv", value: fmtSeen(p.last_seen_at) },
                {
                  label: "Loggade spel",
                  value: data.betsCount.toLocaleString("sv-SE"),
                },
                {
                  label: "Netto",
                  value: formatMoney(data.netto),
                  color:
                    data.netto > 0
                      ? "text-win"
                      : data.netto < 0
                        ? "text-loss"
                        : undefined,
                },
              ].map((f) => (
                <div
                  key={f.label}
                  className="rounded-[11px] border border-line-soft bg-bg-soft px-3 py-2.5"
                >
                  <div className="text-[10.5px] uppercase tracking-[0.12em] text-dim">
                    {f.label}
                  </div>
                  <div
                    className={cn(
                      "font-mono-num mt-1 text-[14px] font-semibold",
                      f.color
                    )}
                  >
                    {f.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-5">
              <div className="mb-2 font-display text-[15px] font-semibold uppercase tracking-[0.06em]">
                Roll
              </div>
              <div className="flex gap-1 rounded-[9px] border border-line bg-bg-soft p-1">
                {(["user", "admin"] as const).map((rl) => (
                  <button
                    key={rl}
                    type="button"
                    onClick={() => {
                      if (rl === p.role) return;
                      onConfirmRole(
                        {
                          id: p.id,
                          username: p.username,
                          avatar_url: p.avatar_url,
                          role: p.role,
                          banned: p.banned,
                          created_at: p.created_at,
                          last_seen_at: p.last_seen_at,
                          email: data.email,
                          bets: data.betsCount,
                          netto: data.netto,
                        },
                        rl
                      );
                    }}
                    className={cn(
                      "flex-1 rounded-[7px] px-3.5 py-2 text-[12.5px] font-semibold",
                      p.role === rl
                        ? "bg-panel-2 text-text"
                        : "bg-transparent text-muted"
                    )}
                  >
                    {rl === "admin" ? "Admin" : "Användare"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <div className="mb-2.5 font-display text-[15px] font-semibold uppercase tracking-[0.06em]">
                Spelböcker
              </div>
              {data.sheets.map((s) => (
                <div
                  key={s.id}
                  className="mb-2 flex items-center justify-between rounded-[11px] border border-line-soft bg-bg-soft px-3 py-2.5"
                >
                  <span className="font-semibold">{s.name}</span>
                  <span
                    className={cn(
                      "rounded-[5px] px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.08em]",
                      s.is_public
                        ? "bg-win/15 text-win"
                        : "bg-panel-2 text-muted"
                    )}
                  >
                    {s.is_public ? "PUBLIK" : "PRIVAT"}
                  </span>
                </div>
              ))}
              {!data.sheets.length ? (
                <div className="text-[13px] text-dim">Inga spelböcker</div>
              ) : null}
            </div>

            <div className="mb-5">
              <div className="mb-2.5 font-display text-[15px] font-semibold uppercase tracking-[0.06em]">
                Senaste 5 spel
              </div>
              {data.bets.map((b) => {
                const netto =
                  b.result === "open"
                    ? 0
                    : Number(b.payout) - Number(b.stake);
                return (
                  <div
                    key={b.id}
                    className="flex items-start gap-2 border-b border-rowline py-2.5"
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-[7px] rounded-full",
                        b.result === "win" || b.result === "halfwin"
                          ? "bg-win"
                          : b.result === "loss" || b.result === "halfloss"
                            ? "bg-loss"
                            : "bg-yellow"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px]">{b.match}</div>
                      <div className="text-[12px] text-dim">
                        {formatPick(b.pick)} @ {Number(b.odds).toFixed(2)}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "font-mono-num text-[12.5px] font-semibold",
                        netto > 0
                          ? "text-win"
                          : netto < 0
                            ? "text-loss"
                            : "text-muted"
                      )}
                    >
                      {b.result === "open" ? "öppen" : formatMoney(netto)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-[12px] border border-[rgba(255,107,107,.35)] bg-[rgba(255,107,107,.09)] p-4">
              <div className="font-display text-[15px] font-semibold uppercase tracking-[0.06em] text-loss">
                Riskzon
              </div>
              <p className="mt-1 text-[13px] text-muted">
                Avstängda konton kan inte logga nya spel.
              </p>
              <button
                type="button"
                onClick={() =>
                  onConfirmBan(
                    {
                      id: p.id,
                      username: p.username,
                      avatar_url: p.avatar_url,
                      role: p.role,
                      banned: p.banned,
                      created_at: p.created_at,
                      last_seen_at: p.last_seen_at,
                      email: data.email,
                      bets: data.betsCount,
                      netto: data.netto,
                    },
                    !p.banned
                  )
                }
                className="mt-3 rounded-[9px] border border-[rgba(255,107,107,.35)] bg-transparent px-3.5 py-2 text-[13.5px] font-bold text-loss"
              >
                {p.banned ? "Aktivera konto" : "Stäng av konto"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
