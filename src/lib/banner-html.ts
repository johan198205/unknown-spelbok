/**
 * Delad sandlåda för HTML-kreativ. Både annonsytan (components/ui/BannerHtml)
 * och förhandsvisningen i admin måste köra snutten under exakt samma villkor —
 * annars godkänner admin en banner som beter sig annorlunda i skarpt läge.
 */

/**
 * `allow-same-origin` saknas medvetet: annonsörens script får då en egen opak
 * origin och kommer varken åt vår DOM, våra cookies eller Supabase-sessionen i
 * localStorage. `allow-scripts` + `allow-same-origin` tillsammans hade låtit
 * snutten ta bort sitt eget sandbox-attribut.
 *
 * `allow-popups-to-escape-sandbox` gör att landningssidan som öppnas inte ärver
 * sandlådan — utan den blir affiliatens egen sajt obrukbar i den nya fliken.
 * Toppnavigering är inte tillåten, så en snutt kan aldrig kapa vår flik.
 */
export const BANNER_HTML_SANDBOX =
  "allow-scripts allow-popups allow-popups-to-escape-sandbox";

/**
 * Snutten körs i ett eget dokument. `<base target="_blank">` gör att alla
 * länkar öppnas i ny flik i stället för att träffa toppnavigeringsspärren och
 * tyst dö, och innehållet centreras så att en 728×90-kreativ sitter mitt i vår
 * fullbreda 970×90-yta i stället för att klistras i vänsterkanten.
 */
export function bannerHtmlDocument(html: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<style>
html,body{margin:0;padding:0;height:100%;background:transparent;}
body{display:flex;align-items:center;justify-content:center;overflow:hidden;}
img,iframe,video,ins{max-width:100%;max-height:100%;border:0;display:block;}
a{display:block;}
</style>
</head>
<body>${html}</body>
</html>`;
}

/**
 * Grov klassificering av en inklistrad snutt, bara för att kunna säga något
 * vettigt i admin. Ingen validering — vi kör snutten som den är oavsett.
 */
export function describeBannerHtml(html: string) {
  const code = html.trim();
  if (!code) return null;
  if (/<script[\s>]/i.test(code)) return "Script-tagg";
  if (/<iframe[\s>]/i.test(code)) return "Iframe";
  if (/<img[\s>]/i.test(code)) return "Länkad bild";
  return "HTML";
}
