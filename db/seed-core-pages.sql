-- Kärnsidor i CMS: startsida, om-oss, kontakt
-- Kör i Supabase SQL. Skriver inte över befintliga rader med samma slug.
-- Strukturerade sidor sparas som JSON (_type: landing | about | contact).

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
      $json${
  "_type": "about",
  "eyebrow": "Om Spelbok",
  "headline": "Vi byggde verktyget vi själva saknade.",
  "intro": "Spelbok startade 2025 som ett kalkylark mellan tre vänner som tröttnat på att gissa om de låg plus eller minus. Idag är det en plattform för alla som vill bokföra sina spel, se sin riktiga ROI och jämföra sig med andra på lika villkor.",
  "principlesTitle": "Det vi tror på",
  "principlesIntro": "Fyra principer som styr varje beslut om produkten. De står här så att du kan hålla oss ansvariga.",
  "principles": [
    {
      "n": "01",
      "title": "Siffrorna ljuger inte, det gör minnet",
      "body": "Netto, ROI och hitrate räknas ut ur varje enskilt spel. Ingen kan runda upp, glömma en förlust eller välja period."
    },
    {
      "n": "02",
      "title": "Vi förmedlar inga spel",
      "body": "Spelbok tar inga insatser och betalar inga vinster. Du spelar hos ditt licensierade spelbolag och bokför resultatet här."
    },
    {
      "n": "03",
      "title": "Öppet om hur vi tjänar pengar",
      "body": "Tjänsten är gratis och finansieras av annonsplatser och reklamlänkar till spelbolag. Varje sådan länk är märkt. Betyg och rankning påverkas inte av ersättning."
    },
    {
      "n": "04",
      "title": "Ansvar före tillväxt",
      "body": "18+, Stödlinjen och Spelpaus finns på varje sida. Vi använder aldrig brådska eller bonusretorik för att få någon att spela mer."
    }
  ],
  "cta": {
    "title": "Frågor, samarbeten eller press?",
    "body": "Vi svarar på vardagar inom 24 timmar.",
    "primaryLabel": "Kontakta oss",
    "primaryHref": "/kontakt",
    "secondaryLabel": "Skapa konto",
    "secondaryHref": "/registrera"
  }
}$json$,
      'Om Spelbok',
      'Vi byggde verktyget vi själva saknade. Läs om Spelboks principer.',
      true
    ),
    (
      'Kontakt',
      'kontakt',
      $json${
  "_type": "contact",
  "eyebrow": "Kontakt",
  "headline": "Hör av dig.",
  "intro": "Vi är tre personer och läser allt själva. Vardagar svarar vi inom 24 timmar, helger lite långsammare — då har vi oftast egna spel att rätta.",
  "channels": [
    {
      "badge": "@",
      "title": "Allmänna frågor och support",
      "href": "mailto:hej@spelbok.se",
      "label": "hej@spelbok.se",
      "lines": ""
    },
    {
      "badge": "AD",
      "title": "Annonsering och samarbeten",
      "href": "mailto:partner@spelbok.se",
      "label": "partner@spelbok.se",
      "lines": ""
    },
    {
      "badge": "PR",
      "title": "Press",
      "href": "mailto:press@spelbok.se",
      "label": "press@spelbok.se",
      "lines": ""
    },
    {
      "badge": "AB",
      "title": "Spelbok Sverige AB",
      "href": "",
      "label": "",
      "lines": "Org.nr 559xxx-xxxx\nSveavägen 00, 111 00 Stockholm"
    }
  ],
  "noticeBadge": "18+",
  "noticeBody": "Behöver du prata med någon om ditt spelande? Vi är inte rätt mottagare, men [Stödlinjen](https://www.stodlinjen.se) är det — **020-81 91 00**, gratis och anonymt. Du kan också stänga av dig via [Spelpaus](https://www.spelpaus.se)."
}$json$,
      'Kontakta Spelbok',
      'Hör av dig till Spelbok — support, press, annonsering och samarbeten.',
      true
    )
) as v(title, slug, content, seo_title, seo_description, show_in_footer)
where not exists (
  select 1 from public.pages p where p.slug = v.slug
);
