"use client";

import { useCallback, useState } from "react";
import { useMobileChrome } from "@/components/layout/MobileChrome";
import { SuggestionCard } from "@/components/suggestions/SuggestionCard";
import {
  fixtureFromSuggestion,
  suggestionDateLabel,
  type DailySuggestion,
} from "@/lib/suggestions";

const LEAVE_MS = 200;

/**
 * "Dagens matcher för dig" — regelmatchade fixtures ur daily_suggestions.
 *
 * Noll förslag → ingen sektion alls. Ingen tom-state, inget brus.
 *
 * clicked/dismissed skickas optimistiskt: kortet reagerar direkt och
 * PATCH:en får misslyckas i tysthet. Fälten är uppföljningsdata, inget
 * användaren märker om det tappas.
 */
export function DailySuggestions({
  initial,
  scope = "account",
}: {
  initial: DailySuggestion[];
  /** account = hela kontot (Hem), sheet = en enskild spelbok. */
  scope?: "account" | "sheet";
}) {
  const [items, setItems] = useState(initial);
  const [leaving, setLeaving] = useState<string | null>(null);
  const chrome = useMobileChrome();

  const patch = useCallback(
    (id: string, body: { clicked?: boolean; dismissed?: boolean }) => {
      void fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {
        /* uppföljningsdata — får tappas utan att störa användaren */
      });
    },
    []
  );

  const open = useCallback(
    (suggestion: DailySuggestion) => {
      patch(suggestion.id, { clicked: true });
      setItems((prev) =>
        prev.map((s) => (s.id === suggestion.id ? { ...s, clicked: true } : s))
      );
      chrome?.openAddBet(fixtureFromSuggestion(suggestion));
    },
    [chrome, patch]
  );

  const dismiss = useCallback(
    (id: string) => {
      patch(id, { dismissed: true });
      setLeaving(id);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((s) => s.id !== id));
        setLeaving((current) => (current === id ? null : current));
      }, LEAVE_MS);
    },
    [patch]
  );

  if (!items.length) return null;

  const isSheet = scope === "sheet";
  const headingId = isSheet ? "dagens-matcher-spelbok" : "dagens-matcher";

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3 px-1">
        <h2
          id={headingId}
          className="font-display text-[17px] font-semibold uppercase tracking-[0.04em]"
        >
          {isSheet ? "Dagens matcher för spelboken" : "Dagens matcher för dig"}
        </h2>
        <span className="shrink-0 text-[12.5px] text-muted">
          {suggestionDateLabel()}
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto sb-scroll snap-x snap-mandatory pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
        {items.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            leaving={leaving === suggestion.id}
            onOpen={() => open(suggestion)}
            onDismiss={() => dismiss(suggestion.id)}
          />
        ))}
      </div>

      <p className="mt-2 px-1 text-[11.5px] leading-snug text-faint">
        {isSheet
          ? "Matcherna är valda utifrån den här spelbokens egen historik och är värda att kolla upp. Ingen prognos av utfallet."
          : "Matcherna är valda utifrån din egen spelhistorik och är värda att kolla upp. Ingen prognos av utfallet."}
      </p>
    </section>
  );
}
