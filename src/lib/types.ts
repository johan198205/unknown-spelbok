export type UserRole = "user" | "admin";

export type BetResult = "open" | "win" | "loss" | "void" | "halfwin" | "halfloss";

export type BannerPlacement = "home" | "sheet" | "topplista" | "spelbolag";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface Sheet {
  id: string;
  user_id: string;
  name: string;
  start_bankroll: number;
  currency: string;
  is_public: boolean;
  created_at: string;
}

export interface Fixture {
  fixture_id: number;
  kickoff: string;
  status: string;
  sport: string;
  league_id: number | null;
  league_name: string | null;
  league_logo: string | null;
  home_team_id: number | null;
  home_name: string | null;
  home_logo: string | null;
  away_team_id: number | null;
  away_name: string | null;
  away_logo: string | null;
  home_score: number | null;
  away_score: number | null;
  updated_at: string;
}

export interface Bookmaker {
  id: string;
  rank: number;
  name: string;
  slug: string;
  logo_url: string | null;
  bonus: string | null;
  bonus_value: number;
  terms: string | null;
  usp: string | null;
  payments: string[];
  rating: number | null;
  fast_payout: boolean;
  tracking_url: string | null;
  review: string | null;
  plus: string[];
  minus: string[];
  active: boolean;
  updated_at: string;
}

export interface Bet {
  id: string;
  sheet_id: string;
  user_id: string;
  fixture_id: number | null;
  sport: string | null;
  league: string | null;
  match: string;
  pick: string;
  bookmaker_id: string | null;
  odds: number;
  stake: number;
  result: BetResult;
  payout: number;
  placed_at: string;
  settled_at: string | null;
  settled_by: "user" | "auto" | null;
  bookmakers?: Pick<Bookmaker, "id" | "name" | "logo_url"> | null;
}

export interface Competition {
  id: string;
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  active: boolean;
  created_at: string;
}

export interface CompetitionEntry {
  competition_id: string;
  user_id: string;
  joined_at: string;
}

export interface LeaderboardRow {
  competition_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bets_count: number;
  total_stake: number;
  netto: number;
  roi: number;
}

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  placement: BannerPlacement;
  sort: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
  author_id: string | null;
  updated_at: string;
  created_at: string;
}

export interface BetStats {
  bets: number;
  stake: number;
  payout: number;
  netto: number;
  roi: number;
  hitrate: number;
  avgOdds: number;
  avgStake: number;
  open: number;
}
