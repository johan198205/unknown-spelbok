-- Kärnsidor i CMS: startsida, om-oss, kontakt
-- Kör i Supabase SQL. Skriver inte över befintliga rader med samma slug.
-- Startsidans content är JSON med _type: "landing" (redigeras i Admin → Sidor).

insert into public.pages (
  title, slug, content, seo_title, seo_description, published, show_in_footer, author_id
)
select
  v.title,
  v.slug,
  v.content,
  v.seo_title,
  v.seo_description,
  true,
  v.show_in_footer,
  (select id from public.profiles where role = 'admin' order by created_at limit 1)
from (
  values
    (
      'TA KONTROLL ÖVER DITT SPELANDE.',
      'startsida',
      $json${
  "_type": "landing",
  "hero": {
    "badge": "Live bokföring",
    "body": "Bokför varje spel, se din riktiga ROI och sluta gissa. Jämför dig med andra i topplistorna där bara siffrorna talar.",
    "primaryCta": { "label": "Börja bokföra gratis", "href": "/registrera" },
    "secondaryCta": { "label": "Se ett publikt spreadsheet", "href": "/topplista" },
    "image": "/mockups/spelbok-devices.png",
    "imageAlt": "Spelbok på laptop och mobil — dashboard med netto, ROI, hitrate och bokförda spel."
  },
  "howItWorks": {
    "title": "Så funkar det",
    "body": "Tre steg från utspridda skärmdumpar och minneslappar till en bok som visar exakt var pengarna kommer ifrån.",
    "steps": [
      {
        "no": "01",
        "title": "Skapa ett spreadsheet",
        "body": "En bok per strategi. Sätt startbankroll, välj om den ska vara publik och börja logga.",
        "img": "/img/sa-funkar-det/skapa-spreadsheet.png",
        "alt": "Formuläret för nytt spreadsheet med namn, startbankroll och publik-val."
      },
      {
        "no": "02",
        "title": "Bokför varje spel",
        "body": "Match, tipp, odds, insats och resultat. Filtrera på liga, spelbolag eller oddsintervall.",
        "img": "/img/sa-funkar-det/bokfor-spel.png",
        "alt": "Spellistan med datum, liga, match, tipp, odds, resultat och netto per rad."
      },
      {
        "no": "03",
        "title": "Läs av sanningen",
        "body": "Netto, ROI och hitrate räknas om direkt. Jämför dig i topplistorna.",
        "img": "/img/sa-funkar-det/statistik.png",
        "alt": "Statistikvyn med netto, ROI, hitrate och grafen över ackumulerat netto."
      }
    ]
  },
  "leaderboard": {
    "title": "Topplistan just nu",
    "body": "Publika spreadsheets rankade på ROI",
    "ctaLabel": "Se hela listan",
    "ctaHref": "/topplista"
  },
  "cta": {
    "title": "Börja bokföra idag",
    "body": "Gratis konto, obegränsat antal spreadsheets och full statistik från första spelet.",
    "buttonLabel": "Skapa konto",
    "buttonHref": "/registrera"
  }
}$json$,
      'Spelbok — ta kontroll över ditt spelande',
      'Bokför varje spel, se din riktiga ROI och jämför dig i topplistorna.',
      false
    ),
    (
      'Om oss',
      'om-oss',
      $md$## Vem är Spelbok?

Spelbok hjälper dig att bokföra spel, följa ROI och jämföra dig med andra — utan gissningar.

## Kontakt

Har du frågor? Gå till [Kontakt](/kontakt).
$md$,
      'Om Spelbok',
      'Läs mer om Spelbok och hur vi hjälper dig att ta kontroll över ditt spelande.',
      true
    ),
    (
      'Kontakt',
      'kontakt',
      $md$## Hör av dig

Skicka mejl till **support@spelbok.se** så återkommer vi så snart vi kan.

## Ansvarsfullt spelande

18+ | Spela ansvarsfullt | [Stödlinjen](https://www.stodlinjen.se) | [Spelpaus](https://www.spelpaus.se)
$md$,
      'Kontakta Spelbok',
      'Kontakta Spelbok — support och frågor om tjänsten.',
      true
    )
) as v(title, slug, content, seo_title, seo_description, show_in_footer)
where not exists (
  select 1 from public.pages p where p.slug = v.slug
);
