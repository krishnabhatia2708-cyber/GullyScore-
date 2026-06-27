import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, AlertTriangle, X, Settings, Target, TrendingUp, RefreshCw, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { processCompletedMatch } from '../lib/rankingEngine';
import { calculateSecondInningsResult } from '../lib/cricket';
import { Match, Ball, BattingStats, BowlingStats, Player } from '../types';
import { TopBar } from '../components/layout/TopBar';
import { showToast } from '../components/ui/Toast';
import { Spinner } from '../components/ui/Spinner';
import { CelebrationOverlay } from '../components/animations/CelebrationOverlay';

type CelebType = 'four' | 'six' | 'wicket' | 'win' | 'potm' | null;

const WICKET_TYPES = [
  'Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped',
  'Hit Wicket', 'Retired Out', 'Retired Hurt', 'Handled Ball',
  'Obstructing', 'Hit Ball Twice', 'Timed Out'
];

function formatOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function BallChip({ ball }: { ball: Ball }) {
  const isExtra = ball.is_wide || ball.is_no_ball || ball.is_bye || ball.is_leg_bye;
  if (ball.is_wicket) return <div className="gs-ball-wicket">W</div>;
  if (ball.is_wide) return <div className="gs-ball-wide">WD</div>;
  if (ball.is_no_ball) return <div className="gs-ball-noball">NB</div>;
  if (ball.runs === 4 && !isExtra) return <div className="gs-ball-four">4</div>;
  if (ball.runs === 6 && !isExtra) return <div className="gs-ball-six">6</div>;
  if (ball.runs === 0) return <div className="gs-ball-dot">.</div>;
  return <div className="gs-ball-run">{ball.total_runs}</div>;
}

interface MatchSettings {
  allowLastManStanding: boolean;
  noConsecutiveBowler: boolean;
  wideCountsAsBall: boolean;
}

function SettingsModal({ settings, onSave, onClose }: {
  settings: MatchSettings;
  onSave: (s: MatchSettings) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState(settings);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Match Settings</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-gray-800 rounded-xl cursor-pointer">
            <div>
              <div className="font-semibold">Last Man Standing</div>
              <div className="text-xs text-gray-500">Continue batting with 1 batsman</div>
            </div>
            <input
              type="checkbox"
              checked={local.allowLastManStanding}
              onChange={e => setLocal({ ...local, allowLastManStanding: e.target.checked })}
              className="w-5 h-5 accent-amber-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-800 rounded-xl cursor-pointer">
            <div>
              <div className="font-semibold">No Consecutive Bowling</div>
              <div className="text-xs text-gray-500">Same bowler can't bowl next over</div>
            </div>
            <input
              type="checkbox"
              checked={local.noConsecutiveBowler}
              onChange={e => setLocal({ ...local, noConsecutiveBowler: e.target.checked })}
              className="w-5 h-5 accent-amber-500"
            />
          </label>
        </div>

        <button
          onClick={() => { onSave(local); onClose(); }}
          className="gs-btn-primary w-full mt-5"
        >
          Save Settings
        </button>
      </motion.div>
    </div>
  );
}

function WicketModal({
  striker, nonStriker, fielders, onDismiss, onClose
}: {
  striker: string; nonStriker: string; fielders: string[];
  onDismiss: (type: string, dismissed: string, fielder: string) => void;
  onClose: () => void;
}) {
  const [wicketType, setWicketType] = useState('Bowled');
  const [fielder, setFielder] = useState('');

  // Determine who can be dismissed
  const canBeRunOut = wicketType === 'Run Out';
  const batsmanOptions = canBeRunOut
    ? [striker, nonStriker].filter(Boolean)
    : [striker]; // For normal dismissals, only striker can be out

  const [dismissed, setDismissed] = useState(batsmanOptions[0] ?? '');

  const needsFielder = ['Caught', 'Run Out', 'Stumped'].includes(wicketType);

  // Update dismissed when wicket type changes
  useEffect(() => {
    if (wicketType === 'Run Out') {
      setDismissed(striker); // Default to striker for run out
    } else {
      setDismissed(striker);
    }
  }, [wicketType, striker]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-900 rounded-t-3xl w-full max-w-lg p-6 border-t border-gray-700 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-black text-red-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Wicket!</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="gs-label">Dismissal Type</label>
            <div className="grid grid-cols-3 gap-2">
              {WICKET_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setWicketType(t)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                    wicketType === t ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* For Run Out, select which batsman is out */}
          {canBeRunOut && nonStriker && (
            <div>
              <label className="gs-label">Who is Run Out?</label>
              <div className="grid grid-cols-2 gap-2">
                {[striker, nonStriker].filter(Boolean).map(p => (
                  <button
                    key={p}
                    onClick={() => setDismissed(p)}
                    className={`py-3 px-3 rounded-xl text-sm font-semibold transition-all ${
                      dismissed === p ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    {p} {p === striker ? '(Striker)' : '(Non-Striker)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!canBeRunOut && striker && (
            <div className="bg-gray-800/50 rounded-xl p-3 text-sm">
              <span className="text-gray-400">Batsman out: </span>
              <span className="font-bold text-white">{striker}</span>
              <span className="text-amber-400 ml-1">*</span>
            </div>
          )}

          {needsFielder && (
            <div>
              <label className="gs-label">{wicketType === 'Caught' ? 'Caught by' : wicketType === 'Stumped' ? 'Stumped by' : 'Run out by'}</label>
              <select value={fielder} onChange={e => setFielder(e.target.value)} className="gs-input">
                <option value="">Select fielder</option>
                {fielders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={() => onDismiss(wicketType, dismissed, fielder)}
          className="gs-btn-danger w-full mt-5 flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          Confirm Wicket
        </button>
      </motion.div>
    </div>
  );
}

function PlayerSelectModal({
  title, players, exclude, onSelect, color = 'amber', icon, subtitle
}: {
  title: string; players: string[]; exclude: string[];
  onSelect: (name: string) => void;
  color?: 'amber' | 'blue' | 'emerald';
  icon?: React.ReactNode;
  subtitle?: string;
}) {
  const available = players.filter(p => !exclude.includes(p));
  const colorClasses = {
    amber: 'bg-amber-500/20 text-amber-400',
    blue: 'bg-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        className="bg-gray-900 rounded-t-3xl w-full max-w-lg p-6 border-t border-gray-700"
      >
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h3 className="text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <span className={color === 'amber' ? 'text-amber-400' : color === 'blue' ? 'text-blue-400' : 'text-emerald-400'}>
              {title}
            </span>
          </h3>
        </div>
        {subtitle && <p className="text-gray-500 text-sm mb-4">{subtitle}</p>}
        {available.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No players available</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {available.map(p => (
              <button
                key={p}
                onClick={() => onSelect(p)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-left"
              >
                <div className={`w-9 h-9 rounded-full ${colorClasses[color]} flex items-center justify-center text-sm font-bold`}>
                  {p[0]}
                </div>
                <span className="font-semibold">{p}</span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function OverCompleteModal({
  currentBowler, players, exclude, onSelect, noConsecutive
}: {
  currentBowler: string;
  players: string[];
  exclude: string[];
  onSelect: (name: string) => void;
  noConsecutive: boolean;
}) {
  const available = players.filter(p => !exclude.includes(p));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-blue-500/30 mx-4"
      >
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
            <RefreshCw className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-black text-blue-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Over Complete!
          </h2>
          <p className="text-gray-400 text-sm mt-1">Select the next bowler</p>
        </div>

        {currentBowler && (
          <div className="bg-gray-800/50 rounded-xl p-3 mb-4 flex items-center gap-3">
            <div className="text-xs text-gray-500">Previous Bowler</div>
            <div className="font-bold text-gray-300">{currentBowler}</div>
            {noConsecutive && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                Cannot bowl next over
              </span>
            )}
          </div>
        )}

        <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
          {available.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No players available</p>
          ) : (
            available.map(p => (
              <button
                key={p}
                onClick={() => onSelect(p)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-left"
              >
                <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                  {p[0]}
                </div>
                <span className="font-semibold">{p}</span>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

function InningsBreakModal({ match, onStart }: { match: Match; onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-amber-500/30 mx-4"
      >
        <div className="text-center">
          <div className="text-6xl mb-4">🏏</div>
          <h2 className="text-3xl font-black text-amber-400 mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Innings Break
          </h2>
          <div className="text-gray-400 mb-6">
            <p className="mb-2">{match.batting_team} scored <span className="text-white font-bold text-xl">{match.score1}/{match.wickets1}</span></p>
            <p className="text-sm">{Math.floor(match.balls1 / 6)}.{match.balls1 % 6} overs</p>
          </div>

          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-4 mb-6 border border-amber-500/30">
            <p className="text-gray-400 text-sm mb-1">Target</p>
            <p className="text-4xl font-black text-amber-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {match.target}
            </p>
            <p className="text-gray-500 text-xs mt-1">{match.bowling_team} needs {match.target} runs to win</p>
          </div>

          <button onClick={onStart} className="gs-btn-primary w-full py-4 text-lg">
            Start 2nd Innings
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EndInningsConfirmModal({
  score, wickets, balls, maxOvers, onConfirm, onCancel, isSecondInnings
}: {
  score: number; wickets: number; balls: number; maxOvers: number;
  onConfirm: () => void; onCancel: () => void;
  isSecondInnings: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-red-500/30 mx-4"
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
            <LogOut className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-red-400 mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {isSecondInnings ? 'End Match?' : 'End Innings?'}
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            {isSecondInnings ? 'This will end the match.' : 'This will end the current innings.'}
          </p>

          <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
            <div className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {score}/{wickets}
            </div>
            <div className="text-gray-400 text-sm">
              {formatOvers(balls)} / {maxOvers} overs
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} className="gs-btn-secondary flex-1 py-3">
              Cancel
            </button>
            <button onClick={onConfirm} className="gs-btn-danger flex-1 py-3">
              {isSecondInnings ? 'End Match' : 'End Innings'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function LiveScoringPage() {
  const { user } = useAuth();
  const { navigate, params } = useApp();
  const matchId = params.matchId;

  const [match, setMatch] = useState<Match | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<Player[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Match settings
  const [settings, setSettings] = useState<MatchSettings>({
    allowLastManStanding: false,
    noConsecutiveBowler: true, // Default ON
    wideCountsAsBall: false,
  });

  // UI state
  const [showWicket, setShowWicket] = useState(false);
  const [showNewBatsman, setShowNewBatsman] = useState(false);
  const [showNewBowler, setShowNewBowler] = useState(false);
  const [showOverComplete, setShowOverComplete] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showInningsBreak, setShowInningsBreak] = useState(false);
  const [showEndInnings, setShowEndInnings] = useState(false);
  const [celebration, setCelebration] = useState<CelebType>(null);
  const [celebPlayer, setCelebPlayer] = useState('');
  const [celebTeam, setCelebTeam] = useState('');

  // Track the dismissed batsman position for replacement
  const [dismissedPosition, setDismissedPosition] = useState<'striker' | 'nonStriker' | null>(null);

  // Match state
  const [battingStats, setBattingStats] = useState<Record<string, BattingStats>>({});
  const [bowlingStats, setBowlingStats] = useState<Record<string, BowlingStats>>({});
  const [dismissedBatsmen, setDismissedBatsmen] = useState<string[]>([]);
  const [currentOverBalls, setCurrentOverBalls] = useState<Ball[]>([]);
  const [lastBowler, setLastBowler] = useState<string>('');
  const [partnership, setPartnership] = useState({ runs: 0, balls: 0 });

  // Extra selectors
  const [selectedExtra, setSelectedExtra] = useState<string | null>(null);

  // Track over state - force bowler selection after over
  const [overJustCompleted, setOverJustCompleted] = useState(false);

  useEffect(() => {
    if (matchId) loadMatch();
  }, [matchId]);

  const loadMatch = async () => {
    if (!matchId) return;

    const [matchRes, ballsRes] = await Promise.all([
      supabase.from('matches').select('*').eq('id', matchId).single(),
      supabase.from('balls').select('*').eq('match_id', matchId).order('created_at', { ascending: true }),
    ]);

    if (matchRes.data) {
      setMatch(matchRes.data);

      // Load team players
      if (matchRes.data.team_a_id) {
        const { data: playersA } = await supabase.from('players').select('*').eq('team_id', matchRes.data.team_a_id);
        if (playersA) setTeamAPlayers(playersA);
      }
      if (matchRes.data.team_b_id) {
        const { data: playersB } = await supabase.from('players').select('*').eq('team_id', matchRes.data.team_b_id);
        if (playersB) setTeamBPlayers(playersB);
      }

      if (ballsRes.data) {
        setBalls(ballsRes.data);
        recomputeStats(matchRes.data, ballsRes.data);
      }
    }

    setLoading(false);
  };

  const recomputeStats = (m: Match, allBalls: Ball[]) => {
    const bs: Record<string, BattingStats> = {};
    const bwl: Record<string, BowlingStats> = {};
    const dismissed: string[] = [];
    const curInnBalls = allBalls.filter(b => b.innings === m.innings);

    for (const ball of curInnBalls) {
      // Batting stats
      if (!bs[ball.batsman]) {
        bs[ball.batsman] = { name: ball.batsman, runs: 0, balls: 0, fours: 0, sixes: 0, is_out: false, strike_rate: 0 };
      }
      if (!ball.is_wide) {
        bs[ball.batsman].balls++;
        if (!ball.is_bye && !ball.is_leg_bye) {
          bs[ball.batsman].runs += ball.runs;
          if (ball.runs === 4) bs[ball.batsman].fours++;
          if (ball.runs === 6) bs[ball.batsman].sixes++;
        }
      }
      if (ball.is_wicket && ball.dismissed_batsman) {
        const d = ball.dismissed_batsman;
        if (bs[d]) { bs[d].is_out = true; bs[d].wicket_type = ball.wicket_type; bs[d].fielder = ball.fielder; bs[d].bowler = ball.bowler; }
        dismissed.push(d);
      }

      // Bowling stats
      if (!bwl[ball.bowler]) {
        bwl[ball.bowler] = { name: ball.bowler, overs: 0, balls: 0, runs: 0, wickets: 0, economy: 0, wides: 0, no_balls: 0 };
      }
      if (!ball.is_wide && !ball.is_no_ball) bwl[ball.bowler].balls++;
      if (ball.is_wide) bwl[ball.bowler].wides++;
      if (ball.is_no_ball) bwl[ball.bowler].no_balls++;
      bwl[ball.bowler].runs += ball.total_runs;
      if (ball.is_wicket && !['Run Out', 'Retired Out', 'Obstructing', 'Retired Hurt'].includes(ball.wicket_type)) {
        bwl[ball.bowler].wickets++;
      }
      bwl[ball.bowler].overs = Math.floor(bwl[ball.bowler].balls / 6);
      bwl[ball.bowler].economy = bwl[ball.bowler].balls > 0
        ? (bwl[ball.bowler].runs / (bwl[ball.bowler].balls / 6)) : 0;
    }

    for (const k in bs) {
      bs[k].strike_rate = bs[k].balls > 0 ? (bs[k].runs / bs[k].balls) * 100 : 0;
    }

    setBattingStats(bs);
    setBowlingStats(bwl);
    setDismissedBatsmen(dismissed);

    // Current over balls
    const legalBalls = curInnBalls.filter(b => !b.is_wide && !b.is_no_ball);
    const currentOver = Math.floor(legalBalls.length / 6);
    const overBalls = curInnBalls.filter(b => {
      const ballLegal = !b.is_wide && !b.is_no_ball;
      const ballOver = Math.floor(legalBalls.slice(0, legalBalls.indexOf(b) + 1).length / 6);
      return ballOver === currentOver || (ballOver === currentOver - 1 && !ballLegal);
    });
    setCurrentOverBalls(overBalls.slice(-6));

    // Find last bowler who completed an over
    const lastOverNum = currentOver > 0 ? currentOver - 1 : 0;
    const lastOverBalls = curInnBalls.filter(b => b.over_num === lastOverNum);
    if (lastOverBalls.length > 0) {
      setLastBowler(lastOverBalls[0].bowler);
    }
  };

  const getScore = () => match?.innings === 1 ? match.score1 : match?.score2 ?? 0;
  const getWickets = () => match?.innings === 1 ? match.wickets1 : match?.wickets2 ?? 0;
  const getBalls = () => match?.innings === 1 ? match.balls1 : match?.balls2 ?? 0;
  const getMaxOvers = () => match?.overs ?? 10;

  const getBattingTeamPlayers = (): string[] => {
    const battingTeam = match?.batting_team;
    if (!battingTeam) return [];
    return battingTeam === match?.team_a_name
      ? teamAPlayers.map(p => p.name)
      : teamBPlayers.map(p => p.name);
  };

  const getBowlingTeamPlayers = (): string[] => {
    const bowlingTeam = match?.bowling_team;
    if (!bowlingTeam) return [];
    return bowlingTeam === match?.team_a_name
      ? teamAPlayers.map(p => p.name)
      : teamBPlayers.map(p => p.name);
  };

  const getAvailableBatsmen = (): string[] => {
    const allPlayers = getBattingTeamPlayers();
    if (allPlayers.length === 0) {
      return Object.keys(battingStats).filter(n => !dismissedBatsmen.includes(n));
    }
    return allPlayers.filter(n => !dismissedBatsmen.includes(n));
  };

  const getAvailableBowlers = (): string[] => {
    const allPlayers = getBowlingTeamPlayers();
    if (allPlayers.length === 0) {
      return Object.keys(bowlingStats);
    }
    return allPlayers;
  };

  const isLastManStanding = (): boolean => {
    if (!settings.allowLastManStanding) return false;
    const available = getAvailableBatsmen();
    return Boolean(available.length === 1 && match?.striker && !match.non_striker);
  };

  const saveBall = useCallback(async (ballData: Partial<Ball>) => {
    if (!match || !user || processing) return;
    setProcessing(true);

    const innings = match.innings;
    const completedBalls = balls.filter(b => b.innings === innings && !b.is_wide && !b.is_no_ball).length;
    const overNum = Math.floor(completedBalls / 6);
    const ballNum = completedBalls % 6;

    const isLegal = !ballData.is_wide && !ballData.is_no_ball;
    const totalRuns = (ballData.runs ?? 0) + (ballData.extra_runs ?? 0);

    // Determine batsman on strike for this ball
    const batsmanOnStrike = match.striker;

    const newBall: Omit<Ball, 'id' | 'created_at'> = {
      match_id: match.id,
      user_id: user.id,
      innings,
      over_num: overNum,
      ball_num: ballNum,
      batsman: batsmanOnStrike,
      bowler: match.current_bowler,
      runs: ballData.runs ?? 0,
      is_wicket: ballData.is_wicket ?? false,
      wicket_type: ballData.wicket_type ?? '',
      dismissed_batsman: ballData.dismissed_batsman ?? '',
      fielder: ballData.fielder ?? '',
      is_wide: ballData.is_wide ?? false,
      is_no_ball: ballData.is_no_ball ?? false,
      is_bye: ballData.is_bye ?? false,
      is_leg_bye: ballData.is_leg_bye ?? false,
      extra_runs: ballData.extra_runs ?? 0,
      total_runs: totalRuns,
    };

    const { data: savedBall, error } = await supabase.from('balls').insert(newBall).select().single();
    if (error || !savedBall) {
      showToast('Failed to save ball', 'error');
      setProcessing(false);
      return;
    }

    const newBalls = [...balls, savedBall];
    setBalls(newBalls);

    // Update match state
    const newScore = (innings === 1 ? match.score1 : match.score2) + totalRuns;
    const newWickets = (innings === 1 ? match.wickets1 : match.wickets2) + (newBall.is_wicket ? 1 : 0);
    const newBallCount = (innings === 1 ? match.balls1 : match.balls2) + (isLegal ? 1 : 0);

    // Determine dismissed position for replacement
    let newStriker = match.striker;
    let newNonStriker = match.non_striker;
    let dismissedPos: 'striker' | 'nonStriker' | null = null;

    if (newBall.is_wicket && newBall.dismissed_batsman) {
      // Track which position was dismissed
      if (newBall.dismissed_batsman === match.striker) {
        dismissedPos = 'striker';
      } else if (newBall.dismissed_batsman === match.non_striker) {
        dismissedPos = 'nonStriker';
      }

      // Run out of non-striker doesn't change striker immediately
      // Other dismissals: striker is out
      if (newBall.dismissed_batsman === match.striker) {
        newStriker = ''; // Will be replaced
      } else if (newBall.dismissed_batsman === match.non_striker) {
        newNonStriker = ''; // Will be replaced
      }
    } else {
      // Auto strike rotation (except for last man standing on odd runs)
      if (!newBall.is_wicket) {
        // Rotate on odd runs
        if ((newBall.runs % 2 === 1) && isLegal) {
          if (newNonStriker && !isLastManStanding()) {
            [newStriker, newNonStriker] = [newNonStriker, newStriker];
          }
        }
        // Rotate at end of over
        if (isLegal && newBallCount % 6 === 0 && newBallCount > 0) {
          if (newNonStriker) {
            [newStriker, newNonStriker] = [newNonStriker, newStriker];
          }
        }
      }
    }

    // Check for over complete
    const overComplete = isLegal && newBallCount % 6 === 0 && newBallCount > 0;

    // Check if all out
    const maxWickets = 10;
    const isAllOut = newWickets >= maxWickets;

    // Check if innings over
    const maxBalls = getMaxOvers() * 6;
    const innComplete = newBallCount >= maxBalls || isAllOut;

    // Check if match won (2nd innings)
    let matchWon = false;
    let result = '';
    if (innings === 2 && match.target) {
      if (newScore >= match.target) {
        matchWon = true;
        result = calculateSecondInningsResult(match, newScore, newWickets);
      }
    }

    const updatedMatch: Partial<Match> = {
      striker: newStriker,
      non_striker: newNonStriker,
    };

    if (innings === 1) {
      updatedMatch.score1 = newScore;
      updatedMatch.wickets1 = newWickets;
      updatedMatch.balls1 = newBallCount;
    } else {
      updatedMatch.score2 = newScore;
      updatedMatch.wickets2 = newWickets;
      updatedMatch.balls2 = newBallCount;
    }

    if (matchWon) {
      updatedMatch.status = 'COMPLETED';
      updatedMatch.result = result;
      updatedMatch.completed_at = new Date().toISOString();
    } else if (innComplete && innings === 1) {
      updatedMatch.status = 'INNINGS_BREAK';
      updatedMatch.target = newScore + 1;
    }

    await supabase.from('matches').update(updatedMatch).eq('id', match.id);
    const finalMatch = { ...match, ...updatedMatch };
    setMatch(finalMatch);
    recomputeStats(finalMatch, newBalls);

    // Update partnership
    setPartnership(prev => ({
      runs: prev.runs + totalRuns,
      balls: prev.balls + (isLegal ? 1 : 0),
    }));

    // Process completed match for rankings and summary
    if (matchWon && user) {
      await processCompletedMatch(match.id, user.id);
    }

    // Celebrations
    if (newBall.is_wicket) {
      setCelebration('wicket');
    } else if (newBall.runs === 6 && !newBall.is_wide && !newBall.is_no_ball) {
      setCelebration('six');
      setCelebPlayer(newBall.batsman);
    } else if (newBall.runs === 4 && !newBall.is_wide && !newBall.is_no_ball) {
      setCelebration('four');
      setCelebPlayer(newBall.batsman);
    }

    if (matchWon) {
      setTimeout(() => {
        setCelebration('win');
        setCelebTeam(match.batting_team);
        showToast('Match completed! Redirecting...', 'success');
        setTimeout(() => navigate('match-summary', { matchId: match.id }), 2500);
      }, 1000);
    }

    setProcessing(false);
    setSelectedExtra(null);

    // Show modals after ball is saved
    if (newBall.is_wicket && !innComplete && !matchWon) {
      // Track which position needs replacement
      setDismissedPosition(dismissedPos);
      setTimeout(() => setShowNewBatsman(true), 600);
    }

    // Over complete - force bowler selection
    if (overComplete && !innComplete && !matchWon) {
      setLastBowler(match.current_bowler);
      setOverJustCompleted(true);
      setTimeout(() => setShowOverComplete(true), 600);
    }

    if (innComplete && innings === 1) {
      setShowInningsBreak(true);
    }
  }, [match, user, processing, balls, settings, isLastManStanding]);

  const handleRun = (runs: number) => {
    const isNoBall = selectedExtra === 'NB';
    const isWide = selectedExtra === 'WD';
    const isBye = selectedExtra === 'BYE';
    const isLegBye = selectedExtra === 'LB';

    saveBall({
      runs: (isWide || isBye || isLegBye) ? 0 : runs,
      extra_runs: (isWide || isNoBall) ? (isWide ? 1 + runs : 1 + runs) : isBye || isLegBye ? runs : 0,
      is_wide: isWide,
      is_no_ball: isNoBall,
      is_bye: isBye,
      is_leg_bye: isLegBye,
    });
  };

  const handleWicket = (type: string, dismissed: string, fielder: string) => {
    setShowWicket(false);
    saveBall({
      is_wicket: true,
      wicket_type: type,
      dismissed_batsman: dismissed,
      fielder,
    });
  };

  const handleUndo = async () => {
    if (!match || balls.length === 0) return;
    const innBalls = balls.filter(b => b.innings === match.innings);
    if (innBalls.length === 0) return;

    const last = innBalls[innBalls.length - 1];
    await supabase.from('balls').delete().eq('id', last.id);

    const newBalls = balls.filter(b => b.id !== last.id);
    setBalls(newBalls);

    // Recompute scores from balls
    const curInnBalls = newBalls.filter(b => b.innings === match.innings);
    const score = curInnBalls.reduce((s, b) => s + b.total_runs, 0);
    const wickets = curInnBalls.filter(b => b.is_wicket).length;
    const legalBalls = curInnBalls.filter(b => !b.is_wide && !b.is_no_ball).length;

    const upd: Partial<Match> = {};
    if (match.innings === 1) {
      upd.score1 = score; upd.wickets1 = wickets; upd.balls1 = legalBalls;
    } else {
      upd.score2 = score; upd.wickets2 = wickets; upd.balls2 = legalBalls;
    }

    // Restore striker/non-striker from second-to-last ball
    if (innBalls.length >= 2) {
      const prev = innBalls[innBalls.length - 2];
      upd.striker = prev.batsman;
      upd.current_bowler = prev.bowler;
    }

    await supabase.from('matches').update(upd).eq('id', match.id);
    const updated = { ...match, ...upd };
    setMatch(updated);
    recomputeStats(updated, newBalls);
    setOverJustCompleted(false);
    showToast('Last ball undone', 'info');
  };

  const handleStartSecondInnings = async () => {
    if (!match || !user) return;
    setShowInningsBreak(false);

    const target = match.score1 + 1;
    const updatedMatch: Partial<Match> = {
      status: 'LIVE',
      innings: 2,
      target,
      batting_team: match.bowling_team,
      bowling_team: match.batting_team,
      striker: '',
      non_striker: '',
      current_bowler: '',
    };

    await supabase.from('matches').update(updatedMatch).eq('id', match.id);
    setMatch({ ...match, ...updatedMatch });
    setDismissedBatsmen([]);
    setBattingStats({});
    setBowlingStats({});
    setPartnership({ runs: 0, balls: 0 });
    setDismissedPosition('striker');
    setShowNewBatsman(true);
    showToast(`2nd innings! Target: ${target}`, 'info');
  };

  const handleEndInnings = async () => {
    setShowEndInnings(false);
    if (!match || !user) return;

    const score = match.innings === 1 ? match.score1 : match.score2;
    const wickets = match.innings === 1 ? match.wickets1 : match.wickets2;

    if (match.innings === 1) {
      // End first innings - go to innings break
      const target = score + 1;
      await supabase.from('matches').update({
        status: 'INNINGS_BREAK',
        target,
      }).eq('id', match.id);
      setMatch({ ...match, status: 'INNINGS_BREAK', target });
      setShowInningsBreak(true);
    } else {
      // End second innings - finish match
      let result = '';
      if (match.target) {
        result = calculateSecondInningsResult(match, score, wickets);
      } else {
        result = `${match.team_a_name} drew`;
      }

      await supabase.from('matches').update({
        status: 'COMPLETED',
        result,
        completed_at: new Date().toISOString(),
      }).eq('id', match.id);

      await processCompletedMatch(match.id, user.id);
      setCelebration('win');
      setCelebTeam(match.batting_team);
      showToast('Match completed!', 'success');
      setTimeout(() => navigate('match-summary', { matchId: match.id }), 2000);
    }
  };

  const handleFinishMatch = async () => {
    setShowEndInnings(true);
  };

  const selectBatsman = async (name: string) => {
    setShowNewBatsman(false);

    if (!match) return;

    let newStriker = match.striker;
    let newNonStriker = match.non_striker;

    // Replace the dismissed position
    if (dismissedPosition === 'striker' || !match.striker) {
      newStriker = name;
    } else if (dismissedPosition === 'nonStriker' || !match.non_striker) {
      newNonStriker = name;
    }

    await supabase.from('matches').update({ striker: newStriker, non_striker: newNonStriker }).eq('id', match.id);
    setMatch(m => m ? { ...m, striker: newStriker, non_striker: newNonStriker } : m);
    setDismissedPosition(null);

    // If both batsmen set, check for bowler
    if (newStriker && newNonStriker && !match.current_bowler) {
      setTimeout(() => setShowNewBowler(true), 300);
    } else if (newStriker && !newNonStriker && isLastManStanding()) {
      // Last man standing - no non-striker needed
      if (!match.current_bowler) {
        setTimeout(() => setShowNewBowler(true), 300);
      }
    }
  };

  const selectBowler = async (name: string) => {
    setShowOverComplete(false);
    setShowNewBowler(false);
    setOverJustCompleted(false);

    if (!match) return;

    await supabase.from('matches').update({ current_bowler: name }).eq('id', match.id);
    setMatch(m => m ? { ...m, current_bowler: name } : m);
  };

  const handleSwapStrike = async () => {
    if (!match || !match.striker || !match.non_striker) return;

    const newStriker = match.non_striker;
    const newNonStriker = match.striker;

    await supabase.from('matches').update({
      striker: newStriker,
      non_striker: newNonStriker
    }).eq('id', match.id);

    setMatch(m => m ? { ...m, striker: newStriker, non_striker: newNonStriker } : m);
    showToast('Strike rotated', 'info');
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Spinner size="lg" /></div>
  );

  if (!match) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Match not found</p>
        <button onClick={() => navigate('dashboard')} className="gs-btn-primary">Go Home</button>
      </div>
    </div>
  );

  const score = getScore();
  const wickets = getWickets();
  const totalBalls = getBalls();
  const maxOvers = getMaxOvers();
  const isMatchOver = match.status === 'COMPLETED';
  const isInningsBreak = match.status === 'INNINGS_BREAK';

  // Can only score if we have striker, non-striker, bowler, and not waiting for bowler after over
  const canScore = !isMatchOver && !isInningsBreak && match.striker && match.current_bowler && !overJustCompleted;

  return (
    <div className="min-h-screen bg-gray-950 pb-4">
      <TopBar
        title={`${match.team_a_name} vs ${match.team_b_name}`}
        showBack
        backTo="dashboard"
        rightElement={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800/80">
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => setShowScorecard(!showScorecard)} className="text-amber-500 text-sm font-semibold">
              Scorecard
            </button>
          </div>
        }
      />

      {/* Score Header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 px-4 py-5 max-w-lg mx-auto">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {!isMatchOver && <span className="gs-badge-live">LIVE</span>}
              {isMatchOver && <span className="bg-emerald-600/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">COMPLETED</span>}
              <span className="text-gray-500 text-xs">Inn {match.innings}</span>
            </div>
            <div className="font-bold text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{match.batting_team}</div>
            <div className="text-5xl font-black text-amber-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {score}/{wickets}
            </div>
            <div className="text-gray-400 text-sm">
              {formatOvers(totalBalls)} / {maxOvers} overs
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-sm mb-1">{match.bowling_team}</div>
            {match.innings === 2 && match.target && (
              <>
                <div className="text-2xl font-black text-gray-300" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {match.score1}/{match.wickets1}
                </div>
                <div className="text-amber-400 text-sm font-semibold flex items-center justify-end gap-1">
                  <Target className="w-3 h-3" />
                  Need {match.target}
                </div>
                <div className="text-gray-500 text-xs">
                  {Math.max(0, match.target - score)} in {(maxOvers * 6) - totalBalls} balls
                </div>
              </>
            )}
          </div>
        </div>

        {/* Partnership */}
        {match.striker && (
          <div className="text-xs text-gray-500 mb-2">
            Partnership: {partnership.runs} ({partnership.balls} balls)
          </div>
        )}

        {/* Current Batsmen Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`bg-gray-800/50 rounded-xl p-3 ${overJustCompleted ? 'opacity-50' : ''}`}>
            <div className="text-xs text-gray-500 mb-1">Batting</div>
            {match.striker ? (
              <>
                <div className="font-bold text-sm flex items-center gap-2">
                  <span className="text-amber-500">🏏</span>
                  {match.striker} *
                  <span className="text-amber-500 ml-1">{battingStats[match.striker]?.runs ?? 0}</span>
                </div>
                <div className="text-xs text-gray-500">
                  ({battingStats[match.striker]?.balls ?? 0} balls | SR: {(battingStats[match.striker]?.strike_rate ?? 0).toFixed(0)})
                </div>
                {match.non_striker && (
                  <div className="text-xs text-gray-400 mt-1 border-t border-gray-700 pt-1">
                    <span>🏏</span> {match.non_striker} {battingStats[match.non_striker]?.runs ?? 0}({battingStats[match.non_striker]?.balls ?? 0})
                  </div>
                )}
                {/* Swap button */}
                {match.non_striker && !isMatchOver && !isInningsBreak && (
                  <button
                    onClick={handleSwapStrike}
                    className="mt-2 text-xs text-blue-400 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Swap Strike
                  </button>
                )}
              </>
            ) : (
              <div className="text-gray-500 text-sm">Select batsman</div>
            )}
          </div>
          <div className={`bg-gray-800/50 rounded-xl p-3 ${overJustCompleted ? 'border-2 border-amber-500/50' : ''}`}>
            <div className="text-xs text-gray-500 mb-1">Bowling</div>
            {match.current_bowler ? (
              <>
                <div className="font-bold text-sm flex items-center gap-2">
                  <span className="text-blue-400">🎯</span>
                  {match.current_bowler}
                </div>
                {bowlingStats[match.current_bowler] && (
                  <div className="text-xs text-gray-500">
                    {formatOvers(bowlingStats[match.current_bowler].balls)}-{bowlingStats[match.current_bowler].runs}-{bowlingStats[match.current_bowler].wickets}
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500 text-sm">Select bowler</div>
            )}
          </div>
        </div>

        {/* Over Complete Warning */}
        {overJustCompleted && !isMatchOver && !isInningsBreak && (
          <div className="mt-3 bg-amber-500/20 border border-amber-500/50 rounded-xl p-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <div className="flex-1">
              <div className="text-amber-400 font-bold text-sm">Over Complete!</div>
              <div className="text-gray-400 text-xs">Select next bowler to continue</div>
            </div>
            <button
              onClick={() => setShowOverComplete(true)}
              className="bg-amber-500 text-black px-3 py-1.5 rounded-lg text-sm font-bold"
            >
              Select Bowler
            </button>
          </div>
        )}

        {/* Current Over */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-gray-500 text-xs">This over:</span>
          <div className="flex gap-1.5">
            {currentOverBalls.map((b, i) => (
              <BallChip key={b.id || i} ball={b} />
            ))}
            {currentOverBalls.length === 0 && <span className="text-gray-600 text-xs">-</span>}
          </div>
        </div>

        {/* Last Man Standing indicator */}
        {isLastManStanding() && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2 text-center">
            <span className="text-amber-400 text-sm font-semibold">Last Man Standing Active</span>
          </div>
        )}
      </div>

      {/* Scoring Controls */}
      {canScore && (
        <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">
          {/* Extra selector */}
          <div className="flex gap-2 mb-4">
            {[
              { label: 'WIDE', key: 'WD', color: 'amber' },
              { label: 'NO BALL', key: 'NB', color: 'orange' },
              { label: 'BYE', key: 'BYE', color: 'blue' },
              { label: 'LEG BYE', key: 'LB', color: 'blue' },
            ].map(({ label, key, color }) => (
              <button
                key={key}
                onClick={() => setSelectedExtra(selectedExtra === key ? null : key)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedExtra === key ? 'text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                style={selectedExtra === key ? { backgroundColor: color === 'amber' ? '#F59E0B' : color === 'orange' ? '#F97316' : '#3B82F6' } : {}}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Run buttons */}
          <div className="grid grid-cols-4 gap-3 mb-3">
            {[0, 1, 2, 3].map(r => (
              <button
                key={r}
                onClick={() => handleRun(r)}
                disabled={processing}
                className={`py-5 rounded-2xl font-black text-3xl transition-all active:scale-95 disabled:opacity-50 ${
                  selectedExtra ? 'border-2 border-amber-500/50' : ''
                } ${r === 0 ? 'bg-gray-800 text-gray-400' : 'bg-emerald-700/30 text-emerald-400 hover:bg-emerald-700/50'}`}
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              >
                {r}
              </button>
            ))}
            {[4, 5, 6].map(r => (
              <button
                key={r}
                onClick={() => handleRun(r)}
                disabled={processing}
                className={`py-5 rounded-2xl font-black text-3xl transition-all active:scale-95 disabled:opacity-50 ${
                  r === 4 ? 'bg-blue-700/40 text-blue-400 hover:bg-blue-700/60' : r === 6 ? 'bg-purple-700/40 text-purple-400 hover:bg-purple-700/60' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                }`}
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              >
                {r}
              </button>
            ))}
            <button
              onClick={() => setShowWicket(true)}
              disabled={processing}
              className="py-5 rounded-2xl font-black text-xl bg-red-700/40 text-red-400 hover:bg-red-700/60 transition-all active:scale-95 disabled:opacity-50"
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              W
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleUndo}
              disabled={processing || balls.filter(b => b.innings === match.innings).length === 0}
              className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              Undo
            </button>
            <button
              onClick={handleFinishMatch}
              className="flex-1 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold text-sm flex items-center justify-center gap-2 border border-red-500/30"
            >
              <LogOut className="w-4 h-4" />
              End Innings
            </button>
          </div>
        </div>
      )}

      {/* Show End Innings button when waiting for bowler */}
      {overJustCompleted && !isMatchOver && !isInningsBreak && (
        <div className="px-4 pt-2 max-w-lg mx-auto">
          <button
            onClick={handleFinishMatch}
            className="w-full py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold text-sm flex items-center justify-center gap-2 border border-red-500/30"
          >
            <LogOut className="w-4 h-4" />
            End Innings
          </button>
        </div>
      )}

      {/* Setup prompts for missing players */}
      {!isMatchOver && !isInningsBreak && !canScore && !overJustCompleted && (
        <div className="px-4 max-w-lg mx-auto space-y-3 mt-4">
          {/* Show current selection status */}
          <div className="gs-card p-4">
            <h3 className="font-bold mb-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Setup Required</h3>
            <div className="space-y-2">
              <div className={`flex items-center justify-between p-2 rounded-lg ${match.striker ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'}`}>
                <span>🏏 Striker</span>
                <span className="font-bold">{match.striker || 'Not selected'}</span>
              </div>
              <div className={`flex items-center justify-between p-2 rounded-lg ${match.non_striker ? 'bg-emerald-900/30 text-emerald-400' : isLastManStanding() ? 'bg-gray-800 text-gray-500' : 'bg-amber-900/30 text-amber-400'}`}>
                <span>🏏 Non-Striker</span>
                <span className="font-bold">{match.non_striker || (isLastManStanding() ? 'N/A' : 'Not selected')}</span>
              </div>
              <div className={`flex items-center justify-between p-2 rounded-lg ${match.current_bowler ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'}`}>
                <span>🎯 Bowler</span>
                <span className="font-bold">{match.current_bowler || 'Not selected'}</span>
              </div>
            </div>
          </div>

          {/* Selection buttons */}
          {!match.striker && (
            <button
              onClick={() => {
                setDismissedPosition('striker');
                setShowNewBatsman(true);
              }}
              className="gs-btn-primary w-full py-3"
            >
              Select Striker
            </button>
          )}
          {match.striker && !match.non_striker && !isLastManStanding() && getAvailableBatsmen().filter(p => p !== match.striker).length > 0 && (
            <button
              onClick={() => {
                setDismissedPosition('nonStriker');
                setShowNewBatsman(true);
              }}
              className="gs-btn-primary w-full py-3"
            >
              Select Non-Striker
            </button>
          )}
          {match.striker && (match.non_striker || isLastManStanding()) && !match.current_bowler && (
            <button
              onClick={() => setShowNewBowler(true)}
              className="gs-btn-primary w-full py-3"
            >
              Select Bowler
            </button>
          )}
        </div>
      )}

      {/* Inline Scorecard */}
      <AnimatePresence>
        {showScorecard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 mt-4 max-w-lg mx-auto space-y-4"
          >
            <div className="gs-card p-4">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Batting
              </h3>
              <div className="space-y-2">
                {Object.values(battingStats).map(s => (
                  <div key={s.name} className={`flex items-center justify-between py-2 px-3 rounded-xl ${match.striker === s.name ? 'bg-amber-500/10' : 'bg-gray-800/50'}`}>
                    <div>
                      <span className="font-semibold text-sm">{s.name}</span>
                      {match.striker === s.name && <span className="text-amber-500 ml-1">*</span>}
                      {s.is_out && <div className="text-xs text-gray-500">{s.wicket_type} {s.fielder ? `(${s.fielder})` : ''}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-500">{s.runs} <span className="text-gray-500 text-sm font-normal">({s.balls})</span></div>
                      <div className="text-xs text-gray-500">{s.fours}x4 {s.sixes}x6 SR:{s.strike_rate.toFixed(0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="gs-card p-4">
              <h3 className="font-bold text-lg mb-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Bowling</h3>
              <div className="space-y-2">
                {Object.values(bowlingStats).map(s => (
                  <div key={s.name} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-800/50">
                    <span className="font-semibold text-sm">{s.name}</span>
                    <div className="text-right text-sm">
                      <span className="font-bold">{s.wickets}W</span>
                      <span className="text-gray-500 ml-2">{formatOvers(s.balls)}-{s.runs} Eco:{s.economy.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            settings={settings}
            onSave={setSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        {showWicket && (
          <WicketModal
            striker={match.striker}
            nonStriker={match.non_striker}
            fielders={getBowlingTeamPlayers().length > 0 ? getBowlingTeamPlayers() : Object.keys(bowlingStats)}
            onDismiss={handleWicket}
            onClose={() => setShowWicket(false)}
          />
        )}

        {showNewBatsman && (
          <PlayerSelectModal
            title="New Batsman"
            subtitle={dismissedPosition === 'nonStriker' ? 'Replacing non-striker' : dismissedPosition === 'striker' ? 'Replacing striker' : 'Select batsman'}
            players={getAvailableBatsmen()}
            exclude={match.striker && dismissedPosition !== 'striker' ? [match.striker] : match.non_striker && dismissedPosition !== 'nonStriker' ? [match.non_striker] : []}
            onSelect={selectBatsman}
            color="amber"
            icon={<span className="text-2xl">🏏</span>}
          />
        )}

        {showNewBowler && !showOverComplete && (
          <PlayerSelectModal
            title="Select Bowler"
            players={getAvailableBowlers()}
            exclude={[]}
            onSelect={selectBowler}
            color="blue"
            icon={<span className="text-2xl">🎯</span>}
          />
        )}

        {showOverComplete && (
          <OverCompleteModal
            currentBowler={match.current_bowler}
            players={getAvailableBowlers()}
            exclude={settings.noConsecutiveBowler && lastBowler ? [lastBowler] : []}
            onSelect={selectBowler}
            noConsecutive={settings.noConsecutiveBowler}
          />
        )}

        {showInningsBreak && (
          <InningsBreakModal
            match={match}
            onStart={handleStartSecondInnings}
          />
        )}

        {showEndInnings && (
          <EndInningsConfirmModal
            score={score}
            wickets={wickets}
            balls={totalBalls}
            maxOvers={maxOvers}
            onConfirm={handleEndInnings}
            onCancel={() => setShowEndInnings(false)}
            isSecondInnings={match.innings === 2}
          />
        )}
      </AnimatePresence>

      {/* Celebration */}
      <CelebrationOverlay
        type={celebration}
        playerName={celebPlayer || undefined}
        teamName={celebTeam || undefined}
        onDismiss={() => { setCelebration(null); setCelebPlayer(''); setCelebTeam(''); }}
      />
    </div>
  );
}
