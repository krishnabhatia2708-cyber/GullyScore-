import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, TrendingUp, Medal, Award } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TopBar } from '../components/layout/TopBar';
import { Spinner } from '../components/ui/Spinner';
import { BottomNav } from '../components/layout/BottomNav';

interface PlayerCareerStats {
  player_name: string;
  team_name: string;
  matches_played: number;
  innings_played: number;
  not_outs: number;
  runs: number;
  balls_faced: number;
  highest_score: number;
  strike_rate: number;
  average: number;
  fifties: number;
  hundreds: number;
  fours: number;
  sixes: number;
  wickets: number;
  balls_bowled: number;
  runs_conceded: number;
  best_bowling: string;
  economy: number;
  five_wicket_hauls: number;
  potm_awards: number;
}

interface PotmMatch {
  match_id: string;
  date: string;
  team_a: string;
  team_b: string;
  result: string;
  runs: number;
  wickets: number;
}

interface PotmSummaryRow {
  match_id: string;
  potm_runs: number;
  potm_wickets: number;
  matches: {
    created_at: string;
    team_a_name: string;
    team_b_name: string;
    result: string;
  } | null;
}

export function PlayerProfilePage() {
  const { params, navigate } = useApp();
  const { user } = useAuth();
  const playerName = params?.playerName;
  const [stats, setStats] = useState<PlayerCareerStats | null>(null);
  const [potmMatches, setPotmMatches] = useState<PotmMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerName && user) loadData();
    else setLoading(false);
  }, [playerName, user]);

  const loadData = async () => {
    if (!playerName || !user) return;

    setLoading(true);

    // Get career stats
    const { data: statsData } = await supabase
      .from('player_career_stats')
      .select('*')
      .eq('player_name', playerName)
      .eq('user_id', user.id)
      .maybeSingle();

    if (statsData) {
      setStats(statsData);

      // Get POTM matches for this player
      const { data: potmData } = await supabase
        .from('match_summaries')
        .select(`
          match_id,
          potm_runs,
          potm_wickets,
          matches!inner (
            created_at,
            team_a_name,
            team_b_name,
            result
          )
        `)
        .eq('potm_name', playerName)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (potmData) {
        const rows = potmData as unknown as PotmSummaryRow[];
        setPotmMatches(rows.map(p => ({
          match_id: p.match_id,
          date: p.matches?.created_at || '',
          team_a: p.matches?.team_a_name || '',
          team_b: p.matches?.team_b_name || '',
          result: p.matches?.result || '',
          runs: p.potm_runs,
          wickets: p.potm_wickets,
        })));
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <TopBar title="Player Profile" showBack backTo="leaderboard" />
        <div className="flex justify-center py-20"><Spinner /></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-950">
        <TopBar title="Player Profile" showBack backTo="leaderboard" />
        <div className="px-4 py-20 text-center text-gray-500">Player not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <TopBar title="Player Profile" showBack backTo="leaderboard" />

      <div className="px-4 max-w-2xl mx-auto pt-4 space-y-4">
        {/* Player Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="gs-card-premium p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-black text-2xl font-black">
              {playerName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {playerName}
              </h1>
              {stats.team_name && (
                <div className="text-gray-500 text-sm">{stats.team_name}</div>
              )}
              {/* POTM Count Badge */}
              {stats.potm_awards > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {stats.potm_awards} POTM Award{stats.potm_awards > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Career Overview */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card p-4 grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-2xl font-black text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {stats.matches_played}
            </div>
            <div className="text-gray-500 text-xs">Matches</div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {stats.runs}
            </div>
            <div className="text-gray-500 text-xs">Runs</div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {stats.wickets}
            </div>
            <div className="text-gray-500 text-xs">Wickets</div>
          </div>
          <div>
            <div className="text-2xl font-black text-yellow-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {stats.potm_awards}
            </div>
            <div className="text-gray-500 text-xs">POTM</div>
          </div>
        </motion.div>

        {/* Batting Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-gray-800 bg-gradient-to-r from-amber-500/10 to-transparent">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Batting Statistics</span>
          </div>
          <div className="grid grid-cols-3 gap-4 p-4">
            <div className="text-center">
              <div className="text-2xl font-black text-amber-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stats.runs}
              </div>
              <div className="text-gray-500 text-xs">Runs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stats.average.toFixed(1)}
              </div>
              <div className="text-gray-500 text-xs">Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stats.strike_rate.toFixed(1)}
              </div>
              <div className="text-gray-500 text-xs">Strike Rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stats.highest_score}
              </div>
              <div className="text-gray-500 text-xs">High Score</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stats.fifties}/{stats.hundreds}
              </div>
              <div className="text-gray-500 text-xs">50s/100s</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stats.fours}/{stats.sixes}
              </div>
              <div className="text-gray-500 text-xs">4s/6s</div>
            </div>
          </div>
        </motion.div>

        {/* Bowling Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-gray-800 bg-gradient-to-r from-purple-500/10 to-transparent">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Bowling Statistics</span>
          </div>
          <div className="grid grid-cols-3 gap-4 p-4">
            <div className="text-center">
              <div className="text-2xl font-black text-purple-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stats.wickets}
              </div>
              <div className="text-gray-500 text-xs">Wickets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stats.economy.toFixed(1)}
              </div>
              <div className="text-gray-500 text-xs">Economy</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stats.best_bowling || '-'}
              </div>
              <div className="text-gray-500 text-xs">Best Bowling</div>
            </div>
          </div>
        </motion.div>

        {/* POTM Matches */}
        {potmMatches.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b border-gray-800 bg-gradient-to-r from-yellow-500/10 to-transparent">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>POTM Performances</span>
            </div>
            <div className="divide-y divide-gray-800">
              {potmMatches.map(m => (
                <button
                  key={m.match_id}
                  onClick={() => navigate('match-summary', { matchId: m.match_id })}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-900/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {m.team_a} vs {m.team_b}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(m.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {m.runs > 0 && <span className="text-amber-400 font-bold">{m.runs} runs</span>}
                      {m.wickets > 0 && <span className="text-purple-400 font-bold">{m.wickets} wkts</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-yellow-500">
                      <Trophy className="w-3 h-3" />
                      POTM
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Achievements */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Medal className="w-4 h-4 text-yellow-500" />
            <span className="font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Achievements</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.runs >= 100 && (
              <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full">
                Century Club - {stats.runs} runs
              </span>
            )}
            {stats.runs >= 500 && (
              <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full">
                500 Runs Club
              </span>
            )}
            {stats.wickets >= 10 && (
              <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold px-3 py-1 rounded-full">
                10 Wickets
              </span>
            )}
            {stats.wickets >= 50 && (
              <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold px-3 py-1 rounded-full">
                50 Wickets Club
              </span>
            )}
            {stats.sixes >= 10 && (
              <span className="bg-blue-500/20 text-blue-400 text-xs font-semibold px-3 py-1 rounded-full">
                {stats.sixes} Sixes
              </span>
            )}
            {stats.potm_awards >= 1 && (
              <span className="bg-yellow-500/20 text-yellow-400 text-xs font-semibold px-3 py-1 rounded-full">
                Player of the Match Winner
              </span>
            )}
            {stats.potm_awards >= 5 && (
              <span className="bg-yellow-500/20 text-yellow-400 text-xs font-semibold px-3 py-1 rounded-full">
                POTM Legend - {stats.potm_awards} Awards
              </span>
            )}
            {stats.hundreds >= 1 && (
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full">
                Centurion - {stats.hundreds} Hundred{stats.hundreds > 1 ? 's' : ''}
              </span>
            )}
            {stats.five_wicket_hauls >= 1 && (
              <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold px-3 py-1 rounded-full">
                5 Wicket Haul
              </span>
            )}
            {stats.matches_played >= 10 && (
              <span className="bg-gray-500/20 text-gray-400 text-xs font-semibold px-3 py-1 rounded-full">
                Veteran - {stats.matches_played} Matches
              </span>
            )}
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
