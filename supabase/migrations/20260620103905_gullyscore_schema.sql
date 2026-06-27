
-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  photo_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Allow public read for leaderboard
CREATE POLICY "public_read_profiles" ON profiles FOR SELECT TO anon USING (TRUE);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT DEFAULT '',
  color TEXT DEFAULT '#F59E0B',
  logo_emoji TEXT DEFAULT '🏏',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_teams" ON teams FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_teams" ON teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_teams" ON teams FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_teams" ON teams FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Batsman',
  batting_style TEXT DEFAULT 'Right Hand',
  bowling_style TEXT DEFAULT 'Right Arm Medium',
  jersey_number INTEGER,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_players" ON players FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_players" ON players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_players" ON players FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_players" ON players FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_a_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_b_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_a_name TEXT NOT NULL,
  team_b_name TEXT NOT NULL,
  overs INTEGER NOT NULL DEFAULT 10,
  venue TEXT DEFAULT '',
  toss_winner TEXT DEFAULT '',
  toss_decision TEXT DEFAULT 'BAT',
  batting_team TEXT DEFAULT '',
  bowling_team TEXT DEFAULT '',
  status TEXT DEFAULT 'SETUP',
  innings INTEGER DEFAULT 1,
  score1 INTEGER DEFAULT 0,
  wickets1 INTEGER DEFAULT 0,
  balls1 INTEGER DEFAULT 0,
  score2 INTEGER DEFAULT 0,
  wickets2 INTEGER DEFAULT 0,
  balls2 INTEGER DEFAULT 0,
  target INTEGER,
  striker TEXT DEFAULT '',
  non_striker TEXT DEFAULT '',
  current_bowler TEXT DEFAULT '',
  player_of_match TEXT DEFAULT '',
  result TEXT DEFAULT '',
  tournament_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_matches" ON matches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_matches" ON matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_matches" ON matches FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_matches" ON matches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Balls table (ball-by-ball)
CREATE TABLE IF NOT EXISTS balls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  innings INTEGER NOT NULL DEFAULT 1,
  over_num INTEGER NOT NULL DEFAULT 0,
  ball_num INTEGER NOT NULL DEFAULT 0,
  batsman TEXT NOT NULL DEFAULT '',
  bowler TEXT NOT NULL DEFAULT '',
  runs INTEGER DEFAULT 0,
  is_wicket BOOLEAN DEFAULT FALSE,
  wicket_type TEXT DEFAULT '',
  dismissed_batsman TEXT DEFAULT '',
  fielder TEXT DEFAULT '',
  is_wide BOOLEAN DEFAULT FALSE,
  is_no_ball BOOLEAN DEFAULT FALSE,
  is_bye BOOLEAN DEFAULT FALSE,
  is_leg_bye BOOLEAN DEFAULT FALSE,
  extra_runs INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE balls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_balls" ON balls FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_balls" ON balls FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_balls" ON balls FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_balls" ON balls FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format TEXT DEFAULT 'LEAGUE',
  overs INTEGER DEFAULT 10,
  status TEXT DEFAULT 'UPCOMING',
  start_date DATE,
  end_date DATE,
  prize TEXT DEFAULT '',
  location TEXT DEFAULT '',
  winner_team_id UUID,
  winner_team_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_tournaments" ON tournaments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_tournaments" ON tournaments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_tournaments" ON tournaments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_tournaments" ON tournaments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tournament teams
CREATE TABLE IF NOT EXISTS tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  nrr DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_tournament_teams" ON tournament_teams FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_tournament_teams" ON tournament_teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_tournament_teams" ON tournament_teams FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_tournament_teams" ON tournament_teams FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- App analytics (public stats)
CREATE TABLE IF NOT EXISTS app_stats (
  id TEXT PRIMARY KEY DEFAULT 'global',
  total_users INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  total_tournaments INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_stats" ON app_stats FOR SELECT USING (TRUE);
CREATE POLICY "admin_write_stats" ON app_stats FOR ALL TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Insert initial stats row
INSERT INTO app_stats (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
