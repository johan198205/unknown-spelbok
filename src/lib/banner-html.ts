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

/** postMessage-typ från sandlådan när snutten rapporterar sin naturliga storlek. */
export const BANNER_HTML_RESIZE_TYPE = "spelbok-banner-resize";

/**
 * Samma som `--bg` i globals.css. Iframe-dokumentet ärver inte CSS-variabler
 * från föräldern, och webbläsare målar ofta iframer vita trots transparent —
 * därför speglar vi sidans bakgrund explicit.
 */
export const BANNER_HTML_PAGE_BG = "#0b0e14";

/**
 * Snutten körs i ett eget dokument. `<base target="_blank">` gör att alla
 * länkar öppnas i ny flik i stället för att träffa toppnavigeringsspärren och
 * tyst dö. Storleken rapporteras till föräldern via postMessage — sandlådan har
 * ingen same-origin, så föräldern kan inte mäta innehållet själv. Iframen
 * krymper till snuttens mått och centreras i ytan så ingen vit ram syns runt.
 */
export function bannerHtmlDocument(html: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<base target="_blank">
<style>
html,body{
  margin:0;padding:0;
  width:max-content;max-width:100%;
  background:${BANNER_HTML_PAGE_BG}!important;
  background-color:${BANNER_HTML_PAGE_BG}!important;
  color-scheme:dark;
}
body{display:block;overflow:hidden;line-height:0;font-size:0;}
/* Affiliatesnuttar lägger ofta vit bakgrund på yttersta wrappen. */
body>*:not(script){background-color:transparent!important;}
img,iframe,video,ins,object,embed{
  max-width:100%;height:auto;border:0;display:block;
  background:transparent;vertical-align:top;
}
a{display:block;max-width:100%;line-height:0;}
</style>
</head>
<body>${html}
<script>
(function(){
  function sizeOf(el){
    if(!el||el.tagName==="SCRIPT")return null;
    var r=el.getBoundingClientRect();
    var h=Math.ceil(r.height);
    var w=Math.ceil(r.width);
    // Hoppa över trackingpixlar och osynliga noder.
    if(h<2||w<2)return null;
    return {height:h,width:w};
  }
  function measure(){
    var h=0,w=0;
    // Föredra media — annars blir höjden ofta wrappens vita padding.
    var media=document.querySelectorAll("img,iframe,canvas,video,object,embed");
    for(var i=0;i<media.length;i++){
      var m=sizeOf(media[i]);
      if(!m)continue;
      h=Math.max(h,m.height);
      w=Math.max(w,m.width);
    }
    if(!h||!w){
      var nodes=document.body?document.body.children:[];
      for(var j=0;j<nodes.length;j++){
        var c=sizeOf(nodes[j]);
        if(!c)continue;
        h=Math.max(h,c.height);
        w=Math.max(w,c.width);
      }
    }
    if((!h||!w)&&document.body){
      h=Math.max(h,document.body.scrollHeight||0,document.body.offsetHeight||0);
      w=Math.max(w,document.body.scrollWidth||0,document.body.offsetWidth||0);
    }
    return {height:h,width:w};
  }
  function report(){
    try{
      var m=measure();
      if(m.height>0||m.width>0){
        parent.postMessage({
          type:${JSON.stringify(BANNER_HTML_RESIZE_TYPE)},
          height:m.height,
          width:m.width
        },"*");
      }
    }catch(err){}
  }
  report();
  window.addEventListener("load",report);
  window.addEventListener("resize",report);
  if(typeof ResizeObserver!=="undefined"&&document.body){
    var ro=new ResizeObserver(report);
    ro.observe(document.body);
    if(document.documentElement)ro.observe(document.documentElement);
  }
  document.addEventListener("load",report,true);
  [50,100,300,800,2000].forEach(function(ms){setTimeout(report,ms);});
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
