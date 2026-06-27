import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity, Trophy, TrendingUp, AlertTriangle, Shield, BarChart3, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Match } from '../types';
import { TopBar } from '../components/layout/TopBar';
import { Spinner } from '../components/ui/Spinner';
import { showToast } from '../components/ui/Toast';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  liveMatches: number;
  totalTournaments: number;
  totalTeams: number;
  totalBalls: number;
  avgMatchDuration: number;
}

export function AdminPage() {
  const { profile } = useAuth();
  const { navigate } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.is_admin) {
      navigate('dashboard');
      return;
    }
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);

    const [
      usersRes,
      matchesRes,
      liveRes,
      tournamentsRes,
      teamsRes,
      ballsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('matches').select('id', { count: 'exact' }),
      supabase.from('matches').select('*').eq('status', 'LIVE'),
      supabase.from('tournaments').select('id', { count: 'exact' }),
      supabase.from('teams').select('id', { count: 'exact' }),
      supabase.from('balls').select('id', { count: 'exact' }),
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      activeUsers: usersRes.count || 0,
      totalMatches: matchesRes.count || 0,
      liveMatches: liveRes.data?.length || 0,
      totalTournaments: tournamentsRes.count || 0,
      totalTeams: teamsRes.count || 0,
      totalBalls: ballsRes.count || 0,
      avgMatchDuration: 0,
    });

    const recentRes = await supabase.from('matches').select('*').order('created_at', { ascending: false }).limit(10);
    setRecentMatches(recentRes.data || []);
    setLoading(false);
  };

  if (!profile?.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-6">
      <TopBar title="Admin Dashboard" />

      <div className="px-4 max-w-4xl mx-auto pt-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <>
            {/* Stats Grid */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="gs-card-premium p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {stats?.totalUsers || 0}
                </div>
                <div className="text-gray-500 text-xs">Total Users</div>
                <div className="text-emerald-400 text-xs mt-1">{stats?.activeUsers || 0} active</div>
              </div>

              <div className="gs-card-premium p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5 text-red-500" />
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                </div>
                <div className="text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {stats?.liveMatches || 0}
                </div>
                <div className="text-gray-500 text-xs">Live Matches</div>
              </div>

              <div className="gs-card-premium p-4">
                <div className="flex items-center justify-between mb-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {stats?.totalMatches || 0}
                </div>
                <div className="text-gray-500 text-xs">Total Matches</div>
              </div>

              <div className="gs-card-premium p-4">
                <div className="flex items-center justify-between mb-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {stats?.totalTournaments || 0}
                </div>
                <div className="text-gray-500 text-xs">Tournaments</div>
              </div>
            </motion.div>

            {/* Secondary Stats */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-3">
              <div className="gs-card p-4 text-center">
                <div className="text-xl font-bold text-white">{stats?.totalTeams || 0}</div>
                <div className="text-gray-500 text-xs">Teams</div>
              </div>
              <div className="gs-card p-4 text-center">
                <div className="text-xl font-bold text-white">{stats?.totalBalls || 0}</div>
                <div className="text-gray-500 text-xs">Balls Recorded</div>
              </div>
              <div className="gs-card p-4 text-center">
                <div className="text-xl font-bold text-emerald-500">
                  {stats && stats.totalUsers > 0 ? ((stats.activeUsers || 0) / stats.totalUsers * 100).toFixed(0) : 0}%
                </div>
                <div className="text-gray-500 text-xs">Engagement</div>
              </div>
            </motion.div>

            {/* Live Matches */}
            {(stats?.liveMatches ?? 0) > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card overflow-hidden border-red-500/30">
                <div className="flex items-center gap-2 p-3 border-b border-gray-800 bg-red-500/10">
                  <Activity className="w-4 h-4 text-red-500" />
                  <span className="font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Live Now</span>
                </div>
                <div className="p-4">
                  {recentMatches.filter(m => m.status === 'LIVE').map(m => (
                    <button
                      key={m.id}
                      onClick={() => navigate('live-scoring', { matchId: m.id })}
                      className="w-full text-left py-2 hover:bg-gray-800/50 transition-colors rounded-lg px-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {m.team_a_name} vs {m.team_b_name}
                        </span>
                        <span className="text-red-400 text-sm">
                          {m.score1}/{m.wickets1}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recent Matches */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card overflow-hidden">
              <div className="flex items-center gap-2 p-3 border-b border-gray-800">
                <BarChart3 className="w-4 h-4 text-gray-500" />
                <span className="font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Recent Matches</span>
              </div>
              <div className="divide-y divide-gray-800">
                {recentMatches.slice(0, 10).map(m => (
                  <button
                    key={m.id}
                    onClick={() => navigate('scorecard', { matchId: m.id })}
                    className="w-full p-3 flex items-center justify-between hover:bg-gray-900/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {m.team_a_name} vs {m.team_b_name}
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(m.created_at).toLocaleDateString()}</span>
                        {m.venue && (
                          <>
                            <MapPin className="w-3 h-3 ml-2" />
                            <span>{m.venue}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {m.score1}/{m.wickets1} vs {m.score2}/{m.wickets2}
                      </div>
                      <div className={`text-xs ${
                        m.status === 'LIVE' ? 'text-red-400' :
                        m.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {m.status}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Admin Actions */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card p-4">
              <h3 className="font-bold mb-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Admin Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => showToast('Feature coming soon!', 'info')}
                  className="w-full bg-gray-800 hover:bg-gray-700 p-3 rounded-xl flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Manage Users
                  </span>
                  <span className="text-gray-500">{stats?.totalUsers} users</span>
                </button>
                <button
                  onClick={() => showToast('Feature coming soon!', 'info')}
                  className="w-full bg-gray-800 hover:bg-gray-700 p-3 rounded-xl flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Manage Tournaments
                  </span>
                  <span className="text-gray-500">{stats?.totalTournaments} events</span>
                </button>
                <button
                  onClick={() => showToast('Feature coming soon!', 'info')}
                  className="w-full bg-gray-800 hover:bg-gray-700 p-3 rounded-xl flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Reported Content
                  </span>
                  <span className="text-gray-500">0 reports</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
