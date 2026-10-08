/**
 * API-Sports skriver de flesta svenska lag utan prickar (Brynas, IF
 * Bjorkloven, IFK Goteborg). Orden byts mot svensk stavning när en match i
 * en svensk liga skrivs till fixtures — bara där, så att t.ex. ett norskt
 * eller danskt lagnamn aldrig rörs.
 *
 * Hela ord byts, så "Farjestad BK U20" blir "Färjestad BK U20". Namn som
 * redan har prickar (Frölunda, Timrå) passerar oförändrade.
 *
 * Kopia finns i supabase/functions/_shared/swedish-names.ts — håll i synk.
 */
const SWEDISH_WORDS: Record<string, string> = {
  Alvsjo: "Älvsjö",
  Angelholm: "Ängelholm",
  Angelholms: "Ängelholms",
  Atvidaberg: "Åtvidaberg",
  Atvidabergs: "Åtvidabergs",
  Bjorkloven: "Björklöven",
  Boras: "Borås",
  Brynas: "Brynäs",
  Djurgarden: "Djurgården",
  Djurgardens: "Djurgårdens",
  Enkoping: "Enköping",
  Enkopings: "Enköpings",
  Farjestad: "Färjestad",
  Farjestads: "Färjestads",
  Gavle: "Gävle",
  Goteborg: "Göteborg",
  Grastorps: "Grästorps",
  Hacken: "Häcken",
  Hammaro: "Hammarö",
  Hassleholm: "Hässleholm",
  Hogaborg: "Högaborg",
  Hogsbo: "Högsbo",
  Hoor: "Höör",
  Jamtland: "Jämtland",
  Jonkoping: "Jönköping",
  Jonkopings: "Jönköpings",
  Koping: "Köping",
  Kopings: "Köpings",
  Lidingo: "Lidingö",
  Lidkoping: "Lidköping",
  Lidkopings: "Lidköpings",
  Lindloven: "Lindlöven",
  Linkoping: "Linköping",
  Linkopings: "Linköpings",
  Lulea: "Luleå",
  Malmo: "Malmö",
  Mjallby: "Mjällby",
  Molndal: "Mölndal",
  Nassjo: "Nässjö",
  Norrkoping: "Norrköping",
  Norrtalje: "Norrtälje",
  Nykoping: "Nyköping",
  Nykopings: "Nyköpings",
  Onnereds: "Önnereds",
  Orebro: "Örebro",
  Orgryte: "Örgryte",
  Ornskoldsvik: "Örnsköldsvik",
  Oster: "Öster",
  Osters: "Östers",
  Ostersund: "Östersund",
  Ostersunds: "Östersunds",
  Ostra: "Östra",
  Pitea: "Piteå",
  Rogle: "Rögle",
  Skelleftea: "Skellefteå",
  Skovde: "Skövde",
  Sodertalje: "Södertälje",
  Sodra: "Södra",
  Stromsbro: "Strömsbro",
  Taby: "Täby",
  Timra: "Timrå",
  Trollhattan: "Trollhättan",
  Tyreso: "Tyresö",
  Umea: "Umeå",
  Vallingby: "Vällingby",
  Vanersborg: "Vänersborg",
  Varnamo: "Värnamo",
  Vasteras: "Västerås",
  Vastervik: "Västervik",
  Vasterviks: "Västerviks",
  Vaxjo: "Växjö",
};

/** Landet är en sträng i api-football och ett objekt i v1-API:erna */
function countryOf(item: unknown) {
  if (!item || typeof item !== "object") return null;
  const it = item as { league?: { country?: unknown }; country?: unknown };
  for (const c of [it.league?.country, it.country]) {
    if (typeof c === "string") return c;
    if (c && typeof c === "object") {
      const name = (c as { name?: unknown }).name;
      if (typeof name === "string") return name;
    }
  }
  return null;
}

export function isSwedishFixture(item: unknown) {
  return countryOf(item) === "Sweden";
}

export function swedishTeamName(name: string) {
  return name.replace(/[A-Za-z]+/g, (word) => SWEDISH_WORDS[word] ?? word);
}
