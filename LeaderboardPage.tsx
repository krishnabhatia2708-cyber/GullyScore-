import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Users, ChevronRight, Building } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TopBar } from '../components/layout/TopBar';
import { BottomNav } from '../components/layout/BottomNav';
import { Spinner } from '../components/ui/Spinner';

type Tab = 'runs' | 'wickets' | 'mvp' | 'sixes' | 'fours' | 'sr' | 'economy' | 'potm' | 'teams';

interface PlayerCareerStats {
  player_name: string;
  team_name: string;
  runs: number;
  balls_faced: number;
  wickets: number;
  balls_bowled: number;
  runs_conceded: number;
  fours: number;
  sixes: number;
  strike_rate: number;
  economy: number;
  potm_awards: number;
  matches_played: number;
  average: number;
  highest_score: number;
}

interface TeamStats {
  team_name: string;
  matches: number;
  wins: number;
  losses: number;
  points: number;
  nrr: number;
  win_percentage: number;
  total_runs: number;
  total_wickets: number;
}

export function LeaderboardPage() {
  const { navigate } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('runs');
  const [data, setData] = useState<PlayerCareerStats[]>([]);
  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);

    // Load player stats
    if (user) {
      const { data: stats } = await supabase
        .from('player_career_stats')
        .select('*')
        .eq('user_id', user.id);

      if (stats) {
        setData(stats.map(s => ({
          ...s,
          strike_rate: s.balls_faced > 0 ? (s.runs / s.balls_faced) * 100 : 0,
          economy: s.balls_bowled > 0 ? (s.runs_conceded / (s.balls_bowled / 6)) : 0,
        })));
      }
    }

    // Load all teams and calculate team stats
    await loadTeamStats();

    setLoading(false);
  };

  const loadTeamStats = async () => {
    if (!user) {
      // Load teams for public view
      const { data: teamsData } = await supabase.from('teams').select('*');
      if (teamsData) {
        setTeams(teamsData.map(t => ({
          team_name: t.name,
          matches: 0,
          wins: 0,
          losses: 0,
          points: 0,
          nrr: 0,
          win_percentage: 0,
          total_runs: 0,
          total_wickets: 0,
        })));
      }
      return;
    }

    // Load all teams for this user
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .eq('user_id', user.id);

    if (!teamsData || teamsData.length === 0) {
      setTeams([]);
      return;
    }

    // Load matches to calculate team stats
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED');

    const teamStatsMap: Record<string, TeamStats> = {};

    // Initialize all teams
    for (const team of teamsData) {
      teamStatsMap[team.id] = {
        team_name: team.name,
        matches: 0,
        wins: 0,
        losses: 0,
        points: 0,
        nrr: 0,
        win_percentage: 0,
        total_runs: 0,
        total_wickets: 0,
      };
    }

    // Calculate stats from matches
    if (matches) {
      for (const m of matches) {
        // Determine winner
        let winner = '';
        if (m.result) {
          if (m.result.includes('won by')) {
            winner = m.result.split(' won')[0].trim();
          }
        }

        // Find team A and team B in our map
        const teamAId = m.team_a_id;
        const teamBId = m.team_b_id;

        if (teamAId && teamStatsMap[teamAId]) {
          teamStatsMap[teamAId].matches++;
          teamStatsMap[teamAId].total_runs += (m.score1 || 0);
          teamStatsMap[teamAId].total_wickets += (m.wickets1 || 0);

          if (winner === m.team_a_name) {
            teamStatsMap[teamAId].wins++;
            teamStatsMap[teamAId].points += 2;
          } else if (winner && winner !== m.team_a_name) {
            teamStatsMap[teamAId].losses++;
          }
        }

        if (teamBId && teamStatsMap[teamBId]) {
          teamStatsMap[teamBId].matches++;
          teamStatsMap[teamBId].total_runs += (m.score2 || 0);
          teamStatsMap[teamBId].total_wickets += (m.wickets2 || 0);

          if (winner === m.team_b_name) {
            teamStatsMap[teamBId].wins++;
            teamStatsMap[teamBId].points += 2;
          } else if (winner && winner !== m.team_b_name) {
            teamStatsMap[teamBId].losses++;
          }
        }
      }
    }

    // Calculate win percentage and sort
    const teamStatsList = Object.values(teamStatsMap).map(t => ({
      ...t,
      win_percentage: t.matches > 0 ? (t.wins / t.matches) * 100 : 0,
      nrr: t.matches > 0 ? ((t.total_runs - t.total_wickets * 10) / t.matches) : 0,
    }));

    // Sort by points, then NRR
    teamStatsList.sort((a, b) => b.points - a.points || b.nrr - a.nrr);

    setTeams(teamStatsList);
  };

  const getSortedData = () => {
    const sorted = [...data];

    switch (tab) {
      case 'runs':
        return sorted.sort((a, b) => b.runs - a.runs || b.strike_rate - a.strike_rate);
      case 'wickets':
        return sorted.sort((a, b) => b.wickets - a.wickets || a.economy - b.economy);
      case 'mvp':
        return sorted.sort((a, b) => {
          const scoreA = a.runs + a.wickets * 25 + a.potm_awards * 50;
          const scoreB = b.runs + b.wickets * 25 + b.potm_awards * 50;
          return scoreB - scoreA;
        });
      case 'sixes':
        return sorted.sort((a, b) => b.sixes - a.sixes);
      case 'fours':
        return sorted.sort((a, b) => b.fours - a.fours);
      case 'sr':
        return sorted.filter(p => p.balls_faced >= 10).sort((a, b) => b.strike_rate - a.strike_rate);
      case 'economy':
        return sorted.filter(p => p.balls_bowled >= 12).sort((a, b) => a.economy - b.economy);
      case 'potm':
        return sorted.sort((a, b) => b.potm_awards - a.potm_awards);
      default:
        return sorted;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <TopBar title="Rankings" showBack backTo="dashboard" />

      <div className="px-4 max-w-2xl mx-auto pt-4 space-y-4">
        {/* Tab Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(['teams', 'runs', 'wickets', 'mvp', 'potm', 'sixes', 'fours', 'sr', 'economy'] as Tab[]).map(t => {
            const labels: Record<Tab, string> = {
              teams: 'Teams',
              runs: 'Runs',
              wickets: 'Wickets',
              mvp: 'MVP',
              potm: 'POTM',
              sixes: 'Sixes',
              fours: 'Fours',
              sr: 'Strike Rate',
              economy: 'Best Eco',
            };

            const colors: Record<Tab, string> = {
              teams: '#EAB308',
              runs: '#F59E0B',
              wickets: '#A855F7',
              mvp: '#EAB308',
              potm: '#F59E0B',
              sixes: '#A855F7',
              fours: '#3B82F6',
              sr: '#10B981',
              economy: '#EC4899',
            };

            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tab === t ? 'text-black' : 'bg-gray-900 text-gray-400'
                }`}
                style={tab === t ? { backgroundColor: colors[t] } : {}}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : tab === 'teams' ? (
          // Team Rankings
          teams.length === 0 ? (
            <div className="gs-card p-8 text-center">
              <Building className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No teams found</p>
              <button onClick={() => navigate('teams')} className="gs-btn-primary text-sm px-4 py-2">
                Create Teams
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="wait">
                <motion.div key="teams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  {teams.map((team, idx) => (
                    <motion.div
                      key={team.team_name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`gs-card p-4 ${
                        idx === 0 ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-transparent' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                          idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {idx + 1}
                        </div>

                        {/* Team Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                              {team.team_name}
                            </span>
                            {idx === 0 && (
                              <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                Top Team
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <span>{team.matches} matches</span>
                            <span className="text-emerald-400">{team.wins}W</span>
                            <span className="text-red-400">{team.losses}L</span>
                          </div>
                        </div>

                        {/* Points */}
                        <div className="text-right">
                          <div className="text-2xl font-black text-amber-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                            {team.points}
                          </div>
                          <div className="text-xs text-gray-500">Points</div>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-800">
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{team.win_percentage.toFixed(0)}%</div>
                          <div className="text-xs text-gray-500">Win %</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-white">{team.nrr.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">NRR</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-amber-400">{team.total_runs}</div>
                          <div className="text-xs text-gray-500">Runs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-purple-400">{team.total_wickets}</div>
                          <div className="text-xs text-gray-500">Wkts</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )
        ) : (
          // Player Rankings
          getSortedData().length === 0 ? (
            <div className="gs-card p-8 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No matches played yet</p>
              <button onClick={() => navigate('match-wizard')} className="gs-btn-primary text-sm px-4 py-2">
                Start a Match
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  {getSortedData().map((player, idx) => (
                    <motion.div
                      key={player.player_name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => navigate('player-profile', { playerName: player.player_name })}
                      className={`gs-card p-3 flex items-center gap-3 cursor-pointer hover:border-gray-700 transition-all ${
                        idx === 0 ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-transparent' : ''
                      }`}
                    >
                      {/* Rank */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center relative font-bold ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                        idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                        idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {idx + 1}
                        {idx === 0 && <Crown className="w-3 h-3 text-amber-500 absolute -top-1 -right-1" />}
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold truncate" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                            {player.player_name}
                          </span>
                          {idx === 0 && tab === 'runs' && (
                            <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                              Orange Cap
                            </span>
                          )}
                          {idx === 0 && tab === 'wickets' && (
                            <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-0.5 rounded-full">
                              Purple Cap
                            </span>
                          )}
                          {idx === 0 && tab === 'potm' && (
                            <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">
                              POTM Leader
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 text-xs flex items-center gap-2">
                          <span>{player.team_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{player.matches_played} matches</span>
                          {player.potm_awards > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-yellow-500">{player.potm_awards} POTM</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Value */}
                      <div className="text-right">
                        <div className={`text-xl font-black ${
                          tab === 'runs' ? 'text-amber-500' :
                          tab === 'wickets' ? 'text-purple-500' :
                          tab === 'mvp' ? 'text-yellow-500' :
                          tab === 'potm' ? 'text-amber-400' :
                          tab === 'sixes' ? 'text-purple-400' :
                          tab === 'fours' ? 'text-blue-400' :
                          tab === 'sr' ? 'text-emerald-400' :
                          'text-pink-400'
                        }`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                          {tab === 'runs' && player.runs}
                          {tab === 'wickets' && player.wickets}
                          {tab === 'mvp' && (player.runs + player.wickets * 25 + player.potm_awards * 50)}
                          {tab === 'potm' && player.potm_awards}
                          {tab === 'sixes' && player.sixes}
                          {tab === 'fours' && player.fours}
                          {tab === 'sr' && player.strike_rate.toFixed(1)}
                          {tab === 'economy' && player.economy.toFixed(1)}
                        </div>
                        {tab === 'runs' && <div className="text-gray-500 text-xs">SR: {player.strike_rate.toFixed(0)}</div>}
                        {tab === 'wickets' && <div className="text-gray-500 text-xs">Eco: {player.economy.toFixed(1)}</div>}
                        {tab === 'sr' && <div className="text-gray-500 text-xs">{player.runs} runs</div>}
                        {tab === 'economy' && <div className="text-gray-500 text-xs">{player.wickets} wkts</div>}
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )
        )}
      </div>

      <BottomNav />
    </div>
  );
}
