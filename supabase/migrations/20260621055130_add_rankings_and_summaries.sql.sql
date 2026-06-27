-- Player career stats table (aggregated from all matches)
CREATE TABLE IF NOT EXISTS player_career_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  team_name TEXT DEFAULT '',
  matches_played INTEGER DEFAULT 0,
  innings_played INTEGER DEFAULT 0,
  not_outs INTEGER DEFAULT 0,
  runs INTEGER DEFAULT 0,
  balls_faced INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  strike_rate DECIMAL DEFAULT 0,
  average DECIMAL DEFAULT 0,
  fifties INTEGER DEFAULT 0,
  hundreds INTEGER DEFAULT 0,
  fours INTEGER DEFAULT 0,
  sixes INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  overs_bowled DECIMAL DEFAULT 0,
  balls_bowled INTEGER DEFAULT 0,
  runs_conceded INTEGER DEFAULT 0,
  best_bowling TEXT DEFAULT '',
  economy DECIMAL DEFAULT 0,
  bowling_average DECIMAL DEFAULT 0,
  five_wicket_hauls INTEGER DEFAULT 0,
  potm_awards INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id)
);

ALTER TABLE player_career_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_stats" ON player_career_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_stats" ON player_career_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_stats" ON player_career_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Match summaries table
CREATE TABLE IF NOT EXISTS match_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  potm_name TEXT DEFAULT '',
  potm_team TEXT DEFAULT '',
  potm_runs INTEGER DEFAULT 0,
  potm_balls INTEGER DEFAULT 0,
  potm_wickets INTEGER DEFAULT 0,
  potm_fours INTEGER DEFAULT 0,
  potm_sixes INTEGER DEFAULT 0,
  potm_sr DECIMAL DEFAULT 0,
  potm_reason TEXT DEFAULT '',
  top_batter_name TEXT DEFAULT '',
  top_batter_runs INTEGER DEFAULT 0,
  top_batter_balls INTEGER DEFAULT 0,
  top_bowler_name TEXT DEFAULT '',
  top_bowler_wickets INTEGER DEFAULT 0,
  top_bowler_runs INTEGER DEFAULT 0,
  highest_partnership TEXT DEFAULT '',
  total_boundaries INTEGER DEFAULT 0,
  total_sixes INTEGER DEFAULT 0,
  best_over TEXT DEFAULT '',
  match_report TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_summaries" ON match_summaries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_summaries" ON match_summaries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_summaries" ON match_summaries FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Add foreign key to players table for player_name reference
ALTER TABLE players ADD COLUMN IF NOT EXISTS career_stats_id UUID REFERENCES player_career_stats(id);