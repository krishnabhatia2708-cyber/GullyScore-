import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Target, Trophy, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Ball, Match } from '../types';
import { TopBar } from '../components/layout/TopBar';
import { Spinner } from '../components/ui/Spinner';
import { showToast } from '../components/ui/Toast';
import {
  calculateBattingStats,
  calculateBowlingStats,
  calculateExtras,
  calculateFallOfWickets,
  formatOvers,
  getInningsTeamName,
} from '../lib/cricket';

function formatDismissal(player: ReturnType<typeof calculateBattingStats>[number]): string {
  if (!player.is_out) return 'not out';
  const bowler = player.bowler ? ` b ${player.bowler}` : '';
  if (player.wicket_type === 'Bowled') return `b ${player.bowler || ''}`;
  if (player.wicket_type === 'Caught') return `c ${player.fielder || 'Unknown'}${bowler}`;
  if (player.wicket_type === 'LBW') return `lbw${bowler}`;
  if (player.wicket_type === 'Run Out') return `run out (${player.fielder || 'Unknown'})`;
  if (player.wicket_type === 'Stumped') return `st ${player.fielder || 'Unknown'}${bowler}`;
  return `${player.wicket_type || 'out'}${bowler}`;
}

export function ScorecardPage() {
  const { params, navigate } = useApp();
  const matchId = params?.matchId;
  const [match, setMatch] = useState<Match | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInnings, setActiveInnings] = useState(1);

  useEffect(() => {
    async function loadData() {
      if (!matchId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const [matchRes, ballsRes] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).single(),
        supabase.from('balls').select('*').eq('match_id', matchId).order('created_at', { ascending: true }),
      ]);

      if (matchRes.error) showToast('Unable to load match', 'error');
      setMatch(matchRes.data ?? null);
      setBalls(ballsRes.data ?? []);
      setActiveInnings(matchRes.data?.innings && matchRes.data.innings >= 2 ? 2 : 1);
      setLoading(false);
    }

    loadData();
  }, [matchId]);

  const innings = useMemo(() => ({
    1: {
      batting: calculateBattingStats(balls, 1),
      bowling: calculateBowlingStats(balls, 1),
      extras: calculateExtras(balls, 1),
      fow: calculateFallOfWickets(balls, 1),
    },
    2: {
      batting: calculateBattingStats(balls, 2),
      bowling: calculateBowlingStats(balls, 2),
      extras: calculateExtras(balls, 2),
      fow: calculateFallOfWickets(balls, 2),
    },
  }), [balls]);

  const exportPdf = () => {
    if (!match) return;

    const doc = new jsPDF();
    let y = 16;
    doc.setFontSize(16);
    doc.text(`${match.team_a_name} vs ${match.team_b_name}`, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Venue: ${match.venue || 'Gully Cricket Match'}`, 14, y);
    y += 6;
    doc.text(`Toss: ${match.toss_winner || '-'} ${match.toss_winner ? `chose to ${match.toss_decision.toLowerCase()}` : ''}`, 14, y);
    y += 6;
    if (match.result) {
      doc.text(`Result: ${match.result}`, 14, y);
      y += 6;
    }
    if (match.player_of_match) {
      doc.text(`Player of Match: ${match.player_of_match}`, 14, y);
      y += 8;
    }

    [1, 2].forEach(inn => {
      if (inn === 2 && match.innings < 2) return;
      const batting = inn === 1 ? innings[1].batting : innings[2].batting;
      const bowling = inn === 1 ? innings[1].bowling : innings[2].bowling;
      doc.setFontSize(12);
      doc.text(`${getInningsTeamName(match, inn)} innings`, 14, y);
      y += 6;
      doc.setFontSize(9);
      batting.forEach(player => {
        doc.text(`${player.name}: ${player.runs} (${player.balls}) ${formatDismissal(player)}`, 16, y);
        y += 5;
      });
      doc.text(`Extras: ${inn === 1 ? innings[1].extras : innings[2].extras}`, 16, y);
      y += 6;
      bowling.forEach(player => {
        doc.text(`${player.name}: ${formatOvers(player.balls)}-${player.runs}-${player.wickets}`, 16, y);
        y += 5;
      });
      y += 4;
    });

    doc.save(`scorecard-${match.team_a_name}-vs-${match.team_b_name}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <TopBar title="Scorecard" />
        <div className="flex justify-center py-20"><Spinner /></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-950">
        <TopBar title="Scorecard" />
        <div className="px-4 py-20 text-center text-gray-500">Match not found</div>
      </div>
    );
  }

  const active = activeInnings === 1 ? innings[1] : innings[2];

  return (
    <div className="min-h-screen bg-gray-950 pb-6">
      <TopBar title="Scorecard" showBack backTo="dashboard" />

      <div className="px-4 max-w-2xl mx-auto pt-4 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="gs-card-premium p-4">
          <div className="text-center mb-4">
            <div className="text-gray-500 text-sm">{match.venue || 'Gully Cricket Match'}</div>
            <div className="text-white font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {match.team_a_name} vs {match.team_b_name}
            </div>
            <div className="text-gray-500 text-xs mt-1">{match.overs} Overs</div>
          </div>

          {match.toss_winner && (
            <div className="text-center mb-3 text-xs text-gray-400">
              {match.toss_winner} won the toss and chose to {match.toss_decision.toLowerCase()}
            </div>
          )}

          {match.result && (
            <div className="text-center py-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-xl border border-amber-500/30">
              <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <div className="text-amber-400 font-bold text-sm">{match.result}</div>
              {match.player_of_match && (
                <div className="text-xs text-gray-300 mt-1">
                  Player of the Match: <span className="text-amber-400 font-semibold">{match.player_of_match}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-900/50 rounded-xl">
              <div className="text-gray-500 text-xs mb-1">{getInningsTeamName(match, 1)}</div>
              <div className="text-2xl font-black text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {match.score1}/{match.wickets1}
              </div>
              <div className="text-gray-500 text-xs">{formatOvers(match.balls1)} ov</div>
            </div>
            <div className="text-center p-3 bg-gray-900/50 rounded-xl">
              <div className="text-gray-500 text-xs mb-1">{getInningsTeamName(match, 2)}</div>
              {match.innings >= 2 ? (
                <>
                  <div className="text-2xl font-black text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {match.score2}/{match.wickets2}
                  </div>
                  <div className="text-gray-500 text-xs">{formatOvers(match.balls2)} ov</div>
                </>
              ) : (
                <div className="text-gray-600 text-sm">Yet to bat</div>
              )}
            </div>
          </div>

          {match.target && (
            <div className="text-center mt-3 text-amber-400 text-sm flex items-center justify-center gap-2">
              <Target className="w-4 h-4" />
              Target: {match.target}
            </div>
          )}
        </motion.div>

        {match.innings >= 2 && (
          <div className="flex bg-gray-900 rounded-xl p-1">
            {[1, 2].map(inn => (
              <button
                key={inn}
                onClick={() => setActiveInnings(inn)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeInnings === inn ? 'bg-amber-500 text-black' : 'text-gray-400'
                }`}
              >
                {getInningsTeamName(match, inn)} Innings
              </button>
            ))}
          </div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-gray-800">
            <Users className="w-4 h-4 text-emerald-500" />
            <span className="font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Batting - {getInningsTeamName(match, activeInnings)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs bg-gray-900/50">
                  <th className="text-left p-2">Batsman</th>
                  <th className="text-center p-2">R</th>
                  <th className="text-center p-2">B</th>
                  <th className="text-center p-2">4s</th>
                  <th className="text-center p-2">6s</th>
                  <th className="text-right p-2">SR</th>
                </tr>
              </thead>
              <tbody>
                {active.batting.map(player => (
                  <tr key={player.name} className="border-t border-gray-800/50">
                    <td className="p-2">
                      <div className="font-medium text-white">{player.name}</div>
                      <div className="text-xs text-gray-500">{formatDismissal(player)}</div>
                    </td>
                    <td className="text-center p-2 font-bold text-amber-500">{player.runs}</td>
                    <td className="text-center p-2 text-gray-400">{player.balls}</td>
                    <td className="text-center p-2 text-gray-400">{player.fours}</td>
                    <td className="text-center p-2 text-gray-400">{player.sixes}</td>
                    <td className="text-right p-2 text-gray-400">{player.strike_rate.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-2 border-t border-gray-800/50 text-xs text-gray-500">
            Extras: {active.extras}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-gray-800">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Bowling</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs bg-gray-900/50">
                  <th className="text-left p-2">Bowler</th>
                  <th className="text-center p-2">O</th>
                  <th className="text-center p-2">R</th>
                  <th className="text-center p-2">W</th>
                  <th className="text-center p-2">Wd</th>
                  <th className="text-right p-2">Econ</th>
                </tr>
              </thead>
              <tbody>
                {active.bowling.map(player => (
                  <tr key={player.name} className="border-t border-gray-800/50">
                    <td className="p-2 font-medium text-white">{player.name}</td>
                    <td className="text-center p-2 text-gray-400">{formatOvers(player.balls)}</td>
                    <td className="text-center p-2 text-gray-400">{player.runs}</td>
                    <td className="text-center p-2 font-bold text-emerald-500">{player.wickets}</td>
                    <td className="text-center p-2 text-gray-400">{player.wides}</td>
                    <td className="text-right p-2 text-gray-400">{player.economy.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {active.fow.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gs-card p-3">
            <div className="font-bold mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Fall of Wickets</div>
            <div className="flex flex-wrap gap-2">
              {active.fow.map(item => (
                <span key={`${item.wicket}-${item.score}`} className="text-xs bg-gray-800 px-2 py-1 rounded">
                  <span className="text-white">{item.score}/{item.wicket}</span>{' '}
                  <span className="text-gray-500">({item.batsman}, {item.overs})</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(`Scorecard: ${match.team_a_name} vs ${match.team_b_name}\n${match.score1}/${match.wickets1} vs ${match.score2}/${match.wickets2}`);
              showToast('Scorecard copied!', 'success');
            }}
            className="flex-1 gs-btn-secondary py-3 flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button onClick={exportPdf} className="flex-1 gs-btn-secondary py-3 flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => navigate('live-scoring', { matchId: match.id })} className="flex-1 gs-btn-primary py-3">
            View Match
          </button>
        </div>
      </div>
    </div>
  );
}
