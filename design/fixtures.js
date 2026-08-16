/* Spelbok — datalager för matchdata.
   Strukturen speglar API-Football (api-sports.io) så att demodatan senare kan
   bytas mot riktiga anrop mot vår backend/cache utan att UI:t ändras.

   Fixture:
   { fixture_id, kickoff (ISO), status: 'NS'|'LIVE'|'FT',
     league: { id, name, logo },
     teams: { home: {team_id,name,logo}, away: {team_id,name,logo} } }
*/
(function () {
  var CDN = 'https://media.api-sports.io/football/';
  var NOW = new Date('2026-08-15T19:30:00').getTime();

  function svgLogo(text, bg, fg) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
      '<circle cx="20" cy="20" r="19" fill="' + bg + '"/>' +
      '<text x="20" y="26" font-family="Helvetica,Arial,sans-serif" font-size="15" font-weight="700" text-anchor="middle" fill="' + fg + '">' + text + '</text></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }
  function initials(name) {
    var parts = String(name).replace(/[^\wÅÄÖåäö\s]/g, ' ').split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  var LEAGUES = {
    'Premier League': { id: 39, sport: 'Fotboll', logo: svgLogo('PL', '#2B1B4A', '#C9A7FF'), logo_api: CDN + 'leagues/39.png' },
    'Allsvenskan': { id: 113, sport: 'Fotboll', logo: svgLogo('AS', '#12263A', '#7FB0FF'), logo_api: CDN + 'leagues/113.png' },
    'Champions League': { id: 2, sport: 'Fotboll', logo: svgLogo('CL', '#101B33', '#9FC2FF'), logo_api: CDN + 'leagues/2.png' },
    'SHL': { id: 9001, sport: 'Ishockey', logo: svgLogo('SHL', '#0F2530', '#5FE0F7'), logo_api: null }
  };

  /* [team_id, namn, klubbfärg, textfärg] — klubbmärken ritas lokalt så de fungerar
     offline och i publicerade artefakter; logo_api pekar på riktiga API-Football-URL:er. */
  var RAW = {
    'Premier League': [
      [40, 'Liverpool', '#C8102E', '#FFFFFF'], [42, 'Arsenal', '#EF0107', '#FFFFFF'], [50, 'Man City', '#6CABDD', '#0A2540'],
      [49, 'Chelsea', '#034694', '#FFFFFF'], [47, 'Tottenham', '#F2F4F8', '#132257'], [34, 'Newcastle', '#241F20', '#FFFFFF'],
      [36, 'Fulham', '#F2F4F8', '#111111'], [51, 'Brighton', '#0057B8', '#FFFFFF'], [66, 'Aston Villa', '#95BFE5', '#670E36'],
      [45, 'Everton', '#003399', '#FFFFFF']
    ],
    'Allsvenskan': [
      [377, 'Malmö FF', '#7BAFD4', '#0C2340'], [375, 'AIK', '#000000', '#F5C518'], [376, 'Djurgården', '#1B3D8F', '#E4002B'],
      [381, 'Hammarby', '#0E7A3C', '#FFFFFF'], [380, 'IFK Göteborg', '#0F4C9A', '#FFFFFF'], [378, 'Elfsborg', '#F5D400', '#1A1A1A'],
      [379, 'Häcken', '#F5D400', '#0A0A0A'], [382, 'Kalmar FF', '#C8102E', '#FFFFFF'], [2251, 'Sirius', '#1B62B5', '#FFFFFF'],
      [2455, 'Mjällby', '#F5D400', '#111111']
    ],
    'Champions League': [
      [541, 'Real Madrid', '#F0F2F6', '#00529F'], [157, 'Bayern', '#DC052D', '#FFFFFF'], [505, 'Inter', '#0B1560', '#FFFFFF'],
      [85, 'PSG', '#0B2A5B', '#E30613'], [529, 'Barcelona', '#A50044', '#FFCB05'], [530, 'Atlético', '#CB3524', '#FFFFFF'],
      [212, 'Porto', '#0B4EA2', '#FFFFFF'], [194, 'Ajax', '#D2122E', '#FFFFFF'], [211, 'Benfica', '#C8102E', '#FFFFFF'],
      [492, 'Napoli', '#12A0D7', '#FFFFFF']
    ],
    'SHL': [
      [9101, 'Frölunda', '#C8102E', '#FFFFFF'], [9102, 'Färjestad', '#0B4EA2', '#FFFFFF'], [9103, 'Skellefteå', '#B31B34', '#F5D400'],
      [9104, 'Luleå', '#1B62B5', '#FFFFFF'], [9105, 'Växjö', '#0E7A3C', '#FFFFFF'], [9106, 'HV71', '#F5D400', '#111111'],
      [9107, 'Rögle', '#0B7A8A', '#FFFFFF'], [9108, 'Leksand', '#1B3D8F', '#FFFFFF'], [9109, 'Brynäs', '#F5D400', '#111111'],
      [9110, 'Malmö Redhawks', '#C8102E', '#FFFFFF']
    ]
  };

  /* Riktiga klubbmärken ligger lokalt i crests/<team_id>.png (SHL ritas lokalt — inga
     fotbollsmärken finns för hockeyklubbarna). logo_api pekar på API-Footballs URL:er. */
  var CRESTS = null;
  function crest(id) {
    if (CRESTS === null) CRESTS = window.SBCrests || {};
    return CRESTS[id] || null;
  }

  var TEAMS = {}, BY_ID = {}, ALL = [];
  Object.keys(RAW).forEach(function (league) {
    TEAMS[league] = RAW[league].map(function (t) {
      var obj = {
        team_id: t[0], name: t[1], league: league, sport: LEAGUES[league].sport,
        logo_api: league === 'SHL' ? null : CDN + 'teams/' + t[0] + '.png'
      };
      /* Loggan slås upp först vid användning, så crests.js kan laddas i vilken ordning som helst. */
      Object.defineProperty(obj, 'logo', {
        enumerable: true,
        get: function () {
          if (!this._logo) this._logo = crest(t[0]) || svgLogo(initials(t[1]), t[2], t[3]);
          return this._logo;
        }
      });
      BY_ID[obj.team_id] = obj; ALL.push(obj);
      return obj;
    });
  });

  /* Kommande matcher: 4 omgångar per liga med rimliga avsparkstider. */
  var FIXTURES = [];
  var fid = 1200000;
  Object.keys(TEAMS).forEach(function (league, li) {
    var list = TEAMS[league];
    var n = list.length;
    /* Cirkelmetoden: lag 0 står still, övriga roteras — varje lag spelar en match per omgång. */
    var rot = list.slice(1);
    for (var round = 0; round < 4; round++) {
      var order = [list[0]].concat(rot.slice(round % rot.length), rot.slice(0, round % rot.length));
      for (var i = 0; i < n; i += 2) {
        var home = order[i], away = order[n - 1 - i];
        if (round % 2 === 1) { var tmp = home; home = away; away = tmp; }
        var day = 1 + round * 7 + li + (i % 4);
        var d = new Date(NOW + day * 86400000);
        d.setHours([15, 17, 19, 20][(i / 2 + round) % 4], [0, 15, 30, 45][(i + round) % 4], 0, 0);
        FIXTURES.push({
          fixture_id: ++fid, kickoff: d.toISOString(), ts: d.getTime(), status: 'NS',
          league: { id: LEAGUES[league].id, name: league, logo: LEAGUES[league].logo },
          teams: { home: home, away: away }
        });
      }
    }
  });
  FIXTURES.sort(function (a, b) { return a.ts - b.ts; });

  var PLACEHOLDER = {
    Fotboll: svgLogo('FB', '#141B29', '#7FB0FF'),
    Ishockey: svgLogo('IH', '#141B29', '#5FE0F7'),
    Tennis: svgLogo('TE', '#141B29', '#FFC96B'),
    neutral: svgLogo('?', '#141B29', '#5D6883')
  };

  window.SBFixtures = {
    NOW: NOW,
    leagues: LEAGUES,
    leagueNames: Object.keys(LEAGUES),
    teams: TEAMS,
    allTeams: ALL,
    fixtures: FIXTURES,
    teamById: function (id) { return BY_ID[id] || null; },
    leagueLogo: function (name) { return (LEAGUES[name] || {}).logo || PLACEHOLDER.neutral; },
    placeholder: function (sport) { return PLACEHOLDER[sport] || PLACEHOLDER.neutral; },
    searchTeams: function (q, limit) {
      var s = String(q || '').trim().toLowerCase();
      if (s.length < 1) return [];
      var starts = [], contains = [];
      ALL.forEach(function (t) {
        var n = t.name.toLowerCase();
        if (n.indexOf(s) === 0) starts.push(t);
        else if (n.indexOf(s) > 0) contains.push(t);
      });
      return starts.concat(contains).slice(0, limit || 6);
    },
    fixturesForTeam: function (teamId, limit) {
      return FIXTURES.filter(function (f) {
        return f.teams.home.team_id === teamId || f.teams.away.team_id === teamId;
      }).slice(0, limit || 4);
    },
    /* Historiska matcher används för att seeda demodata med fixture_id. */
    pastFixture: function (league, home, away, ts, id) {
      return {
        fixture_id: id, kickoff: new Date(ts).toISOString(), ts: ts, status: ts > NOW ? 'NS' : 'FT',
        league: { id: LEAGUES[league].id, name: league, logo: LEAGUES[league].logo },
        teams: { home: home, away: away }
      };
    }
  };
})();
