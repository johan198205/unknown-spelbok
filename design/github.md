# github.md

repo: luukhopman/football-logos
branch: master
path: logos

## Last sync

date: 2026-08-15T21:00:38Z

### Updated in this project

- 30 riktiga klubbmärken importerade och inbakade som data-URI:er i `crests.js`.
- Betalningsmärken (Apple Pay, Visa, Mastercard, Klarna, lightning) hämtade från simple-icons/simple-icons@master och inlagda i `marks.js`.
- `bookmakers.js` mappar märkena per spelbolag; Swish, Trustly och BankID är wordmarks i varumärkesfärg tills officiella filer finns.

## Screen map

| Skärm / vy | Byggd från |
|---|---|
| Spelbok.dc.html — tabell, kortvy, senaste resultat, startsida, matchväljare | crests.js via fixtures.js |
| Spelbok.dc.html — sidan Spelbolag, Topp 3-widget | bookmakers.js + marks.js |
| Spelbok App.dc.html — spelkort, senaste resultat, matchväljare | crests.js via fixtures.js |

## Sync history

- 2026-08-15T20:42:20Z — luukhopman/football-logos: klubbmärken importerade till `crests/`.
