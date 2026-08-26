import { cache } from "react";
import { getProfile } from "./auth";
import { displayPrefsFrom, type DisplayPrefs } from "./display";

/**
 * Den inloggades visningsinställningar. getProfile() är redan memoiserad per
 * request, så det här kostar inget extra anrop hur många server-komponenter
 * som än frågar.
 */
export const getDisplayPrefs = cache(async function getDisplayPrefs(): Promise<DisplayPrefs> {
  return displayPrefsFrom(await getProfile());
});
