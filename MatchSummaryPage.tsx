import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, TrendingUp, Users, Share2, Home, Medal, Calendar, MapPin,
         ChevronDown, ChevronUp, Download, Award, BarChart3, Flame, Zap } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Match, Ball } from '../types';
import { TopBar } from '../components/layout/TopBar';
import { Spinner } from '../components/ui/Spinner';
import { showToast } from '../components/ui/Toast';
import { jsPDF } from 'jspdf';

interface MatchSummaryData {
  potm_name: string;
  potm_team: string;
  potm_runs: number;
  potm_balls: number;
  potm_wickets: number;
  potm_fours: number;
  potm_sixes: number;
  potm_sr: number;
  potm_reason: string;
  top_batter_name: string;
  top_batter_runs: number;
  top_batter_balls: number;
  top_bowler_name: string;
  top_bowler_wickets: number;
  top_bowler_runs: number;
  total_boundaries: number;
  total_sixes: number;
  match_report: string;
}

interface PlayerBattingStats {
  name: string;
  team: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  sr: number;
  isOut: boolean;
  dismissalType?: string;
  dismissalInfo?: string;
}

interface PlayerBowlingStats {
  name: string;
  team: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  economy: number;
}

export function MatchSummaryPage() {
  const { params, navigate } = useApp();
  const matchId = params?.matchId;

  const [match, setMatch] = useState<Match | null>(null);
  const [summary, setSummary] = useState<MatchSummaryData | null>(null);
  const [batting, setBatting] = useState<{ teamA: PlayerBattingStats[]; teamB: PlayerBattingStats[] }>({ teamA: [], teamB: [] });
  const [bowling, setBowling] = useState<{ teamA: PlayerBowlingStats[]; teamB: PlayerBowlingStats[] }>({ teamA: [], teamB: [] });
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Collapsible states
  const [showTeamABatting, setShowTeamABatting] = useState(false);
  const [showTeamBBatting, setShowTeamBBatting] = useState(false);
  const [showTeamABowling, setShowTeamABowling] = useState(false);
  const [showTeamBBowling, setShowTeamBBowling] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);

  useEffect(() => {
    if (matchId) loadData();
  }, [matchId]);

  const loadData = async () => {
    setLoading(true);

    const { data: matchData } = await supabase.from('matches').select('*').eq('id', matchId).single();
    if (matchData) setMatch(matchData);

    const { data: summaryData } = await supabase.from('match_summaries').select('*').eq('match_id', matchId).single();
    if (summaryData) setSummary(summaryData);

    // Load all balls to compute full batting and bowling
    const { data: ballsData } = await supabase.from('balls').select('*').eq('match_id', matchId).order('created_at', { ascending: true });
    if (ballsData && matchData) {
      const stats = computeFullStats(ballsData, matchData);
      setBatting(stats.batting);
      setBowling(stats.bowling);
    }

    setLoading(false);
  };

  const computeFullStats = (balls: Ball[], m: Match) => {
    const battingA: Record<string, PlayerBattingStats> = {};
    const battingB: Record<string, PlayerBattingStats> = {};
    const bowlingA: Record<string, PlayerBowlingStats> = {};
    const bowlingB: Record<string, PlayerBowlingStats> = {};

    for (const ball of balls) {
      const team = ball.innings === 1
        ? (m.batting_team === m.team_a_name ? 'A' : 'B')
        : (m.batting_team === m.team_a_name ? 'B' : 'A');

      // Batting
      const battingMap = team === 'A' ? battingA : battingB;
      if (!battingMap[ball.batsman]) {
        battingMap[ball.batsman] = {
          name: ball.batsman,
          team: team === 'A' ? m.team_a_name : m.team_b_name,
          runs: 0, balls: 0, fours: 0, sixes: 0, sr: 0, isOut: false
        };
      }
      if (!ball.is_wide && !ball.is_no_ball) {
        battingMap[ball.batsman].balls++;
        if (!ball.is_bye && !ball.is_leg_bye) {
          battingMap[ball.batsman].runs += ball.runs;
          if (ball.runs === 4) battingMap[ball.batsman].fours++;
          if (ball.runs === 6) battingMap[ball.batsman].sixes++;
        }
      }
      if (ball.is_wicket && ball.dismissed_batsman === ball.batsman) {
        battingMap[ball.batsman].isOut = true;
        battingMap[ball.batsman].dismissalType = ball.wicket_type;
        battingMap[ball.batsman].dismissalInfo = ball.fielder
          ? `${ball.wicket_type} ${ball.fielder} b ${ball.bowler}`
          : `${ball.wicket_type} b ${ball.bowler}`;
        if (ball.wicket_type === 'Bowled') battingMap[ball.batsman].dismissalInfo = `b ${ball.bowler}`;
      }

      // Bowling
      const bowlingTeam = team === 'A' ? 'B' : 'A';
      const bowlingMap = bowlingTeam === 'A' ? bowlingA : bowlingB;
      if (!bowlingMap[ball.bowler]) {
        bowlingMap[ball.bowler] = {
          name: ball.bowler,
          team: bowlingTeam === 'A' ? m.team_a_name : m.team_b_name,
          overs: 0, balls: 0, runs: 0, wickets: 0, economy: 0
        };
      }
      bowlingMap[ball.bowler].runs += ball.total_runs;
      if (!ball.is_wide && !ball.is_no_ball) {
        bowlingMap[ball.bowler].balls++;
      }
      if (ball.is_wicket && !['Run Out', 'Retired Out', 'Retired Hurt'].includes(ball.wicket_type)) {
        bowlingMap[ball.bowler].wickets++;
      }
    }

    // Calculate SR and Economy
    Object.values({ ...battingA, ...battingB }).forEach(b => {
      b.sr = b.balls > 0 ? (b.runs / b.balls) * 100 : 0;
    });
    Object.values({ ...bowlingA, ...bowlingB }).forEach(b => {
      b.overs = Math.floor(b.balls / 6);
      b.economy = b.balls > 0 ? (b.runs / (b.balls / 6)) : 0;
    });

    return {
      batting: { teamA: Object.values(battingA), teamB: Object.values(battingB) },
      bowling: { teamA: Object.values(bowlingA), teamB: Object.values(bowlingB) }
    };
  };

  const handleShare = () => {
    if (!match) return;

    const potmLine = summary?.potm_name ? `\n\n⭐ Player of the Match: ${summary.potm_name}` : '';
    const text = `🏏 ${match.team_a_name} vs ${match.team_b_name}

${match.result}

📊 ${match.team_a_name}: ${match.score1}/${match.wickets1} (${Math.floor(match.balls1/6)}.${match.balls1%6})
📊 ${match.team_b_name}: ${match.score2}/${match.wickets2} (${Math.floor(match.balls2/6)}.${match.balls2%6})${potmLine}

${summary?.match_report || ''}`;

    navigator.clipboard.writeText(text);
    showToast('Match summary copied!', 'success');
  };

  const handleDownloadPdf = async () => {
    if (!match) return;

    setGeneratingPdf(true);
    showToast('Generating PDF...', 'info');

    try {
      // Use setTimeout to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 100));

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Helper functions
      const addText = (text: string, x: number, y: number, options: { fontSize?: number; fontStyle?: string; color?: string; align?: 'left' | 'center' | 'right' } = {}) => {
        doc.setFontSize(options.fontSize || 10);
        doc.setFont('helvetica', options.fontStyle || 'normal');
        if (options.color) doc.setTextColor(options.color);
        doc.text(text, x, y, { align: options.align || 'left' });
        doc.setTextColor(0, 0, 0);
      };

      // Header
      doc.setFillColor(245, 158, 11); // Amber
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setTextColor(0, 0, 0);
      addText('GULLYSCORE', pageWidth / 2, 12, { fontSize: 20, fontStyle: 'bold', align: 'center' });
      addText('Cricket Match Report', pageWidth / 2, 22, { fontSize: 10, align: 'center' });

      yPos = 40;

      // Match Title
      addText(`${match.team_a_name} vs ${match.team_b_name}`, pageWidth / 2, yPos, { fontSize: 16, fontStyle: 'bold', align: 'center' });

      // Date and Venue
      yPos += 8;
      if (match.created_at) {
        addText(`Date: ${new Date(match.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`, margin, yPos, { fontSize: 9, color: '#666' });
      }
      if (match.venue) {
        addText(`Venue: ${match.venue}`, margin + 60, yPos, { fontSize: 9, color: '#666' });
      }

      // Result
      yPos += 12;
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 15, 3, 3, 'F');
      addText('RESULT', margin + 2, yPos, { fontSize: 8, color: '#F59E0B', fontStyle: 'bold' });
      addText(match.result || 'Match completed', margin + 2, yPos + 8, { fontSize: 11, fontStyle: 'bold' });

      // Score Summary
      yPos += 22;
      addText('SCORE SUMMARY', margin, yPos, { fontSize: 10, fontStyle: 'bold' });
      yPos += 8;

      // Team A score
      addText(`${match.team_a_name}`, margin, yPos, { fontSize: 10 });
      addText(`${match.score1}/${match.wickets1}`, pageWidth - margin - 30, yPos, { fontSize: 14, fontStyle: 'bold', align: 'right' });
      addText(`(${Math.floor(match.balls1 / 6)}.${match.balls1 % 6} ov)`, pageWidth - margin, yPos, { fontSize: 8, color: '#666', align: 'right' });

      // Team B score
      yPos += 10;
      addText(`${match.team_b_name}`, margin, yPos, { fontSize: 10 });
      addText(`${match.score2}/${match.wickets2}`, pageWidth - margin - 30, yPos, { fontSize: 14, fontStyle: 'bold', align: 'right' });
      addText(`(${Math.floor(match.balls2 / 6)}.${match.balls2 % 6} ov)`, pageWidth - margin, yPos, { fontSize: 8, color: '#666', align: 'right' });

      // Toss Info
      if (match.toss_winner) {
        yPos += 12;
        addText(`TOSS: ${match.toss_winner} won and chose to ${match.toss_decision?.toLowerCase() || 'bat'}`, margin, yPos, { fontSize: 9, color: '#666' });
      }

      // Player of the Match
      const potmName = summary?.potm_name || match.player_of_match || '';
      if (potmName) {
        yPos += 15;
        doc.setFillColor(254, 243, 199); // Amber light
        doc.roundedRect(margin, yPos - 5, pageWidth - 2 * margin, 22, 3, 3, 'F');
        addText('PLAYER OF THE MATCH', margin + 2, yPos, { fontSize: 8, color: '#F59E0B', fontStyle: 'bold' });
        yPos += 6;
        addText(potmName, margin + 2, yPos, { fontSize: 12, fontStyle: 'bold' });
        if (summary?.potm_team) {
          addText(`(${summary.potm_team})`, margin + 50, yPos, { fontSize: 9, color: '#666' });
        }
        yPos += 6;
        const potmStats = [];
        if (summary?.potm_runs) potmStats.push(`${summary.potm_runs} runs`);
        if (summary?.potm_wickets) potmStats.push(`${summary.potm_wickets} wkts`);
        if (potmStats.length > 0) {
          addText(potmStats.join(' | '), margin + 2, yPos, { fontSize: 9 });
        }
        yPos += 5;
      }

      // Add batting scorecard function
      const addBattingSection = (title: string, players: PlayerBattingStats[], startY: number) => {
        let y = startY;
        addText(title, margin, y, { fontSize: 10, fontStyle: 'bold' });
        y += 6;

        // Header
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 3, pageWidth - 2 * margin, 5, 'F');
        addText('Batsman', margin + 1, y, { fontSize: 7, fontStyle: 'bold' });
        addText('R', pageWidth - margin - 40, y, { fontSize: 7, fontStyle: 'bold', align: 'right' });
        addText('B', pageWidth - margin - 30, y, { fontSize: 7, fontStyle: 'bold', align: 'right' });
        addText('4s', pageWidth - margin - 20, y, { fontSize: 7, fontStyle: 'bold', align: 'right' });
        addText('6s', pageWidth - margin - 10, y, { fontSize: 7, fontStyle: 'bold', align: 'right' });
        addText('SR', pageWidth - margin, y, { fontSize: 7, fontStyle: 'bold', align: 'right' });

        y += 5;
        players.sort((a, b) => b.runs - a.runs).forEach((p) => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = margin;
          }
          const status = p.isOut ? (p.dismissalInfo || 'out') : 'not out';
          addText(`${p.name} ${p.isOut ? '' : '*'}`, margin + 1, y, { fontSize: 8 });
          addText(status.substring(0, 20), margin + 40, y, { fontSize: 7, color: '#666' });
          addText(String(p.runs), pageWidth - margin - 40, y, { fontSize: 8, align: 'right' });
          addText(String(p.balls), pageWidth - margin - 30, y, { fontSize: 8, align: 'right' });
          addText(String(p.fours), pageWidth - margin - 20, y, { fontSize: 8, align: 'right' });
          addText(String(p.sixes), pageWidth - margin - 10, y, { fontSize: 8, align: 'right' });
          addText(p.sr.toFixed(0), pageWidth - margin, y, { fontSize: 8, align: 'right' });
          y += 6;
        });
        return y + 5;
      };

      // Add bowling scorecard function
      const addBowlingSection = (title: string, players: PlayerBowlingStats[], startY: number) => {
        let y = startY;
        addText(title, margin, y, { fontSize: 10, fontStyle: 'bold' });
        y += 6;

        // Header
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 3, pageWidth - 2 * margin, 5, 'F');
        addText('Bowler', margin + 1, y, { fontSize: 7, fontStyle: 'bold' });
        addText('O', pageWidth - margin - 45, y, { fontSize: 7, fontStyle: 'bold', align: 'right' });
        addText('M', pageWidth - margin - 35, y, { fontSize: 7, fontStyle: 'bold', align: 'right' });
        addText('R', pageWidth - margin - 25, y, { fontSize: 7, fontStyle: 'bold', align: 'right' });
        addText('W', pageWidth - margin - 15, y, { fontSize: 7, fontStyle: 'bold', align: 'right' });
        addText('Econ', pageWidth - margin, y, { fontSize: 7, fontStyle: 'bold', align: 'right' });

        y += 5;
        players.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).forEach((p) => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = margin;
          }
          addText(p.name, margin + 1, y, { fontSize: 8 });
          addText(`${p.overs}.${p.balls % 6}`, pageWidth - margin - 45, y, { fontSize: 8, align: 'right' });
          addText('0', pageWidth - margin - 35, y, { fontSize: 8, align: 'right' }); // Maidens not tracked
          addText(String(p.runs), pageWidth - margin - 25, y, { fontSize: 8, align: 'right' });
          addText(String(p.wickets), pageWidth - margin - 15, y, { fontSize: 8, align: 'right' });
          addText(p.economy.toFixed(1), pageWidth - margin, y, { fontSize: 8, align: 'right' });
          y += 6;
        });
        return y + 5;
      };

      // Batting Scorecards
      yPos += 10;
      if (batting.teamA.length > 0) {
        yPos = addBattingSection(`${match.team_a_name} Batting`, batting.teamA, yPos);
      }
      if (batting.teamB.length > 0) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = margin;
        }
        yPos = addBattingSection(`${match.team_b_name} Batting`, batting.teamB, yPos);
      }

      // Bowling Scorecards
      if (bowling.teamA.length > 0) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = margin;
        }
        yPos = addBowlingSection(`${match.team_a_name} Bowling`, bowling.teamA, yPos);
      }
      if (bowling.teamB.length > 0) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = margin;
        }
        yPos = addBowlingSection(`${match.team_b_name} Bowling`, bowling.teamB, yPos);
      }

      // Match Report
      if (summary?.match_report) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }
        yPos += 5;
        addText('MATCH REPORT', margin, yPos, { fontSize: 10, fontStyle: 'bold' });
        yPos += 6;
        const lines = doc.splitTextToSize(summary.match_report, pageWidth - 2 * margin);
        lines.forEach((line: string) => {
          if (yPos > pageHeight - 15) {
            doc.addPage();
            yPos = margin;
          }
          addText(line, margin, yPos, { fontSize: 9 });
          yPos += 5;
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated by GullyScore | Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // Generate filename
      const dateStr = match.created_at ? new Date(match.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const teamASafe = match.team_a_name.replace(/[^a-zA-Z0-9]/g, '_');
      const teamBSafe = match.team_b_name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Match_${teamASafe}_vs_${teamBSafe}_${dateStr}.pdf`;

      // Download the PDF
      doc.save(filename);

      showToast('PDF downloaded successfully!', 'success');
    } catch (error) {
      console.error('PDF generation error:', error);
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Match not found</p>
          <button onClick={() => navigate('dashboard')} className="gs-btn-primary">Go Home</button>
        </div>
      </div>
    );
  }

  const potmName = summary?.potm_name || match.player_of_match || '';
  const potmTeam = summary?.potm_team || '';
  const potmRuns = summary?.potm_runs || 0;
  const potmBalls = summary?.potm_balls || 0;
  const potmWickets = summary?.potm_wickets || 0;
  const potmFours = summary?.potm_fours || 0;
  const potmSixes = summary?.potm_sixes || 0;
  const potmSR = summary?.potm_sr || (potmBalls > 0 ? (potmRuns / potmBalls) * 100 : 0);
  const potmPoints = potmRuns + (potmWickets * 25) + (potmFours * 2) + (potmSixes * 4);

  // Find highlights
  const highestScore = [...batting.teamA, ...batting.teamB].sort((a, b) => b.runs - a.runs)[0];
  const mostSixes = [...batting.teamA, ...batting.teamB].sort((a, b) => b.sixes - a.sixes)[0];
  const mostFours = [...batting.teamA, ...batting.teamB].sort((a, b) => b.fours - a.fours)[0];
  const bestBowling = [...bowling.teamA, ...bowling.teamB].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0];
  const highestSR = [...batting.teamA, ...batting.teamB].filter(b => b.balls >= 6).sort((a, b) => b.sr - a.sr)[0];
  const mvp = [...batting.teamA, ...batting.teamB].map(b => ({
    name: b.name,
    score: b.runs + (b.sixes * 4) + (b.fours * 2) + ((bowling.teamA.find(bo => bo.name === b.name)?.wickets || 0) + (bowling.teamB.find(bo => bo.name === b.name)?.wickets || 0)) * 25
  })).sort((a, b) => b.score - a.score)[0];

  const CollapsibleSection = ({ title, expanded, onToggle, children, icon, badge }: {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
  }) => (
    <div className="gs-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{title}</span>
          {badge}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-800">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 pb-8">
      <TopBar title="Match Summary" showBack backTo="dashboard" />

      <div className="px-4 max-w-2xl mx-auto pt-4 space-y-4">
        {/* Match Result Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 border border-gray-700"
        >
          <div className="text-center mb-4">
            <div className="text-amber-400 text-xs font-semibold mb-2">MATCH RESULT</div>
            <h2 className="text-xl font-black text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {match.result}
            </h2>
          </div>

          {/* Score Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900/60 rounded-xl p-3 text-center">
              <div className="font-semibold text-sm text-gray-400">{match.team_a_name}</div>
              <div className="text-3xl font-black text-white mt-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {match.score1}/{match.wickets1}
              </div>
              <div className="text-gray-500 text-xs">{Math.floor(match.balls1 / 6)}.{match.balls1 % 6} ov</div>
            </div>
            <div className="bg-gray-900/60 rounded-xl p-3 text-center">
              <div className="font-semibold text-sm text-gray-400">{match.team_b_name}</div>
              <div className="text-3xl font-black text-white mt-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {match.score2}/{match.wickets2}
              </div>
              <div className="text-gray-500 text-xs">{Math.floor(match.balls2 / 6)}.{match.balls2 % 6} ov</div>
            </div>
          </div>
        </motion.div>

        {/* Toss Info */}
        {match.toss_winner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="gs-card p-4"
          >
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">🪙</span>
              <span>
                <span className="text-white font-semibold">{match.toss_winner}</span> won the toss and elected to {match.toss_decision?.toLowerCase() || 'bat'} first.
              </span>
            </div>
            {(match.venue || match.created_at) && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
                {match.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(match.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                )}
                {match.venue && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{match.venue}</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Player of the Match - Premium Card */}
        {potmName && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-amber-600/30" />
            <div className="absolute inset-0 border-2 border-amber-500/50 rounded-2xl" />

            <div className="relative p-5">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black px-4 py-1.5 rounded-full font-black text-sm shadow-lg">
                  <Trophy className="w-4 h-4" />
                  PLAYER OF THE MATCH
                </div>
              </div>

              <div className="flex items-center gap-4 justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black text-2xl font-black shadow-lg border-2 border-amber-300/50">
                  {potmName[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {potmName}
                  </h3>
                  {potmTeam && <p className="text-amber-300 font-semibold">{potmTeam}</p>}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-4">
                {potmRuns > 0 && (
                  <div className="bg-black/30 rounded-xl p-2 text-center backdrop-blur-sm">
                    <div className="text-lg font-black text-amber-400">{potmRuns}</div>
                    <div className="text-xs text-gray-400">Runs ({potmBalls})</div>
                  </div>
                )}
                {potmWickets > 0 && (
                  <div className="bg-black/30 rounded-xl p-2 text-center backdrop-blur-sm">
                    <div className="text-lg font-black text-purple-400">{potmWickets}</div>
                    <div className="text-xs text-gray-400">Wickets</div>
                  </div>
                )}
                <div className="bg-black/30 rounded-xl p-2 text-center backdrop-blur-sm">
                  <div className="text-lg font-black text-white">{potmSR.toFixed(0)}</div>
                  <div className="text-xs text-gray-400">SR</div>
                </div>
                <div className="bg-black/30 rounded-xl p-2 text-center backdrop-blur-sm">
                  <div className="text-lg font-black text-yellow-400">{potmPoints}</div>
                  <div className="text-xs text-gray-400">Pts</div>
                </div>
              </div>

              {(potmFours > 0 || potmSixes > 0) && (
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  {potmFours > 0 && <span className="text-blue-400">{potmFours} fours</span>}
                  {potmSixes > 0 && <span className="text-purple-400">{potmSixes} sixes</span>}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* AI Match Report */}
        {(summary?.match_report || match.result) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="gs-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Match Report</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {summary?.match_report || `${match.team_a_name} vs ${match.team_b_name} - ${match.result}`}
            </p>
          </motion.div>
        )}

        {/* Match Highlights */}
        <CollapsibleSection
          title="Match Highlights"
          expanded={showHighlights}
          onToggle={() => setShowHighlights(!showHighlights)}
          icon={<Flame className="w-4 h-4 text-orange-500" />}
        >
          <div className="grid grid-cols-2 gap-3 p-4">
            {highestScore && highestScore.runs > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Medal className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="text-gray-400">Highest Score: </span>
                  <span className="text-white font-semibold">{highestScore.name} ({highestScore.runs})</span>
                </div>
              </div>
            )}
            {mostSixes && mostSixes.sixes > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-purple-400">💎</span>
                <div>
                  <span className="text-gray-400">Most Sixes: </span>
                  <span className="text-white font-semibold">{mostSixes.name} ({mostSixes.sixes})</span>
                </div>
              </div>
            )}
            {mostFours && mostFours.fours > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-400">🎯</span>
                <div>
                  <span className="text-gray-400">Most Fours: </span>
                  <span className="text-white font-semibold">{mostFours.name} ({mostFours.fours})</span>
                </div>
              </div>
            )}
            {bestBowling && bestBowling.wickets > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-purple-500" />
                <div>
                  <span className="text-gray-400">Best Bowling: </span>
                  <span className="text-white font-semibold">{bestBowling.name} ({bestBowling.wickets}/{bestBowling.runs})</span>
                </div>
              </div>
            )}
            {highestSR && highestSR.sr > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <div>
                  <span className="text-gray-400">Best SR: </span>
                  <span className="text-white font-semibold">{highestSR.name} ({highestSR.sr.toFixed(0)})</span>
                </div>
              </div>
            )}
            {mvp && mvp.score > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Award className="w-4 h-4 text-yellow-500" />
                <div>
                  <span className="text-gray-400">MVP: </span>
                  <span className="text-white font-semibold">{mvp.name} ({mvp.score} pts)</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-500" />
              <div>
                <span className="text-gray-400">Total Boundaries: </span>
                <span className="text-white font-semibold">{summary?.total_boundaries || 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-purple-500">💫</span>
              <div>
                <span className="text-gray-400">Total Sixes: </span>
                <span className="text-white font-semibold">{summary?.total_sixes || 0}</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Team A Batting */}
        {batting.teamA.length > 0 && (
          <CollapsibleSection
            title={`${match.team_a_name} Batting`}
            expanded={showTeamABatting}
            onToggle={() => setShowTeamABatting(!showTeamABatting)}
            icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
            badge={<span className="text-gray-500 text-xs ml-2">{batting.teamA.length} players</span>}
          >
            <div className="divide-y divide-gray-800">
              {batting.teamA.sort((a, b) => b.runs - a.runs).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-800/30">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.isOut ? p.dismissalInfo || 'Out' : 'Not Out'}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">{p.runs}</span>
                      <span className="text-gray-500 text-xs">({p.balls})</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.fours}x4 {p.sixes}x6 SR:{p.sr.toFixed(0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Team B Batting */}
        {batting.teamB.length > 0 && (
          <CollapsibleSection
            title={`${match.team_b_name} Batting`}
            expanded={showTeamBBatting}
            onToggle={() => setShowTeamBBatting(!showTeamBBatting)}
            icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
            badge={<span className="text-gray-500 text-xs ml-2">{batting.teamB.length} players</span>}
          >
            <div className="divide-y divide-gray-800">
              {batting.teamB.sort((a, b) => b.runs - a.runs).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-800/30">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.isOut ? p.dismissalInfo || 'Out' : 'Not Out'}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">{p.runs}</span>
                      <span className="text-gray-500 text-xs">({p.balls})</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.fours}x4 {p.sixes}x6 SR:{p.sr.toFixed(0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Team A Bowling */}
        {bowling.teamA.length > 0 && (
          <CollapsibleSection
            title={`${match.team_a_name} Bowling`}
            expanded={showTeamABowling}
            onToggle={() => setShowTeamABowling(!showTeamABowling)}
            icon={<Target className="w-4 h-4 text-purple-500" />}
            badge={<span className="text-gray-500 text-xs ml-2">{bowling.teamA.length} bowlers</span>}
          >
            <div className="divide-y divide-gray-800">
              {bowling.teamA.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-800/30">
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-right text-sm">
                    <span className="font-bold text-purple-400">{p.wickets}/{p.runs}</span>
                    <span className="text-gray-500 ml-2">{p.overs}.{p.balls % 6} ov</span>
                    <span className="text-gray-500 ml-2">Eco:{p.economy.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Team B Bowling */}
        {bowling.teamB.length > 0 && (
          <CollapsibleSection
            title={`${match.team_b_name} Bowling`}
            expanded={showTeamBBowling}
            onToggle={() => setShowTeamBBowling(!showTeamBBowling)}
            icon={<Target className="w-4 h-4 text-purple-500" />}
            badge={<span className="text-gray-500 text-xs ml-2">{bowling.teamB.length} bowlers</span>}
          >
            <div className="divide-y divide-gray-800">
              {bowling.teamB.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-800/30">
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-right text-sm">
                    <span className="font-bold text-purple-400">{p.wickets}/{p.runs}</span>
                    <span className="text-gray-500 ml-2">{p.overs}.{p.balls % 6} ov</span>
                    <span className="text-gray-500 ml-2">Eco:{p.economy.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3 pt-4"
        >
          <button
            onClick={() => navigate('scorecard', { matchId: match.id })}
            className="gs-btn-primary w-full py-4 flex items-center justify-center gap-2 text-lg"
          >
            <Users className="w-5 h-5" />
            View Full Scorecard
          </button>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleShare}
              className="gs-btn-secondary py-3 flex items-center justify-center gap-2 text-sm"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="gs-btn-secondary py-3 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {generatingPdf ? <Spinner size="sm" /> : <Download className="w-4 h-4" />}
              {generatingPdf ? 'PDF...' : 'PDF'}
            </button>
            <button
              onClick={() => navigate('dashboard')}
              className="gs-btn-secondary py-3 flex items-center justify-center gap-2 text-sm"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
