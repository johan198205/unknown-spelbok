"use client";

import { useState, useTransition } from "react";
import { setNotificationSetting } from "@/lib/notification-actions";
import {
  CATEGORY_LABELS,
  NOTIFICATION_CATEGORIES,
  type NotificationSettings,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

function Toggle({
  on,
  label,
  disabled,
  onToggle,
}: {
  on: boolean;
  label: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative h-[27px] w-[46px] shrink-0 rounded-full border transition-colors",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      )}
      style={{
        background: on ? "rgba(102,227,138,.22)" : "#0F1420",
        borderColor: on ? "rgba(102,227,138,.5)" : "#2A3346",
      }}
    >
      <span
        aria-hidden
        className="absolute top-1/2 size-[19px] -translate-y-1/2 rounded-full transition-[left] duration-[180ms]"
        style={{
          left: on ? "23px" : "3px",
          background: on ? "#66E38A" : "#5D6883",
        }}
      />
    </button>
  );
}

export function NotificationSettingsCard({
  settings,
}: {
  settings: NotificationSettings;
}) {
  const [values, setValues] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof NotificationSettings) {
    const next = !values[key];
    setValues((v) => ({ ...v, [key]: next }));
    setError(null);
    startTransition(async () => {
      const result = await setNotificationSetting(key, next);
      if (!result.ok) {
        setValues((v) => ({ ...v, [key]: !next }));
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-[14px] border border-line bg-panel p-[18px]">
      <h2 className="font-display text-[15px] font-semibold uppercase tracking-[0.09em] text-text">
        Notiser
      </h2>

      {/* Kolumnetiketterna står över togglarna, en gång — inte per rad. */}
      <div className="mt-3 flex items-center justify-end gap-3">
        <span className="w-[46px] text-center text-[11px] text-[#5D6883]">
          I appen
        </span>
        <span className="w-[46px] text-center text-[11px] text-[#5D6883]">
          Mejl
        </span>
      </div>

      {NOTIFICATION_CATEGORIES.map((category) => {
        const inApp = `${category}_in_app` as keyof NotificationSettings;
        const email = `${category}_email` as keyof NotificationSettings;
        const label = CATEGORY_LABELS[category];
        return (
          <div
            key={category}
            className="flex items-center gap-3 border-t border-line-soft py-3"
          >
            <span className="min-w-0 flex-1 text-[14.5px] text-[#C3CBDB]">
              {label}
            </span>
            <Toggle
              on={values[inApp]}
              disabled={pending}
              label={`${label} i appen`}
              onToggle={() => toggle(inApp)}
            />
            <Toggle
              on={values[email]}
              disabled={pending}
              label={`${label} via mejl`}
              onToggle={() => toggle(email)}
            />
          </div>
        );
      })}

      <p className="mt-1 text-[11.5px] text-[#5D6883]">
        Mejl skickas som mest en gång i timmen, samlat.
      </p>

      {error ? <p className="mt-2 text-[13px] text-loss">{error}</p> : null}
    </div>
  );
}
