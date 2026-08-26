"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { setDisplayPrefs } from "@/lib/display-actions";
import {
  CURRENCIES,
  currencySuffix,
  formatAmount,
  isCurrencyCode,
  MAX_UNITS_PER_BET,
  type CurrencyCode,
  type DisplayPrefs,
} from "@/lib/display";

export function DisplayPrefsForm({ prefs }: { prefs: DisplayPrefs }) {
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
      setMessage({ ok: false, text: "Unit-storleken måste vara större än 0." });
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
    setMessage({ ok: true, text: "Sparat." });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Select
        label="Valuta"
        value={currency}
        onChange={(e) =>
          isCurrencyCode(e.target.value) && setCurrency(e.target.value)
        }
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.label}
          </option>
        ))}
      </Select>
      <p className="-mt-1 text-[13px] text-muted">
        Valutan är en etikett på dina belopp. Inga summor räknas om — 250 är
        250 oavsett vilken valuta du väljer.
      </p>

      <Input
        label={`1 unit i ${currencySuffix(currency)}`}
        value={unitSize}
        onChange={(e) => setUnitSize(e.target.value)}
        inputMode="decimal"
        required
      />
      <p className="-mt-1 text-[13px] text-muted">
        Max {MAX_UNITS_PER_BET} units per spel
        {validUnit ? (
          <>
            {" "}
            — högsta insats blir{" "}
            <span className="font-mono-num text-text">
              {formatAmount(
                parsedUnit * MAX_UNITS_PER_BET,
                { mode: "money", currency, unitSize: parsedUnit },
                { sign: false }
              )}
            </span>
            .
          </>
        ) : (
          "."
        )}
      </p>

      {message ? (
        <div className={`text-sm ${message.ok ? "text-win" : "text-loss"}`}>
          {message.text}
        </div>
      ) : null}

      <Button type="submit" disabled={loading}>
        {loading ? "Sparar…" : "Spara"}
      </Button>
    </form>
  );
}
