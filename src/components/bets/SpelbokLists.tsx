"use client";

import { Component, type ReactNode } from "react";
import { BetForm, BetsTable } from "@/components/bets/BetForm";
import { MobileBetCards } from "@/components/pwa/MobileBetCards";
import type { Bet, Bookmaker, Sheet } from "@/lib/types";

class ListError extends Component<
  { children: ReactNode },
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
          Kunde inte visa spellen: {this.state.error.message}
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
  return (
    <>
      <div className="hidden lg:block">
        <BetForm
          sheets={sheets}
          bookmakers={bookmakers}
          defaultSheetId={sheetId}
        />
      </div>
      <ListError>
        <div className="hidden lg:block">
          <BetsTable bets={bets} canEdit />
        </div>
        <MobileBetCards bets={bets} sheetId={sheetId} canEdit />
      </ListError>
    </>
  );
}
