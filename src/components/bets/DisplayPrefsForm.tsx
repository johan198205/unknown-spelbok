"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { setDisplayPrefs } from "@/lib/display-actions";
import { useT } from "@/components/TextsProvider";
import {
  CURRENCIES,
  currencyLabel,
  currencySuffix,
  formatAmount,
  isCurrencyCode,
  MAX_UNITS_PER_BET,
  type CurrencyCode,
  type DisplayPrefs,
} from "@/lib/display";

export function DisplayPrefsForm({ prefs }: { prefs: DisplayPrefs }) {
  const t = useT();
  const router = useRouter();
  const [currency, setCurrency] = useState<CurrencyCode>(prefs.currency);
  const [unitSize, setUnitSize] = useState(String(prefs.unitSize));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const parsedUnit = Number(unitSize.replace(",", "."));
  const validUnit = Number.isFinite(parsedUnit) && parsedUnit > 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validUnit) {
      setMessage({ ok: false, text: t("installningar.errors.unitSize") });
      return;
    }

    setLoading(true);
    setMessage(null);
    const res = await setDisplayPrefs({ currency, unitSize: parsedUnit });
    setLoading(false);

    if (!res.ok) {
      setMessage({ ok: false, text: res.error });
      return;
    }
    setMessage({ ok: true, text: t("installningar.display.saved") });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Select
        label={t("installningar.display.currency")}
        value={currency}
        onChange={(e) =>
          isCurrencyCode(e.target.value) && setCurrency(e.target.value)
        }
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {currencyLabel(c.code, t)}
          </option>
        ))}
      </Select>
      <p className="-mt-1 text-[13px] text-muted">
        {t("installningar.display.currencyNote")}
      </p>

      <Input
        label={t("installningar.display.unitLabel", {
          currency: currencySuffix(currency),
        })}
        value={unitSize}
        onChange={(e) => setUnitSize(e.target.value)}
        inputMode="decimal"
        required
      />
      <p className="-mt-1 text-[13px] text-muted">
        {t("installningar.display.maxUnits", { max: MAX_UNITS_PER_BET })}
        {validUnit ? (
          <>
            {" "}
            {t("installningar.display.maxStake")}{" "}
            <span className="font-mono-num text-text">
              {formatAmount(
                parsedUnit * MAX_UNITS_PER_BET,
                { mode: "money", currency, unitSize: parsedUnit },
                { sign: false }
              )}
            </span>
            {t("installningar.display.period")}
          </>
        ) : (
          t("installningar.display.period")
        )}
      </p>

      {message ? (
        <div className={`text-sm ${message.ok ? "text-win" : "text-loss"}`}>
          {message.text}
        </div>
      ) : null}

      <Button type="submit" disabled={loading}>
        {loading ? t("installningar.display.saving") : t("installningar.display.save")}
      </Button>
    </form>
  );
}
