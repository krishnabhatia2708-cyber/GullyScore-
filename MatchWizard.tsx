import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Users, Clock, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Team, Player } from '../types';
import { TopBar } from '../components/layout/TopBar';
import { showToast } from '../components/ui/Toast';
import { Spinner } from '../components/ui/Spinner';
import { Confetti } from '../components/animations/Confetti';

type Step = 'teams' | 'overs' | 'toss' | 'players' | 'ready';

const OVERS_OPTIONS = [2, 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 50];

// Coin Flip component
function CoinFlip({
  teamA, teamB, onDecide
}: {
  teamA: Team; teamB: Team;
  onDecide: (winner: string, decision: 'BAT' | 'BOWL') => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'flipping' | 'result' | 'decide'>('idle');
  const [result, setResult] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [winner, setWinner] = useState<Team>(teamA);
  const [rotations, setRotations] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const flip = () => {
    if (phase !== 'idle') return;
    setPhase('flipping');
    const spins = 8 + Math.floor(Math.random() * 6);
    setRotations(spins * 180);

    setTimeout(() => {
      const res: 'HEADS' | 'TAILS' = Math.random() > 0.5 ? 'HEADS' : 'TAILS';
      const win = res === 'HEADS' ? teamA : teamB;
      setResult(res);
      setWinner(win);
      setPhase('result');
      setShowConfetti(true);
      setTimeout(() => { setShowConfetti(false); setPhase('decide'); }, 2000);
    }, 2500);
  };

  const chooseManually = (team: Team) => {
    setWinner(team);
    setPhase('decide');
  };

  return (
    <div className="px-4 py-6 max-w-sm mx-auto">
      <Confetti active={showConfetti} duration={2000} />

      <h2 className="text-3xl font-black text-center mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
        TOSS
      </h2>
      <p className="text-gray-500 text-center text-sm mb-8">Winner will choose to Bat or Bowl</p>

      {/* Teams */}
      <div className="flex items-center justify-between mb-10">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2"
            style={{ backgroundColor: teamA.color + '20', border: `2px solid ${teamA.color}40` }}
          >
            {teamA.logo_emoji}
          </div>
          <div className="font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{teamA.name}</div>
          <div className="text-xs text-gray-500">Heads</div>
        </div>

        <div className="text-gray-500 font-bold text-xl">VS</div>

        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2"
            style={{ backgroundColor: teamB.color + '20', border: `2px solid ${teamB.color}40` }}
          >
            {teamB.logo_emoji}
          </div>
          <div className="font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{teamB.name}</div>
          <div className="text-xs text-gray-500">Tails</div>
        </div>
      </div>

      {/* Coin */}
      <div className="flex justify-center mb-8">
        <div className="coin-container">
          <motion.div
            animate={{ rotateY: rotations }}
            transition={{ duration: 2.5, ease: [0.2, 0.8, 0.8, 1] }}
            className="w-32 h-32 relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Heads */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center text-5xl shadow-2xl"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #FCD34D, #F59E0B, #D97706)',
                backfaceVisibility: 'hidden',
              }}
            >
              👑
            </div>
            {/* Tails */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center text-5xl shadow-2xl"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #FCD34D, #F59E0B, #D97706)',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              ⭐
            </div>
          </motion.div>
        </div>
      </div>

      {/* Status */}
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="text-center text-gray-400 text-sm mb-4">Tap to flip the coin</p>
            <button onClick={flip} className="gs-btn-primary w-full py-4 text-lg">
              Flip Coin
            </button>
            <div className="text-center text-gray-600 text-xs">— or —</div>
            <div className="grid grid-cols-2 gap-3">
              {[teamA, teamB].map(t => (
                <button
                  key={t.id}
                  onClick={() => chooseManually(t)}
                  className="gs-btn-secondary text-sm py-2.5"
                >
                  {t.name} Won
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'flipping' && (
          <motion.div key="flipping" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
            <div className="text-amber-400 font-bold text-xl animate-pulse" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Flipping...
            </div>
          </motion.div>
        )}

        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="text-5xl font-black text-amber-400 mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {result === 'HEADS' ? "It's Heads!" : "It's Tails!"}
            </div>
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {winner.name} Won the Toss!
            </div>
          </motion.div>
        )}

        {phase === 'decide' && (
          <motion.div
            key="decide"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <div className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {winner.name}
              </div>
              <div className="text-amber-400 font-semibold">won the toss!</div>
              <p className="text-gray-500 text-sm mt-1">What would you like to do?</p>
            </div>

            <button
              onClick={() => onDecide(winner.name, 'BAT')}
              className="w-full p-4 rounded-2xl border border-emerald-600/50 bg-emerald-900/30 hover:bg-emerald-900/50 transition-all flex items-center gap-4"
            >
              <span className="text-3xl">🏏</span>
              <div className="text-left">
                <div className="font-bold text-lg text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>BAT FIRST</div>
                <div className="text-sm text-gray-400">Choose to bat first</div>
              </div>
            </button>

            <button
              onClick={() => onDecide(winner.name, 'BOWL')}
              className="w-full p-4 rounded-2xl border border-blue-600/50 bg-blue-900/30 hover:bg-blue-900/50 transition-all flex items-center gap-4"
            >
              <span className="text-3xl">🎯</span>
              <div className="text-left">
                <div className="font-bold text-lg text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>BOWL FIRST</div>
                <div className="text-sm text-gray-400">Choose to bowl first</div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Player selector component
function PlayerSelector({
  players, selected, onChange, label, exclude
}: {
  players: Player[]; selected: string; onChange: (name: string) => void;
  label: string; exclude?: string[];
}) {
  const available = players.filter(p => !exclude?.includes(p.name));
  return (
    <div>
      <label className="gs-label">{label}</label>
      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto scrollbar-hide">
        {available.map(p => (
          <button
            key={p.id}
            onClick={() => onChange(p.name)}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
              selected === p.name
                ? 'bg-amber-500/20 border border-amber-500/50'
                : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
              selected === p.name ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-300'
            }`}>
              {p.jersey_number ?? p.name[0]}
            </div>
            <div>
              <div className="font-semibold text-sm">{p.name}</div>
              <div className="text-xs text-gray-500">{p.role} • {p.batting_style}</div>
            </div>
            {selected === p.name && <Check className="w-4 h-4 text-amber-500 ml-auto" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MatchWizardPage() {
  const { user } = useAuth();
  const { navigate } = useApp();
  const [step, setStep] = useState<Step>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<Record<string, Player[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [overs, setOvers] = useState(10);
  const [venue, setVenue] = useState('');
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'BAT' | 'BOWL'>('BAT');
  const [battingTeam, setBattingTeam] = useState('');
  const [bowlingTeam, setBowlingTeam] = useState('');
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');

  useEffect(() => {
    if (user) loadTeams();
    else setLoading(false);
  }, [user]);

  const loadTeams = async () => {
    if (!user) return;
    const { data: teamsData } = await supabase.from('teams').select('*').eq('user_id', user.id).order('name');
    if (!teamsData) { setLoading(false); return; }
    setTeams(teamsData);

    // Load all players for all teams
    const { data: playersData } = await supabase.from('players').select('*').eq('user_id', user.id).order('name');
    if (playersData) {
      const grouped: Record<string, Player[]> = {};
      for (const t of teamsData) grouped[t.id] = [];
      for (const p of playersData) {
        if (!grouped[p.team_id]) grouped[p.team_id] = [];
        grouped[p.team_id].push(p);
      }
      setAllPlayers(grouped);
    }
    setLoading(false);
  };

  const handleTossDecide = (winner: string, decision: 'BAT' | 'BOWL') => {
    setTossWinner(winner);
    setTossDecision(decision);
    const bat = decision === 'BAT' ? winner : (winner === teamA!.name ? teamB!.name : teamA!.name);
    const bowl = bat === teamA!.name ? teamB!.name : teamA!.name;
    setBattingTeam(bat);
    setBowlingTeam(bowl);
    setStep('players');
  };

  const getBattingTeamObj = () => battingTeam === teamA?.name ? teamA : teamB;
  const getBowlingTeamObj = () => bowlingTeam === teamA?.name ? teamA : teamB;

  const getBattingPlayers = (): Player[] => {
    const t = getBattingTeamObj();
    return t ? (allPlayers[t.id] ?? []) : [];
  };

  const getBowlingPlayers = (): Player[] => {
    const t = getBowlingTeamObj();
    return t ? (allPlayers[t.id] ?? []) : [];
  };

  const startMatch = async () => {
    if (!user || !teamA || !teamB) return;
    setSaving(true);

    const { data, error } = await supabase.from('matches').insert({
      user_id: user.id,
      team_a_id: teamA.id,
      team_b_id: teamB.id,
      team_a_name: teamA.name,
      team_b_name: teamB.name,
      overs,
      venue,
      toss_winner: tossWinner,
      toss_decision: tossDecision,
      batting_team: battingTeam,
      bowling_team: bowlingTeam,
      status: 'LIVE',
      innings: 1,
      striker,
      non_striker: nonStriker,
      current_bowler: bowler,
      score1: 0, wickets1: 0, balls1: 0,
      score2: 0, wickets2: 0, balls2: 0,
    }).select().single();

    setSaving(false);
    if (error || !data) { showToast('Failed to create match', 'error'); return; }
    navigate('live-scoring', { matchId: data.id });
  };

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: 'teams', label: 'Teams', icon: <Users className="w-4 h-4" /> },
    { id: 'overs', label: 'Overs', icon: <Clock className="w-4 h-4" /> },
    { id: 'toss', label: 'Toss', icon: <span className="text-sm">🪙</span> },
    { id: 'players', label: 'Players', icon: <Activity className="w-4 h-4" /> },
  ];

  const stepIndex = steps.findIndex(s => s.id === step);

  const canGoNext = () => {
    if (step === 'teams') return teamA && teamB && teamA.id !== teamB.id;
    if (step === 'overs') return overs > 0;
    if (step === 'toss') return false; // handled by CoinFlip
    if (step === 'players') return striker && nonStriker && bowler && striker !== nonStriker;
    return false;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Login to create matches</p>
          <button onClick={() => navigate('auth')} className="gs-btn-primary">Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <TopBar title="New Match" showBack backTo="dashboard" />

      {/* Step indicator */}
      <div className="px-4 py-3 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                s.id === step
                  ? 'bg-amber-500 text-black'
                  : i < stepIndex
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'bg-gray-800 text-gray-500'
              }`}>
                {i < stepIndex ? <Check className="w-3 h-3" /> : s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded ${i < stepIndex ? 'bg-emerald-600' : 'bg-gray-800'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Teams */}
          {step === 'teams' && (
            <motion.div
              key="teams"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="px-4 py-4 space-y-6"
            >
              <div>
                <h2 className="text-2xl font-black mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Select Teams</h2>
                <div className="mb-4">
                  <label className="gs-label mb-2">Venue (Optional)</label>
                  <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Stadium / Ground name" className="gs-input" />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : teams.length < 2 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">You need at least 2 teams to start a match</p>
                  <button onClick={() => navigate('teams')} className="gs-btn-primary">Create Teams</button>
                </div>
              ) : (
                <>
                  {(['Team A', 'Team B'] as const).map((label, idx) => {
                    const selected = idx === 0 ? teamA : teamB;
                    const setSelected = idx === 0 ? setTeamA : setTeamB;
                    const other = idx === 0 ? teamB : teamA;

                    return (
                      <div key={label}>
                        <h3 className="font-bold text-gray-400 text-sm mb-3">{label}</h3>
                        <div className="grid grid-cols-1 gap-2">
                          {teams.filter(t => t.id !== other?.id).map(t => (
                            <button
                              key={t.id}
                              onClick={() => setSelected(t)}
                              className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                                selected?.id === t.id
                                  ? 'border-2 border-amber-500 bg-amber-500/10'
                                  : 'border border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                              }`}
                            >
                              <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                style={{ backgroundColor: t.color + '20' }}
                              >
                                {t.logo_emoji}
                              </div>
                              <div className="flex-1">
                                <div className="font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{t.name}</div>
                                <div className="text-xs text-gray-500">{allPlayers[t.id]?.length ?? 0} players</div>
                              </div>
                              {selected?.id === t.id && <Check className="w-5 h-5 text-amber-500" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </motion.div>
          )}

          {/* Step 2: Select Overs */}
          {step === 'overs' && (
            <motion.div
              key="overs"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="px-4 py-4"
            >
              <h2 className="text-2xl font-black mb-6" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Select Overs</h2>
              <div className="grid grid-cols-4 gap-3">
                {OVERS_OPTIONS.map(o => (
                  <button
                    key={o}
                    onClick={() => setOvers(o)}
                    className={`py-4 rounded-2xl font-black text-2xl transition-all ${
                      overs === o
                        ? 'bg-amber-500 text-black scale-105'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <label className="gs-label">Custom Overs</label>
                <input
                  type="number"
                  value={overs}
                  onChange={e => setOvers(parseInt(e.target.value) || 10)}
                  min={1}
                  max={50}
                  className="gs-input"
                />
              </div>

              {/* Match summary */}
              <div className="mt-6 gs-card p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Teams</span>
                  <span className="font-semibold">{teamA?.name} vs {teamB?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Overs</span>
                  <span className="font-bold text-amber-500">{overs} overs</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Toss */}
          {step === 'toss' && teamA && teamB && (
            <motion.div
              key="toss"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <CoinFlip teamA={teamA} teamB={teamB} onDecide={handleTossDecide} />
            </motion.div>
          )}

          {/* Step 4: Select Players */}
          {step === 'players' && (
            <motion.div
              key="players"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="px-4 py-4 space-y-5"
            >
              <div>
                <h2 className="text-2xl font-black mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Opening Setup</h2>
                <p className="text-gray-500 text-sm">
                  <span className="text-emerald-400 font-semibold">{battingTeam}</span> is batting.{' '}
                  <span className="text-red-400 font-semibold">{bowlingTeam}</span> is bowling.
                </p>
              </div>

              {getBattingPlayers().length === 0 ? (
                <div className="gs-card p-4 text-center">
                  <p className="text-gray-500 text-sm mb-3">The batting team has no players. Add players first.</p>
                  <button onClick={() => navigate('teams')} className="gs-btn-secondary text-sm px-4 py-2">
                    Add Players
                  </button>
                </div>
              ) : (
                <>
                  <PlayerSelector
                    players={getBattingPlayers()}
                    selected={striker}
                    onChange={setStriker}
                    label="Opening Striker (Batsman on strike)"
                    exclude={[nonStriker]}
                  />
                  <PlayerSelector
                    players={getBattingPlayers()}
                    selected={nonStriker}
                    onChange={setNonStriker}
                    label="Opening Non-Striker"
                    exclude={[striker]}
                  />
                  <PlayerSelector
                    players={getBowlingPlayers()}
                    selected={bowler}
                    onChange={setBowler}
                    label="Opening Bowler"
                  />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        {step !== 'toss' && (
          <div className="px-4 py-4 flex gap-3">
            {stepIndex > 0 && (
              <button
                onClick={() => {
                  const s = steps[stepIndex - 1].id;
                  setStep(s);
                }}
                className="gs-btn-secondary flex items-center gap-2 flex-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {step !== 'players' ? (
              <button
                onClick={() => setStep(steps[stepIndex + 1].id)}
                disabled={!canGoNext()}
                className="gs-btn-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={startMatch}
                disabled={!canGoNext() || saving}
                className="gs-btn-success flex items-center justify-center gap-2 flex-1 disabled:opacity-40"
              >
                {saving ? <Spinner size="sm" /> : (
                  <>
                    <Activity className="w-4 h-4" />
                    Start Match!
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {step === 'toss' && (
          <div className="px-4 py-4">
            <button
              onClick={() => setStep('overs')}
              className="gs-btn-secondary flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
