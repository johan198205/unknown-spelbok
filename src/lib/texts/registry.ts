import commonTexts from "./areas/common";
import headerTexts from "./areas/header";
import authTexts from "./areas/auth";
import errorsTexts from "./areas/errors";
import pwaTexts from "./areas/pwa";
import popupsTexts from "./areas/popups";
import landingTexts from "./areas/landing";
import hemTexts from "./areas/hem";
import spelbokTexts from "./areas/spelbok";
import betformTexts from "./areas/betform";
import importTexts from "./areas/import";
import termsTexts from "./areas/terms";
import deladTexts from "./areas/delad";
import statistikTexts from "./areas/statistik";
import forslagTexts from "./areas/forslag";
import profilTexts from "./areas/profil";
import planketTexts from "./areas/planket";
import kupongerTexts from "./areas/kuponger";
import spelbolagTexts from "./areas/spelbolag";
import topplistaTexts from "./areas/topplista";
import tavlingarTexts from "./areas/tavlingar";
import installningarTexts from "./areas/installningar";
import notiserTexts from "./areas/notiser";
import kontaktTexts from "./areas/kontakt";
import omossTexts from "./areas/omoss";
import cmsTexts from "./areas/cms";

/**
 * Alla textområden i den ordning de visas i admin → Texter. Nya områden
 * läggs till här och som en fil under ./areas.
 */
export const TEXT_AREAS = [
  commonTexts,
  headerTexts,
  authTexts,
  errorsTexts,
  pwaTexts,
  popupsTexts,
  landingTexts,
  hemTexts,
  spelbokTexts,
  betformTexts,
  importTexts,
  termsTexts,
  deladTexts,
  statistikTexts,
  forslagTexts,
  profilTexts,
  planketTexts,
  kupongerTexts,
  spelbolagTexts,
  topplistaTexts,
  tavlingarTexts,
  installningarTexts,
  notiserTexts,
  kontaktTexts,
  omossTexts,
  cmsTexts,
] as const;

type KeysOf<A> = A extends { texts: infer T } ? keyof T & string : never;

export type TextKey = KeysOf<(typeof TEXT_AREAS)[number]>;

export const TEXT_DEFAULTS: Record<string, string> = Object.assign(
  {},
  ...TEXT_AREAS.map((a) => a.texts)
);

export function isTextKey(key: string): key is TextKey {
  return Object.prototype.hasOwnProperty.call(TEXT_DEFAULTS, key);
}
