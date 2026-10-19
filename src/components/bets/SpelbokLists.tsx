"use client";

import { Component, type ReactNode } from "react";
import { BetForm, BetsTable } from "@/components/bets/BetForm";
import { MobileBetCards } from "@/components/pwa/MobileBetCards";
import { useT } from "@/components/TextsProvider";
import type { TFunction } from "@/lib/texts";
import type { Bet, Bookmaker, Sheet } from "@/lib/types";

/** Klasskomponent — kan inte anropa useT(), så t skickas in. */
class ListError extends Component<
  { children: ReactNode; t: TFunction },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <p className="rounded-[11px] border border-loss/35 bg-loss/10 px-3 py-3 text-sm text-loss">
          {this.props.t("spelbok.lists.error", {
            message: this.state.error.message,
          })}
        </p>
      );
    }
    return this.props.children;
  }
}

export function SpelbokLists({
  bets,
  sheets,
  bookmakers,
  sheetId,
}: {
  bets: Bet[];
  sheets: Sheet[];
  bookmakers: Bookmaker[];
  sheetId: string;
}) {
  const t = useT();
  return (
    <>
      <div className="hidden lg:block">
        <BetForm
          sheets={sheets}
          bookmakers={bookmakers}
          defaultSheetId={sheetId}
        />
      </div>
      <ListError t={t}>
        <div className="hidden lg:block">
          <BetsTable bets={bets} canEdit />
        </div>
        <MobileBetCards bets={bets} sheetId={sheetId} canEdit />
      </ListError>
    </>
  );
}
