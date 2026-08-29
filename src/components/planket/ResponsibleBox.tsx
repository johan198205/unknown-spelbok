/**
 * Ansvarsrutan.
 *
 * Alltid synlig, aldrig bakom en flik: på desktop sist i högerkolumnen, på
 * mobil sist i flödet.
 *
 * Egen fil, inte en export ur PlanketSidebar: sidopanelen är en server-
 * komponent som drar in supabase/server (och därmed next/headers). Låg
 * rutan kvar där skulle varje klientkomponent som importerar den ta med
 * sig hela serverkedjan in i webbläsarbunten och krascha bygget.
 */
export function ResponsibleBox() {
  return (
    <section className="rounded-[14px] border border-line bg-panel p-[15px]">
      <div className="mb-2 flex items-center gap-[9px]">
        <span className="rounded-[5px] border border-line-strong px-[7px] py-0.5 font-display text-[12px] font-semibold text-[#8A94AB]">
          18+
        </span>
        <span className="text-[12.5px] font-semibold text-[#C3CBDB]">
          Spela ansvarsfullt
        </span>
      </div>
      <p className="text-[12.5px] leading-[1.6] text-[#8A94AB] [text-wrap:pretty]">
        Inlägg är användarnas egna åsikter, inte speltips från Spelbok. 18+.
        Stödlinjen{" "}
        <span className="font-mono-num text-[#C3CBDB]">020-81&nbsp;91&nbsp;00</span>
        .
      </p>
      <div className="mt-[9px] flex gap-3 text-[12.5px]">
        <a href="https://stodlinjen.se" target="_blank" rel="noopener noreferrer">
          Stödlinjen
        </a>
        <a href="https://spelpaus.se" target="_blank" rel="noopener noreferrer">
          Spelpaus
        </a>
      </div>
    </section>
  );
}
