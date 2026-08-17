import type { ApiFixtureItem, ApiTeamItem } from "./apisports.ts";
import {
  currentScore,
  sportLabel,
  type SportSlug,
} from "./apisports.ts";

export type FixtureRow = {
  fixture_id: number;
  kickoff: string;
  status: string;
  sport: string;
  league_id: number;
  league_name: string;
  league_logo: string | null;
  home_team_id: number;
  home_name: string;
  home_logo: string | null;
  away_team_id: number;
  away_name: string;
  away_logo: string | null;
  home_score: number | null;
  away_score: number | null;
  season: number;
  raw: ApiFixtureItem;
  updated_at: string;
};

export type TeamRow = {
  id: number;
  sport: SportSlug;
  name: string;
  logo_url: string | null;
  updated_at: string;
};

export function mapFixtureRow(
  item: ApiFixtureItem,
  sport: SportSlug,
  now = new Date().toISOString()
): FixtureRow {
  const score = currentScore(item);
  return {
    fixture_id: item.fixture.id,
    kickoff: item.fixture.date,
    status: item.fixture.status.short,
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
    raw: item,
    updated_at: now,
  };
}

export function mapTeamRow(
  item: ApiTeamItem,
  sport: SportSlug,
  now = new Date().toISOString()
): TeamRow {
  return {
    id: item.team.id,
    sport,
    name: item.team.name,
    logo_url: item.team.logo,
    updated_at: now,
  };
}
