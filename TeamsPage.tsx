import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, ChevronRight, Trash2, Edit3, UserPlus, X, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Team, Player } from '../types';
import { TopBar } from '../components/layout/TopBar';
import { BottomNav } from '../components/layout/BottomNav';
import { showToast } from '../components/ui/Toast';
import { Spinner } from '../components/ui/Spinner';

const TEAM_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const TEAM_EMOJIS = ['🏏', '🦁', '🐯', '🦅', '⚡', '🔥', '💪', '🌟', '🐉', '🦊'];
const PLAYER_ROLES = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];
const BATTING_STYLES = ['Right Hand', 'Left Hand'];
const BOWLING_STYLES = ['Right Arm Fast', 'Right Arm Medium', 'Right Arm Off-Spin', 'Left Arm Fast', 'Left Arm Medium', 'Left Arm Spin', 'Leg-Spin'];

interface AddTeamModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editTeam?: Team | null;
}

function AddTeamModal({ onClose, onSuccess, editTeam }: AddTeamModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(editTeam?.name ?? '');
  const [abbr, setAbbr] = useState(editTeam?.abbreviation ?? '');
  const [color, setColor] = useState(editTeam?.color ?? TEAM_COLORS[0]);
  const [emoji, setEmoji] = useState(editTeam?.logo_emoji ?? TEAM_EMOJIS[0]);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setLoading(true);
    const data = { name: name.trim(), abbreviation: abbr.slice(0, 4).toUpperCase(), color, logo_emoji: emoji };
    const { error } = editTeam
      ? await supabase.from('teams').update(data).eq('id', editTeam.id)
      : await supabase.from('teams').insert({ ...data, user_id: user.id });
    setLoading(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editTeam ? 'Team updated!' : 'Team created!', 'success');
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-900 rounded-3xl w-full max-w-sm p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {editTeam ? 'Edit Team' : 'New Team'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Emoji picker */}
        <div className="mb-4">
          <label className="gs-label">Team Logo</label>
          <div className="flex flex-wrap gap-2">
            {TEAM_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  emoji === e ? 'bg-amber-500/30 border-2 border-amber-500' : 'bg-gray-800 border border-gray-700'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="gs-label">Team Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Green Warriors" className="gs-input" />
        </div>

        <div className="mb-4">
          <label className="gs-label">Abbreviation (max 4)</label>
          <input value={abbr} onChange={e => setAbbr(e.target.value.toUpperCase())} maxLength={4} placeholder="e.g. GW" className="gs-input" />
        </div>

        <div className="mb-6">
          <label className="gs-label">Team Color</label>
          <div className="flex gap-2 flex-wrap">
            {TEAM_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
              />
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={loading || !name.trim()} className="gs-btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <Spinner size="sm" /> : (editTeam ? 'Update Team' : 'Create Team')}
        </button>
      </motion.div>
    </div>
  );
}

interface AddPlayerModalProps {
  team: Team;
  onClose: () => void;
  onSuccess: () => void;
  editPlayer?: Player | null;
}

function AddPlayerModal({ team, onClose, onSuccess, editPlayer }: AddPlayerModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(editPlayer?.name ?? '');
  const [role, setRole] = useState(editPlayer?.role ?? 'Batsman');
  const [batting, setBatting] = useState(editPlayer?.batting_style ?? 'Right Hand');
  const [bowling, setBowling] = useState(editPlayer?.bowling_style ?? 'Right Arm Medium');
  const [jersey, setJersey] = useState(editPlayer?.jersey_number?.toString() ?? '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setLoading(true);
    const data = {
      name: name.trim(), role, batting_style: batting, bowling_style: bowling,
      jersey_number: jersey ? parseInt(jersey) : null,
      team_id: team.id, user_id: user.id,
    };
    const { error } = editPlayer
      ? await supabase.from('players').update(data).eq('id', editPlayer.id)
      : await supabase.from('players').insert(data);
    setLoading(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editPlayer ? 'Player updated!' : 'Player added!', 'success');
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-900 rounded-3xl w-full max-w-sm p-6 border border-gray-700 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {editPlayer ? 'Edit Player' : 'Add Player'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="gs-label">Player Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="gs-input" />
          </div>

          <div>
            <label className="gs-label">Jersey Number</label>
            <input value={jersey} onChange={e => setJersey(e.target.value)} type="number" placeholder="e.g. 18" className="gs-input" min={1} max={99} />
          </div>

          <div>
            <label className="gs-label">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {PLAYER_ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                    role === r ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="gs-label">Batting Style</label>
            <div className="grid grid-cols-2 gap-2">
              {BATTING_STYLES.map(s => (
                <button
                  key={s}
                  onClick={() => setBatting(s)}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                    batting === s ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="gs-label">Bowling Style</label>
            <select value={bowling} onChange={e => setBowling(e.target.value)} className="gs-input">
              {BOWLING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <button onClick={handleSave} disabled={loading || !name.trim()} className="gs-btn-primary w-full mt-5 flex items-center justify-center gap-2">
          {loading ? <Spinner size="sm" /> : (editPlayer ? 'Update Player' : 'Add Player')}
        </button>
      </motion.div>
    </div>
  );
}

export function TeamsPage() {
  const { user } = useAuth();
  const { navigate } = useApp();
  const [teams, setTeams] = useState<Team[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, Player[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [showAddPlayer, setShowAddPlayer] = useState<Team | null>(null);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (user) loadTeams();
  }, [user]);

  const loadTeams = async () => {
    if (!user) return;
    const { data } = await supabase.from('teams').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setTeams(data);
    setLoading(false);
  };

  const loadPlayers = async (teamId: string) => {
    if (players[teamId]) return;
    const { data } = await supabase.from('players').select('*').eq('team_id', teamId).order('name');
    if (data) setPlayers(p => ({ ...p, [teamId]: data }));
  };

  const toggleTeam = async (teamId: string) => {
    if (expandedTeam === teamId) {
      setExpandedTeam(null);
    } else {
      setExpandedTeam(teamId);
      await loadPlayers(teamId);
    }
  };

  const deleteTeam = async (team: Team) => {
    if (!confirm(`Delete "${team.name}"? This cannot be undone.`)) return;
    await supabase.from('teams').delete().eq('id', team.id);
    setTeams(ts => ts.filter(t => t.id !== team.id));
    showToast('Team deleted', 'success');
  };

  const deletePlayer = async (player: Player) => {
    if (!confirm(`Remove "${player.name}" from team?`)) return;
    await supabase.from('players').delete().eq('id', player.id);
    setPlayers(p => ({
      ...p,
      [player.team_id]: (p[player.team_id] || []).filter(pl => pl.id !== player.id),
    }));
    showToast('Player removed', 'success');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Batsman': return 'text-blue-400';
      case 'Bowler': return 'text-red-400';
      case 'All-Rounder': return 'text-emerald-400';
      case 'Wicket-Keeper': return 'text-amber-400';
      default: return 'text-gray-400';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 pb-24">
        <TopBar title="My Teams" showBack backTo="dashboard" />
        <div className="px-4 py-16 text-center">
          <Shield className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">Login to manage your teams</p>
          <button onClick={() => navigate('auth')} className="gs-btn-primary mt-4">Login</button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <TopBar
        title="My Teams"
        showBack
        backTo="dashboard"
        rightElement={
          <button
            onClick={() => { setEditTeam(null); setShowAddTeam(true); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400"
          >
            <Plus className="w-5 h-5 text-black" />
          </button>
        }
      />

      <div className="px-4 pt-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : teams.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>No Teams Yet</h3>
            <p className="text-gray-500 mb-6">Create your first team to start scoring</p>
            <button onClick={() => setShowAddTeam(true)} className="gs-btn-primary">
              Create Team
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {teams.map((team, i) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="gs-card overflow-hidden"
              >
                {/* Team header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => toggleTeam(team.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: team.color + '20', border: `2px solid ${team.color}40` }}
                    >
                      {team.logo_emoji}
                    </div>
                    <div>
                      <div className="font-bold text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{team.name}</div>
                      <div className="text-gray-500 text-xs">
                        {players[team.id]?.length ?? '?'} players
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); setEditTeam(team); setShowAddTeam(true); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteTeam(team); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${expandedTeam === team.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Players */}
                <AnimatePresence>
                  {expandedTeam === team.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-800 overflow-hidden"
                    >
                      <div className="p-4 space-y-2">
                        {(players[team.id] ?? []).map(player => (
                          <div key={player.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-800/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300">
                                {player.jersey_number ?? player.name[0]}
                              </div>
                              <div>
                                <div className="font-semibold text-sm">{player.name}</div>
                                <div className={`text-xs ${getRoleColor(player.role)}`}>{player.role}</div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setEditPlayer(player); setShowAddPlayer(team); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-500"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deletePlayer(player)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-900/30 text-gray-500 hover:text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => { setEditPlayer(null); setShowAddPlayer(team); }}
                          className="w-full py-2.5 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:border-amber-500/50 hover:text-amber-500 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add Player
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}

            <button
              onClick={() => { setEditTeam(null); setShowAddTeam(true); }}
              className="w-full py-3 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:border-amber-500/50 hover:text-amber-500 transition-all text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Another Team
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddTeam && (
          <AddTeamModal
            onClose={() => { setShowAddTeam(false); setEditTeam(null); }}
            onSuccess={() => { setShowAddTeam(false); setEditTeam(null); loadTeams(); }}
            editTeam={editTeam}
          />
        )}
        {showAddPlayer && (
          <AddPlayerModal
            team={showAddPlayer}
            onClose={() => { setShowAddPlayer(null); setEditPlayer(null); }}
            onSuccess={() => {
              setPlayers(p => ({ ...p, [showAddPlayer.id]: [] }));
              loadPlayers(showAddPlayer.id);
              setShowAddPlayer(null);
              setEditPlayer(null);
            }}
            editPlayer={editPlayer}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
