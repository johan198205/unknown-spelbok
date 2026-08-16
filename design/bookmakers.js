/* Spelbok — affiliatedata för svenska licensierade spelbolag.
   Logotyper är platshållare i varumärkesfärg (procent-kodade SVG utan semikolon
   så de fungerar i style-attribut och följer med i publicerade artefakter).
   trackingUrl är ett eget fält per bolag — byt till riktiga affiliatelänkar här. */
(function () {
  function logo(text, bg, fg) {
    /* Genomskinlig bakgrund — plattans varumärkesfärg syns igenom.
       textLength håller långa namn inom viewBoxen så de aldrig kapas. */
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 44">' +
      '<text x="120" y="32" font-family="Helvetica,Arial,sans-serif" font-size="26" font-weight="700" text-anchor="middle" fill="' + fg + '"' +
      (text.length > 9 ? ' textLength="228" lengthAdjust="spacingAndGlyphs"' : '') +
      '>' + text + '</text></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }

  window.SBBookmakers = [
    {
      rank: 1, name: 'Unibet', logo: logo('unibet', '#147B45', '#FFFFFF'),
      bonus: '100 % upp till 2 000 kr', terms: 'Gäller nya kunder. Omsättningskrav gäller. 18+',
      usp: 'Bäst odds på Allsvenskan', payments: ['Swish', 'Trustly', 'Bankkort'],
      rating: 4.7, fastPayout: true, bonusValue: 2000,
      trackingUrl: 'https://example.com/go/unibet',
      review: 'Bredast svenska utbud av de stora bolagen, med egna odds på division 1 och SHL. Livebettingen är stabil och streamingen ingår för de flesta matcher. Uttag via Swish går normalt igenom inom minuten.',
      plus: ['Vassa odds på svensk fotboll', 'Streaming ingår', 'Snabba Swish-uttag'],
      minus: ['Begränsar vinnande spelare relativt tidigt']
    },
    {
      rank: 2, name: 'Bet365', logo: logo('bet365', '#126E51', '#FFFFFF'),
      bonus: 'Insatsförsäkring upp till 1 500 kr', terms: 'Gäller nya kunder. Villkor gäller. 18+',
      usp: 'Störst utbud av livebetting', payments: ['Trustly', 'Bankkort', 'Apple Pay'],
      rating: 4.6, fastPayout: false, bonusValue: 1500,
      trackingUrl: 'https://example.com/go/bet365',
      review: 'Marknadsledande på liveutbud med hundratals spelformer per match. Cash out fungerar bättre än hos konkurrenterna och statistiken i spelvyn är den mest kompletta. Uttagen tar oftast ett dygn.',
      plus: ['Enormt liveutbud', 'Bäst cash out', 'Djup matchstatistik'],
      minus: ['Långsammare uttag än svenska konkurrenter']
    },
    {
      rank: 3, name: 'Betsson', logo: logo('Betsson', '#F26522', '#FFFFFF'),
      bonus: '50 % upp till 1 000 kr', terms: 'Gäller nya kunder. Omsättningskrav gäller. 18+',
      usp: 'Snabbast uttag', payments: ['Swish', 'Trustly'],
      rating: 4.5, fastPayout: true, bonusValue: 1000,
      trackingUrl: 'https://example.com/go/betsson',
      review: 'Uttagen är bland de snabbaste på den svenska marknaden och gränssnittet är rent i mobilen. Oddsen på storligorna håller jämna steg med de bästa, medan mindre ligor är tunnare.',
      plus: ['Uttag inom minuter', 'Tydlig mobilapp', 'Bra odds på Premier League'],
      minus: ['Tunt utbud på lägre serier']
    },
    {
      rank: 4, name: 'Svenska Spel Sport & Casino', logo: logo('Svenska Spel', '#003D7D', '#FFFFFF'),
      bonus: 'Ingen bonus', terms: 'Erbjuder inga insättningsbonusar. 18+',
      usp: 'Begränsar inte spelare', payments: ['Swish', 'Bankkort'],
      rating: 4.4, fastPayout: true, bonusValue: 0,
      trackingUrl: 'https://example.com/go/svenskaspel',
      review: 'Enda bolaget som konsekvent låter vinnande spelare vara kvar med fulla insatsgränser. Oddsen är sällan högst, men utbudet på svensk hockey och fotboll är bra och Swish-hanteringen sömlös.',
      plus: ['Begränsar inte vinnare', 'Trygg svensk aktör', 'Stark på SHL'],
      minus: ['Lägre odds i snitt']
    },
    {
      rank: 5, name: 'LeoVegas', logo: logo('LeoVegas', '#1B1B1B', '#F5A623'),
      bonus: '100 % upp till 1 500 kr', terms: 'Gäller nya kunder. Omsättningskrav gäller. 18+',
      usp: 'Bäst mobilupplevelse', payments: ['Swish', 'Trustly', 'Apple Pay'],
      rating: 4.3, fastPayout: true, bonusValue: 1500,
      trackingUrl: 'https://example.com/go/leovegas',
      review: 'Mobilappen är den snabbaste i testet och spelkupongen är enkel att jobba i även vid livespel. Sportutbudet är något mindre än hos de största, men marginalerna på matchodds är rimliga.',
      plus: ['Snabb app', 'Smidig kupong', 'Apple Pay-insättning'],
      minus: ['Mindre utbud på nischsporter']
    },
    {
      rank: 6, name: 'ComeOn', logo: logo('ComeOn', '#00A5E0', '#FFFFFF'),
      bonus: '100 % upp till 1 000 kr', terms: 'Gäller nya kunder. Omsättningskrav gäller. 18+',
      usp: 'Bra kombinationsboost', payments: ['Swish', 'Trustly'],
      rating: 4.1, fastPayout: false, bonusValue: 1000,
      trackingUrl: 'https://example.com/go/comeon',
      review: 'Boostar kombinationsspel med flera objekt, vilket lyfter värdet för den som spelar kombinationer. Supporten svarar snabbt på svenska. Uttagen är sällan direkta men går igenom samma dag.',
      plus: ['Boost på kombinationer', 'Svensk support dygnet runt', 'Enkel registrering'],
      minus: ['Uttag tar några timmar']
    },
    {
      rank: 7, name: 'Expekt', logo: logo('Expekt', '#1D1D1B', '#F5D400'),
      bonus: '50 % upp till 1 000 kr', terms: 'Gäller nya kunder. Omsättningskrav gäller. 18+',
      usp: 'Bäst på nordisk hockey', payments: ['Swish', 'Trustly', 'Bankkort'],
      rating: 4.0, fastPayout: true, bonusValue: 1000,
      trackingUrl: 'https://example.com/go/expekt',
      review: 'Sätter tidiga linjer på SHL och HockeyAllsvenskan, vilket ger utrymme för den som följer laguppställningar. Sajten är enkel snarare än påkostad, men allt fungerar som det ska.',
      plus: ['Tidiga hockeylinjer', 'Snabba uttag via Swish', 'Låg marginal på totaler'],
      minus: ['Enkelt gränssnitt utan livestatistik']
    },
    {
      rank: 8, name: 'Betfair', logo: logo('betfair', '#1A1A1A', '#FFB80C'),
      bonus: '0 % kommission första veckan', terms: 'Gäller nya kunder på börsen. Villkor gäller. 18+',
      usp: 'Spelbörs med bästa priser', payments: ['Trustly', 'Bankkort'],
      rating: 3.9, fastPayout: false, bonusValue: 0,
      trackingUrl: 'https://example.com/go/betfair',
      review: 'Börsen ger genomgående de bästa priserna på likvida marknader och du kan lägga egna odds. Kräver mer vana än en vanlig spelsida, och likviditeten är tunn på svenska serier.',
      plus: ['Bäst pris på storligor', 'Lägg egna odds', 'Ingen begränsning av vinnare'],
      minus: ['Tunn likviditet på svenska matcher']
    },
    {
      rank: 9, name: 'NordicBet', logo: logo('NordicBet', '#0F2F5B', '#8DC63F'),
      bonus: '100 % upp till 750 kr', terms: 'Gäller nya kunder. Omsättningskrav gäller. 18+',
      usp: 'Nordiskt fokus', payments: ['Swish', 'Trustly'],
      rating: 3.8, fastPayout: true, bonusValue: 750,
      trackingUrl: 'https://example.com/go/nordicbet',
      review: 'Nischat mot nordiska serier med fler spelformer på Allsvenskan än vad storleken antyder. Bloggen med analyser håller hyggig nivå. Bonusen är liten jämfört med konkurrenterna.',
      plus: ['Djupt utbud på nordiska ligor', 'Swish-uttag', 'Egna analyser'],
      minus: ['Låg bonusnivå']
    },
    {
      rank: 10, name: 'Bethard', logo: logo('Bethard', '#111318', '#F5D400'),
      bonus: '50 % upp till 500 kr', terms: 'Gäller nya kunder. Omsättningskrav gäller. 18+',
      usp: 'Enkel kupong för snabba spel', payments: ['Swish', 'Trustly'],
      rating: 3.6, fastPayout: false, bonusValue: 500,
      trackingUrl: 'https://example.com/go/bethard',
      review: 'Rakt gränssnitt som passar den som spelar enstaka matchodds. Utbudet räcker för storligorna men saknar djup i spelformer. Uttagen fungerar men handläggs manuellt vid större belopp.',
      plus: ['Snabb registrering', 'Ren kupong', 'Rimliga odds på matchresultat'],
      minus: ['Få spelformer per match']
    }
  ];
  window.SBBookmakers.forEach(function (b) { b.license = 'Svensk licens, Spelinspektionen'; });

  /* Varumärkesfärg för den stora logotypplattan, plus villkorsfakta per bolag. */
  var EXTRA = {
    'Unibet': ['#0F6B3D', '6x', '1.80', true],
    'Bet365': ['#0E5C44', '4x', '1.50', true],
    'Betsson': ['#20242B', '5x', '1.80', true],
    'Svenska Spel Sport & Casino': ['#002B57', '–', '1.20', true],
    'LeoVegas': ['#1B1B1B', '8x', '1.80', true],
    'ComeOn': ['#0B2A3A', '6x', '1.70', true],
    'Expekt': ['#15161A', '5x', '1.80', false],
    'Betfair': ['#1A1A1A', '–', '1.50', true],
    'NordicBet': ['#0B2445', '6x', '1.80', false],
    'Bethard': ['#0C0E13', '8x', '1.90', true]
  };
  window.SBBookmakers.forEach(function (b) {
    var e = EXTRA[b.name] || ['#1B2436', '–', '1.80', true];
    b.brand = e[0]; b.wagering = e[1]; b.minOdds = e[2]; b.app = e[3];
  });

  /* Kortdata för topplistan: kampanjbadge, andra bonusrad, uttagstest,
     betalningsflaggor och taggar för filterpills. */
  var CARD = {
    'Unibet': ['Toppval', 'FREE BETS', '500 kr', '10x omsättningskrav', 'Direkt med Swish', [1, 1, 1], ['Populära', 'Bonus', 'Free bets', 'Snabba uttag', 'Med Swish', 'Livebetting']],
    'Bet365': ['', '', '', '', '1 dag med Trustly', [0, 1, 1], ['Populära', 'Bonus', 'Livebetting', 'Odds boost']],
    'Betsson': ['Ny bonus', 'ODDS BOOST', '25 %', 'På kombinationer', 'Direkt med Swish', [1, 1, 1], ['Populära', 'Bonus', 'Snabba uttag', 'Med Swish', 'Odds boost']],
    'Svenska Spel Sport & Casino': ['', '', '', '', '1 min med Swish', [1, 0, 1], ['Populära', 'Snabba uttag', 'Med Swish', 'Livebetting']],
    'LeoVegas': ['', 'FREE BETS', '200 kr', '8x omsättningskrav', '5 min med Swish', [1, 1, 1], ['Populära', 'Bonus', 'Free bets', 'Snabba uttag', 'Med Swish']],
    'ComeOn': ['Nytt 2026', 'ODDS BOOST', '30 %', 'Från fyra objekt', 'Samma dag med Trustly', [1, 1, 1], ['Nya spelbolag', 'Bonus', 'Odds boost', 'Med Swish']],
    'Expekt': ['', '', '', '', '10 min med Swish', [1, 1, 1], ['Bonus', 'Snabba uttag', 'Med Swish']],
    'Betfair': ['', '', '', '', '1 dag med Trustly', [0, 1, 1], ['Populära', 'Odds boost', 'Livebetting']],
    'NordicBet': ['', 'FREE BETS', '100 kr', '6x omsättningskrav', '5 min med Swish', [1, 1, 1], ['Bonus', 'Free bets', 'Snabba uttag', 'Med Swish']],
    'Bethard': ['Nytt 2026', '', '', '', '1 dag med Trustly', [1, 1, 1], ['Nya spelbolag', 'Bonus', 'Med Swish']]
  };
  window.SBBookmakers.forEach(function (b) {
    var c = CARD[b.name] || ['', '', '', '', '', [1, 1, 1], ['Populära']];
    b.badge = c[0];
    b.bonus2Label = c[1]; b.bonus2Value = c[2]; b.bonus2Terms = c[3];
    b.payoutTest = c[4];
    b.hasSwish = !!c[5][0]; b.hasTrustly = !!c[5][1]; b.hasBankId = !!c[5][2]; b.hasLicense = true;
    b.tags = c[6];
    var m = /(\d[\d\s]*)\s*kr/i.exec(b.bonus);
    b.bonusValueText = m ? m[1].replace(/\s+/g, ' ').trim() + ' kr' : b.bonus;
  });

  var M = window.SBMarks || {};
  window.SBPayments = {
    'Swish': M.swish, 'Trustly': M.trustly, 'Bankkort': M.card, 'Apple Pay': M.applepay,
    'BankID': M.bankid, 'App': M.app, 'Snabba uttag': M.lightning, 'Mastercard': M.mastercard,
    'Klarna': M.klarna, 'Licens': M.license || M.bankid
  };
})();
