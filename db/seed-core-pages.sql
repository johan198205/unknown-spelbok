-- Kärnsidor i CMS: startsida, om-oss, kontakt
-- Kör i Supabase SQL. Skriver inte över befintliga rader med samma slug.

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
      $md$Bokför varje spel, se din riktiga ROI och sluta gissa. Jämför dig med andra i topplistorna där bara siffrorna talar.

> Redigera den här sidan under Admin → Sidor. Rubriken och första stycket visas i hero på `/`.
$md$,
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
