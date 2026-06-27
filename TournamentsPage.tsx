import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, Users, Calendar, MapPin, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Tournament, TournamentTeam } from '../types';
import { TopBar } from '../components/layout/TopBar';
import { BottomNav } from '../components/layout/BottomNav';
import { Spinner } from '../components/ui/Spinner';
import { showToast } from '../components/ui/Toast';

type Tab = 'active' | 'upcoming' | 'completed' | 'my';

function CreateTournamentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [format, setFormat] = useState<Tournament['format']>('LEAGUE_KNOCKOUT');
  const [teams, setTeams] = useState<number>(8);
  const [overs, setOvers] = useState(20);
  const [venue, setVenue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('tournaments').insert({
      name: name.trim(),
      format,
      overs,
      location: venue.trim() || null,
      user_id: user.id,
      status: 'UPCOMING',
    });

    if (error) {
      showToast('Failed to create tournament', 'error');
    } else {
      showToast('Tournament created!', 'success');
      onCreated();
      onClose();
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-gray-900 rounded-t-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Create Tournament</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="gs-label">Tournament Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Summer Cricket League 2024"
              className="gs-input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="gs-label">Format</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as Tournament['format'])}
                className="gs-input"
              >
                <option value="LEAGUE">League Only</option>
                <option value="KNOCKOUT">Knockout</option>
                <option value="LEAGUE_KNOCKOUT">League + Knockout</option>
              </select>
            </div>
            <div>
              <label className="gs-label">Teams</label>
              <select
                value={teams}
                onChange={e => setTeams(Number(e.target.value))}
                className="gs-input"
              >
                {[4, 6, 8, 10, 12, 16, 20, 24].map(n => (
                  <option key={n} value={n}>{n} Teams</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="gs-label">Overs per Side</label>
            <select
              value={overs}
              onChange={e => setOvers(Number(e.target.value))}
              className="gs-input"
            >
              {[10, 12, 15, 20, 25, 30, 40, 50].map(n => (
                <option key={n} value={n}>{n} Overs</option>
              ))}
            </select>
          </div>

          <div>
            <label className="gs-label">Venue (Optional)</label>
            <input
              type="text"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder="Ground name"
              className="gs-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="gs-btn-primary w-full py-4 mt-4"
          >
            {loading ? <Spinner size="sm" /> : 'Create Tournament'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function TournamentCard({ tournament, onClick }: { tournament: Tournament; onClick: () => void }) {
  const date = tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="gs-card p-4 w-full text-left hover:border-gray-700 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {tournament.status === 'LIVE' ? (
            <span className="gs-badge-live">LIVE</span>
          ) : tournament.status === 'COMPLETED' ? (
            <span className="bg-gray-700 text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-full">COMPLETED</span>
          ) : (
            <span className="bg-blue-500/20 text-blue-400 text-xs font-semibold px-2 py-0.5 rounded-full">UPCOMING</span>
          )}
          <span className="text-gray-500 text-xs">{tournament.overs} overs</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </div>

      <h3 className="font-bold text-lg mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
        {tournament.name}
      </h3>

      <div className="flex items-center gap-4 text-gray-500 text-xs">
        {(tournament.location || tournament.venue) && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {tournament.location || tournament.venue}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {date}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" /> {tournament.max_teams ?? 'Open'} teams
        </span>
      </div>

      <div className="mt-2 text-xs text-gray-600">
        {tournament.format?.replace(/_/g, ' ')} Format
      </div>
    </motion.button>
  );
}

export function TournamentsPage() {
  const { user } = useAuth();
  const { navigate } = useApp();
  const [tab, setTab] = useState<Tab>('active');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, [tab, user]);

  const loadTournaments = async () => {
    setLoading(true);
    let query = supabase.from('tournaments').select('*').order('created_at', { ascending: false });

    if (tab === 'active') {
      query = query.eq('status', 'LIVE');
    } else if (tab === 'upcoming') {
      query = query.eq('status', 'UPCOMING');
    } else if (tab === 'completed') {
      query = query.eq('status', 'COMPLETED');
    } else if (tab === 'my' && user) {
      query = query.eq('user_id', user.id);
    } else if (tab === 'my' && !user) {
      query = query.limit(0);
    }

    const { data } = await query;
    setTournaments(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <TopBar title="Tournaments" showBack backTo="dashboard" />

      <div className="px-4 max-w-2xl mx-auto pt-4 space-y-4">
        {/* Create Button */}
        {user && (
          <button onClick={() => setShowCreate(true)} className="gs-btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Create Tournament
          </button>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['active', 'upcoming', 'completed', 'my'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? 'bg-amber-500 text-black' : 'bg-gray-900 text-gray-400'
              }`}
            >
              {t === 'active' ? 'Live' : t === 'my' ? 'My Events' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tournaments List */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : tournaments.length === 0 ? (
          <div className="gs-card p-8 text-center">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No tournaments found</p>
            {user && tab === 'my' && (
              <button onClick={() => setShowCreate(true)} className="gs-btn-primary text-sm px-4 py-2">
                Create Your First Tournament
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map(t => (
              <TournamentCard
                key={t.id}
                tournament={t}
                onClick={() => navigate('tournament-detail', { tournamentId: t.id })}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      <AnimatePresence>
        {showCreate && <CreateTournamentModal onClose={() => setShowCreate(false)} onCreated={loadTournaments} />}
      </AnimatePresence>
    </div>
  );
}

export function TournamentDetailPage() {
  const { params } = useApp();
  const tournamentId = params?.tournamentId;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'standings' | 'fixtures' | 'stats'>('standings');

  useEffect(() => {
    if (tournamentId) loadData();
  }, [tournamentId]);

  const loadData = async () => {
    setLoading(true);
    const { data: tData } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
    if (tData) setTournament(tData);

    const { data: ttData } = await supabase.from('tournament_teams').select('*').eq('tournament_id', tournamentId);
    if (ttData) setTeams(ttData);

    setLoading(false);
  };

  // Calculate standings from matches (simplified placeholder)
  const standings = teams.map((tt, idx) => ({
    rank: idx + 1,
    teamName: tt.team_name || `Team ${idx + 1}`,
    played: 0,
    won: 0,
    lost: 0,
    nrr: 0,
    points: 0,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <TopBar title="Tournament" />
        <div className="flex justify-center py-20"><Spinner /></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-950">
        <TopBar title="Tournament" />
        <div className="px-4 py-20 text-center text-gray-500">Tournament not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <TopBar title={tournament.name} showBack backTo="tournaments" />

      <div className="px-4 max-w-2xl mx-auto pt-4 space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="gs-card-premium p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {tournament.name}
              </h1>
              <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                <MapPin className="w-3 h-3" />
                <span>{tournament.location || tournament.venue || 'Venue TBA'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-800">
            <div className="text-center">
              <div className="text-xl font-bold text-amber-500">{tournament.max_teams ?? (teams.length || '-')}</div>
              <div className="text-gray-500 text-xs">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">{tournament.overs}</div>
              <div className="text-gray-500 text-xs">Overs</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-emerald-400">{tournament.format?.replace(/_/g, ' ')}</div>
              <div className="text-gray-500 text-xs">Format</div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex bg-gray-900 rounded-xl p-1">
          {(['standings', 'fixtures', 'stats'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? 'bg-amber-500 text-black' : 'text-gray-400'
              }`}
            >
              {t === 'standings' ? 'Standings' : t === 'fixtures' ? 'Fixtures' : 'Stats'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'standings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs bg-gray-900/50">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Team</th>
                  <th className="text-center p-3">P</th>
                  <th className="text-center p-3">W</th>
                  <th className="text-center p-3">L</th>
                  <th className="text-right p-3">NRR</th>
                  <th className="text-right p-3">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, idx) => (
                  <tr key={idx} className="border-t border-gray-800/50">
                    <td className="p-3 text-gray-500">{idx + 1}</td>
                    <td className="p-3 font-medium text-white">{s.teamName}</td>
                    <td className="text-center p-3 text-gray-400">{s.played}</td>
                    <td className="text-center p-3 text-emerald-500 font-semibold">{s.won}</td>
                    <td className="text-center p-3 text-red-400">{s.lost}</td>
                    <td className="text-right p-3 text-gray-400">{s.nrr.toFixed(3)}</td>
                    <td className="text-right p-3 text-amber-500 font-bold">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {tab === 'fixtures' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Fixtures will appear here once teams are registered</p>
          </motion.div>
        )}

        {tab === 'stats' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="gs-card p-4 mb-4">
              <h3 className="font-bold mb-3 text-amber-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Orange Cap (Most Runs)
              </h3>
              <p className="text-gray-500 text-sm">Statistics will appear after matches are played</p>
            </div>
            <div className="gs-card p-4">
              <h3 className="font-bold mb-3 text-purple-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Purple Cap (Most Wickets)
              </h3>
              <p className="text-gray-500 text-sm">Statistics will appear after matches are played</p>
            </div>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
