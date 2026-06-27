export interface Profile {
  id: string;
  name: string;
  email?: string;
  photo_url?: string;
  is_admin: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  user_id: string;
  name: string;
  abbreviation: string;
  color: string;
  logo_emoji: string;
  players?: Player[];
  created_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  user_id: string;
  name: string;
  role: string;
  batting_style: string;
  bowling_style: string;
  jersey_number?: number;
  photo_url?: string;
  created_at: string;
}

export interface Match {
  id: string;
  user_id: string;
  team_a_id?: string;
  team_b_id?: string;
  team_a_name: string;
  team_b_name: string;
  overs: number;
  venue?: string;
  toss_winner: string;
  toss_decision: 'BAT' | 'BOWL';
  batting_team: string;
  bowling_team: string;
  status: 'SETUP' | 'LIVE' | 'INNINGS_BREAK' | 'COMPLETED';
  innings: number;
  score1: number;
  wickets1: number;
  balls1: number;
  score2: number;
  wickets2: number;
  balls2: number;
  target?: number;
  striker: string;
  non_striker: string;
  current_bowler: string;
  player_of_match?: string;
  result?: string;
  tournament_id?: string;
  created_at: string;
  completed_at?: string;
}

export interface Ball {
  id: string;
  match_id: string;
  user_id: string;
  innings: number;
  over_num: number;
  ball_num: number;
  batsman: string;
  bowler: string;
  runs: number;
  is_wicket: boolean;
  wicket_type: string;
  dismissed_batsman: string;
  fielder: string;
  is_wide: boolean;
  is_no_ball: boolean;
  is_bye: boolean;
  is_leg_bye: boolean;
  extra_runs: number;
  total_runs: number;
  created_at: string;
}

export interface Tournament {
  id: string;
  user_id: string;
  name: string;
  format: 'LEAGUE' | 'KNOCKOUT' | 'LEAGUE_KNOCKOUT' | 'GROUP_KNOCKOUT';
  overs: number;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  start_date?: string;
  end_date?: string;
  prize?: string;
  location?: string;
  venue?: string;
  max_teams?: number;
  winner_team_name?: string;
  created_at: string;
}

export interface TournamentTeam {
  id: string;
  tournament_id: string;
  team_id: string;
  team_name: string;
  user_id: string;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  nrr: number;
}

export interface BattingStats {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  is_out: boolean;
  wicket_type?: string;
  fielder?: string;
  bowler?: string;
  strike_rate: number;
}

export interface BowlingStats {
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  no_balls: number;
}

export interface MatchState {
  battingStats: Record<string, BattingStats>;
  bowlingStats: Record<string, BowlingStats>;
  fallOfWickets: { score: number; wicket: number; batsman: string }[];
  partnerships: { runs: number; balls: number; player1: string; player2: string }[];
  currentOver: Ball[];
  dismissedBatsmen: string[];
}

export type Page =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'teams'
  | 'team-detail'
  | 'match-wizard'
  | 'live-scoring'
  | 'scorecard'
  | 'match-summary'
  | 'match-history'
  | 'player-profile'
  | 'leaderboard'
  | 'tournaments'
  | 'tournament-detail'
  | 'admin';
