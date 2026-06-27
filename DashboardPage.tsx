import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Activity, Trophy, ChevronRight, Users, Zap, Play, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Match, Team } from '../types';
import { TopBar } from '../components/layout/TopBar';
import { BottomNav } from '../components/layout/BottomNav';
import { Spinner } from '../components/ui/Spinner';

interface MatchSummary {
  potm_name: string;
  potm_team: string;
  potm_runs: number;
  potm_wickets: number;
}

interface PlayerCareerStats {
  player_name: string;
  team_name: string;
  runs: number;
  wickets: number;
  potm_awards: number;
  matches_played: number;
}

function formatOvers(balls: number, overs: number): string {
  const completedOvers = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${completedOvers}.${remainingBalls}/${overs}`;
}

function MatchCard({ match, summary, onClick }: { match: Match; summary?: MatchSummary; onClick: () => void }) {
  const isLive = match.status === 'LIVE' || match.status === 'INNINGS_BREAK';
  const currentScore = match.innings === 1
    ? `${match.score1}/${match.wickets1}`
    : `${match.score2}/${match.wickets2}`;
  const currentBalls = match.innings === 1 ? match.balls1 : match.balls2;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="gs-card p-4 w-full text-left transition-all hover:border-gray-700"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="gs-badge-live">LIVE</span>
          ) : match.status === 'COMPLETED' ? (
            <span className="bg-gray-700 text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-full">COMPLETED</span>
          ) : (
            <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full">SETUP</span>
          )}
          <span className="text-gray-500 text-xs">{match.overs} overs</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-bold text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {match.batting_team || match.team_a_name}
          </div>
          <div className="text-3xl font-black text-amber-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {currentScore}
          </div>
          {isLive && (
            <div className="text-gray-500 text-xs mt-1">{formatOvers(currentBalls, match.overs)}</div>
          )}
        </div>
        <div className="text-gray-500 font-bold text-sm px-3">VS</div>
        <div className="flex-1 text-right">
          <div className="font-bold text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {match.bowling_team || match.team_b_name}
          </div>
          {match.innings >= 2 && (
            <div className="text-2xl font-black text-gray-300" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {match.score1}/{match.wickets1}
            </div>
          )}
          {match.target && match.status !== 'COMPLETED' && (
            <div className="text-xs text-amber-400 mt-1">Target: {match.target}</div>
          )}
        </div>
      </div>

      {/* POTM Badge */}
      {summary?.potm_name && match.status === 'COMPLETED' && (
        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-amber-400 text-sm font-semibold">POTM: {summary.potm_name}</span>
          {summary.potm_runs > 0 && <span className="text-gray-500 text-xs">{summary.potm_runs} runs</span>}
          {summary.potm_wickets > 0 && <span className="text-gray-500 text-xs">{summary.potm_wickets} wkts</span>}
        </div>
      )}

      {match.result && !summary?.potm_name && (
        <div className="mt-3 pt-3 border-t border-gray-800 text-sm text-emerald-400 font-semibold">
          {match.result}
        </div>
      )}
    </motion.button>
  );
}

export function DashboardPage() {
  const { user, profile } = useAuth();
  const { navigate } = useApp();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [summaries, setSummaries] = useState<Record<string, MatchSummary>>({});
  const [topPlayers, setTopPlayers] = useState<PlayerCareerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const [matchRes, teamRes] = await Promise.all([
      supabase.from('matches').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('teams').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);

    if (matchRes.data) {
      setMatches(matchRes.data);

      // Load summaries for completed matches
      const completedIds = matchRes.data.filter(m => m.status === 'COMPLETED').map(m => m.id);
      if (completedIds.length > 0) {
        const { data: summaryData } = await supabase
          .from('match_summaries')
          .select('match_id, potm_name, potm_team, potm_runs, potm_wickets')
          .in('match_id', completedIds);

        if (summaryData) {
          const summaryMap: Record<string, MatchSummary> = {};
          summaryData.forEach(s => {
            summaryMap[s.match_id] = {
              potm_name: s.potm_name,
              potm_team: s.potm_team,
              potm_runs: s.potm_runs,
              potm_wickets: s.potm_wickets,
            };
          });
          setSummaries(summaryMap);
        }
      }
    }

    if (teamRes.data) setTeams(teamRes.data);

    // Load top players for rankings preview
    const { data: statsData } = await supabase
      .from('player_career_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('runs', { ascending: false })
      .limit(5);

    if (statsData) setTopPlayers(statsData);

    setLoading(false);
  };

  const liveMatches = matches.filter(m => m.status === 'LIVE' || m.status === 'INNINGS_BREAK');
  const completedMatches = matches.filter(m => m.status === 'COMPLETED');
  const ongoingMatch = liveMatches[0];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 pb-24">
        <TopBar />
        <div className="px-4 pt-8 pb-6 max-w-lg mx-auto text-center">
          <div className="text-6xl mb-4">🏏</div>
          <h1 className="text-3xl font-black mb-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Welcome to GullyScore
          </h1>
          <p className="text-gray-400 mb-8">Login to track your matches, teams, and tournaments.</p>
          <button onClick={() => navigate('auth')} className="gs-btn-primary w-full py-4 text-lg">
            Login / Register
          </button>
          <button onClick={() => navigate('leaderboard')} className="gs-btn-secondary w-full py-4 text-lg mt-3">
            View Public Rankings
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <TopBar />

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-6">
        {/* Continue Match Banner */}
        {ongoingMatch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-600/30 to-orange-600/20 border border-amber-500/40 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/30 flex items-center justify-center">
                  <Play className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-amber-400 font-semibold">ONGOING MATCH</div>
                  <div className="font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {ongoingMatch.team_a_name} vs {ongoingMatch.team_b_name}
                  </div>
                  <div className="text-amber-300 font-bold">
                    {ongoingMatch.innings === 1 ? ongoingMatch.score1 : ongoingMatch.score2}/
                    {ongoingMatch.innings === 1 ? ongoingMatch.wickets1 : ongoingMatch.wickets2}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('live-scoring', { matchId: ongoingMatch.id })}
                className="gs-btn-primary px-4 py-2 text-sm"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-gray-500 text-sm">{greeting()},</p>
          <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {profile?.name || 'Cricketer'}
          </h1>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('match-wizard')}
            className="gs-card-premium p-5 flex flex-col items-start gap-3 hover:border-amber-500/40 transition-all shine"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>New Match</div>
              <div className="text-gray-500 text-xs">Start scoring</div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate('teams')}
            className="gs-card-premium p-5 flex flex-col items-start gap-3 hover:border-emerald-500/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>My Teams</div>
              <div className="text-gray-500 text-xs">{teams.length} team{teams.length !== 1 ? 's' : ''}</div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('tournaments')}
            className="gs-card p-5 flex flex-col items-start gap-3 hover:border-yellow-500/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Tournaments</div>
              <div className="text-gray-500 text-xs">Manage events</div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            onClick={() => navigate('leaderboard')}
            className="gs-card p-5 flex flex-col items-start gap-3 hover:border-blue-500/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Rankings</div>
              <div className="text-gray-500 text-xs">Orange & Purple Cap</div>
            </div>
          </motion.button>
        </div>

        {/* Top Players Preview */}
        {topPlayers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="gs-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <Star className="w-4 h-4 text-amber-500" />
                Top Performers
              </h3>
              <button onClick={() => navigate('leaderboard')} className="text-amber-500 text-xs font-semibold">
                View All
              </button>
            </div>
            <div className="space-y-2">
              {topPlayers.slice(0, 3).map((p, idx) => (
                <div key={p.player_name} className="flex items-center gap-3 p-2 rounded-xl bg-gray-800/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                    idx === 1 ? 'bg-gray-500/20 text-gray-300' :
                    'bg-orange-500/20 text-orange-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{p.player_name}</div>
                    <div className="text-xs text-gray-500">{p.team_name || 'Unknown'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-bold">{p.runs} <span className="text-gray-500 text-xs">runs</span></div>
                    {p.potm_awards > 0 && (
                      <div className="text-xs text-yellow-500">{p.potm_awards} POTM</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Live Matches */}
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <>
            {liveMatches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    <Activity className="w-5 h-5 text-red-400" />
                    Live Matches
                  </h2>
                </div>
                <div className="space-y-3">
                  {liveMatches.map(m => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      onClick={() => navigate('live-scoring', { matchId: m.id })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Matches */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Recent Matches</h2>
              </div>

              {completedMatches.length === 0 && liveMatches.length === 0 ? (
                <div className="gs-card p-8 text-center">
                  <div className="text-4xl mb-3">🏏</div>
                  <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>No Matches Yet</h3>
                  <p className="text-gray-500 text-sm mb-4">Start your first match to see it here</p>
                  <button onClick={() => navigate('match-wizard')} className="gs-btn-primary text-sm px-6 py-2.5">
                    Start a Match
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedMatches.slice(0, 5).map(m => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      summary={summaries[m.id]}
                      onClick={() => navigate('match-summary', { matchId: m.id })}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Admin shortcut */}
        {profile?.is_admin && (
          <button
            onClick={() => navigate('admin')}
            className="w-full bg-gradient-to-r from-amber-900/50 to-amber-800/30 border border-amber-700/50 rounded-2xl p-4 flex items-center justify-between"
          >
            <span className="font-bold text-amber-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Admin Dashboard</span>
            <ChevronRight className="w-4 h-4 text-amber-500" />
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
