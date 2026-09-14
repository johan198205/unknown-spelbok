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

/** postMessage-typ från sandlådan när snutten rapporterar sin naturliga höjd. */
export const BANNER_HTML_RESIZE_TYPE = "spelbok-banner-resize";

/**
 * Snutten körs i ett eget dokument. `<base target="_blank">` gör att alla
 * länkar öppnas i ny flik i stället för att träffa toppnavigeringsspärren och
 * tyst dö. Höjden rapporteras till föräldern via postMessage — sandlådan har
 * ingen same-origin, så föräldern kan inte mäta innehållet själv. Bredden
 * begränsas till ytans bredd; höjden följer snutten (ingen fast 90/100 px).
 */
export function bannerHtmlDocument(html: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<style>
html,body{margin:0;padding:0;background:transparent;}
body{display:flex;align-items:center;justify-content:center;overflow:hidden;}
img,iframe,video,ins,object,embed{max-width:100%;height:auto;border:0;display:block;}
a{display:block;max-width:100%;}
</style>
</head>
<body>${html}
<script>
(function(){
  function measure(){
    var b=document.body,e=document.documentElement;
    var h=Math.max(
      b?b.scrollHeight:0,b?b.offsetHeight:0,
      e?e.scrollHeight:0,e?e.offsetHeight:0
    );
    if(b){
      var nodes=b.children;
      for(var i=0;i<nodes.length;i++){
        var el=nodes[i];
        if(!el||el.tagName==="SCRIPT")continue;
        var r=el.getBoundingClientRect();
        h=Math.max(h,Math.ceil(r.bottom+window.scrollY));
      }
    }
    return h;
  }
  function report(){
    try{
      var h=measure();
      if(h>0)parent.postMessage({type:${JSON.stringify(BANNER_HTML_RESIZE_TYPE)},height:h},"*");
    }catch(err){}
  }
  report();
  window.addEventListener("load",report);
  window.addEventListener("resize",report);
  if(typeof ResizeObserver!=="undefined"){
    var ro=new ResizeObserver(report);
    ro.observe(document.body);
    if(document.documentElement)ro.observe(document.documentElement);
  }
  document.addEventListener("load",report,true);
  [100,300,800,2000].forEach(function(ms){setTimeout(report,ms);});
})();
</script>
</body>
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
