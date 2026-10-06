-- =============================================================
-- SPELBOK — Fler spelbolag i listan (demo)
--
-- Lägger in Expekt, LeoVegas och SpeedyBet så att /spelbolag kan
-- granskas med fler kort. Finns bolaget redan aktiveras det bara —
-- inget befintligt innehåll skrivs över.
--
-- Loggorna laddas upp i /admin/spelbolag (Logotyp). Bakgrundsfärgen
-- (brand_color) är satt här och kan justeras där.
-- =============================================================

insert into public.bookmakers
  (rank, name, slug, brand_color, bonus, bonus_value, wagering, payments,
   rating, fast_payout, tracking_url, license, active)
values
  (20, 'Expekt',    'expekt',    '#1D1D1B', 'Upp till 1 500 kr matchad bonus', 1500, '5x', '{Swish,Trustly,BankID}', 4.2, true, 'https://www.expekt.se',    'Svensk licens, Spelinspektionen', true),
  (21, 'LeoVegas',  'leovegas',  '#FF6B00', 'Upp till 1 000 kr i bonus',       1000, '8x', '{Swish,Trustly,BankID}', 4.5, true, 'https://www.leovegas.se',  'Svensk licens, Spelinspektionen', true),
  (22, 'SpeedyBet', 'speedybet', '#0A1B2E', 'Snabba uttag med Swish',          0,    null, '{Swish,Trustly,BankID}', 4.0, true, 'https://www.speedybet.se', 'Svensk licens, Spelinspektionen', true)
on conflict (slug) do update
  set active = true;
