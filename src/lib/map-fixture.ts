import {
  currentScore,
  sportLabel,
  type ApiFixtureItem,
  type SportSlug,
} from "@/lib/apisports";

export function mapFixtureRow(
  item: ApiFixtureItem,
  sport: SportSlug,
  now = new Date().toISOString()
) {
  const score = currentScore(item);
  return {
    fixture_id: item.fixture.id,
    kickoff: item.fixture.date,
    status: item.fixture.status.short,
    elapsed: item.fixture.status.elapsed ?? null,
    extra: item.fixture.status.extra ?? null,
    sport: sportLabel(sport),
    league_id: item.league.id,
    league_name: item.league.name,
    league_logo: item.league.logo ?? null,
    home_team_id: item.teams.home.id,
    home_name: item.teams.home.name,
    home_logo: item.teams.home.logo,
    away_team_id: item.teams.away.id,
    away_name: item.teams.away.name,
    away_logo: item.teams.away.logo,
    home_score: score.home,
    away_score: score.away,
    season: item.league.season,
    raw: item as unknown as Record<string, unknown>,
    updated_at: now,
  };
}
