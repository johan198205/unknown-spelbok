/**
 * Måtten på spelradens ikonknappar, på ett ställe.
 *
 * Egen fil för att BetRowActions och GoalNotifyButton båda behöver dem utan
 * att importera varandra i cirkel.
 *
 * sm 28 = tabellens täta åtgärdskolumn · card 32 = spelbokskortet, samma höjd
 * som rättningens segmentreglage bredvid · md 36 = formulär och mobil.
 */
export type BetActionSize = "sm" | "card" | "md";

export const ACTION_ICON_SIZE: Record<BetActionSize, string> = {
  sm: "size-7",
  card: "size-8",
  md: "size-9",
};
