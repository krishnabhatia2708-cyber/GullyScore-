import { supabase } from './supabase';

export interface BattingStats {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
}

export interface BowlingStats {
  wickets: number;
  balls: number;
  runs: number;
}

export interface MatchSummaryData {
  potmName: string;
  potmTeam: string;
  potmRuns: number;
  potmBalls: number;
  potmWickets: number;
  potmFours: number;
  potmSixes: number;
  potmSR: number;
  potmReason: string;
  topBatterName: string;
  topBatterRuns: number;
  topBatterBalls: number;
  topBowlerName: string;
  topBowlerWickets: number;
  topBowlerRuns: number;
  highestPartnership: string;
  totalBoundaries: number;
  totalSixes: number;
  bestOver: string;
  matchReport: string;
}

function generateMatchReport(
  match: { team_a_name: string; team_b_name: string; result: string; score1: number; wickets1: number; score2: number; wickets2: number; overs: number },
  summary: MatchSummaryData
): string {
  const winner = match.result?.includes('won') ? match.result.split(' won')[0] : match.team_a_name;
  let report = `${winner} secured a victory`;

  if (summary.potmName) {
    const contributions: string[] = [];
    if (summary.potmRuns > 0) contributions.push(`scoring ${summary.potmRuns} runs`);
    if (summary.potmWickets > 0) contributions.push(`taking ${summary.potmWickets} wicket${summary.potmWickets > 1 ? 's' : ''}`);
    if (contributions.length > 0) {
      report += `. ${summary.potmName}${summary.potmTeam ? ` (${summary.potmTeam})` : ''} was named Player of the Match for ${contributions.join(' and ')}`;
    }
  }

  if (summary.topBatterName && summary.topBatterName !== summary.potmName) {
    report += ` ${summary.topBatterName} top-scored with ${summary.topBatterRuns} runs.`;
  }

  if (summary.topBowlerName && summary.topBowlerName !== summary.potmName) {
    report += ` ${summary.topBowlerName} was the pick of the bowlers with ${summary.topBowlerWickets}/${summary.topBowlerRuns}.`;
  }

  return report;
}

export async function processCompletedMatch(matchId: string, userId: string): Promise<void> {
  // Get match data
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
  if (!match) return;

  // Get all balls for this match
  const { data: balls } = await supabase.from('balls').select('*').eq('match_id', matchId);
  if (!balls || balls.length === 0) return;

  // Calculate batting stats per player
  const battingStats: Record<string, BattingStats> = {};
  const bowlingStats: Record<string, BowlingStats> = {};
  const playerTeams: Record<string, string> = {};

  // Identify teams
  const teamABatters = new Set<string>();
  const teamBBatters = new Set<string>();
  const teamABowlers = new Set<string>();
  const teamBBowlers = new Set<string>();

  for (const ball of balls) {
    // Batting
    if (ball.batsman) {
      if (!battingStats[ball.batsman]) {
        battingStats[ball.batsman] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
      }

      if (!ball.is_wide && !ball.is_no_ball) {
        battingStats[ball.batsman].balls++;
        if (!ball.is_bye && !ball.is_leg_bye) {
          battingStats[ball.batsman].runs += ball.runs;
          if (ball.runs === 4) battingStats[ball.batsman].fours++;
          if (ball.runs === 6) battingStats[ball.batsman].sixes++;
        }
      }

      if (ball.is_wicket && ball.dismissed_batsman === ball.batsman) {
        battingStats[ball.batsman].isOut = true;
      }

      // Track team
      if (match.batting_team === match.team_a_name) {
        if (match.innings === 1) teamABatters.add(ball.batsman);
        else teamBBatters.add(ball.batsman);
      } else {
        if (match.innings === 1) teamBBatters.add(ball.batsman);
        else teamABatters.add(ball.batsman);
      }
    }

    // Bowling
    if (ball.bowler) {
      if (!bowlingStats[ball.bowler]) {
        bowlingStats[ball.bowler] = { wickets: 0, balls: 0, runs: 0 };
      }

      if (!ball.is_wide && !ball.is_no_ball) {
        bowlingStats[ball.bowler].balls++;
      }
      bowlingStats[ball.bowler].runs += ball.total_runs;

      if (ball.is_wicket && !['Run Out', 'Retired Out', 'Retired Hurt'].includes(ball.wicket_type)) {
        bowlingStats[ball.bowler].wickets++;
      }

      // Track team
      if (match.bowling_team === match.team_a_name) {
        teamABowlers.add(ball.bowler);
      } else {
        teamBBowlers.add(ball.bowler);
      }
    }
  }

  // Assign teams
  for (const name of teamABatters) playerTeams[name] = match.team_a_name;
  for (const name of teamBBatters) playerTeams[name] = match.team_b_name;
  for (const name of teamABowlers) if (!playerTeams[name]) playerTeams[name] = match.team_a_name;
  for (const name of teamBBowlers) if (!playerTeams[name]) playerTeams[name] = match.team_b_name;

  // Calculate POTM score
  let potmName = '';
  let potmScore = -1;
  let potmData = { runs: 0, balls: 0, wickets: 0, fours: 0, sixes: 0 };

  for (const [name, stats] of Object.entries(battingStats)) {
    const bowling = bowlingStats[name] || { wickets: 0, balls: 0, runs: 0 };
    const sr = stats.balls > 0 ? (stats.runs / stats.balls) * 100 : 0;
    const score = stats.runs + bowling.wickets * 25 + stats.fours + stats.sixes * 2 + (stats.balls > 0 && sr > 150 ? 10 : 0);

    if (score > potmScore) {
      potmScore = score;
      potmName = name;
      potmData = {
        runs: stats.runs,
        balls: stats.balls,
        wickets: bowling.wickets,
        fours: stats.fours,
        sixes: stats.sixes,
      };
    }
  }

  // Check bowlers who didn't bat
  for (const [name, stats] of Object.entries(bowlingStats)) {
    const batting = battingStats[name] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
    const score = batting.runs + stats.wickets * 30 + (stats.wickets >= 3 ? 20 : 0);

    if (score > potmScore) {
      potmScore = score;
      potmName = name;
      potmData = {
        runs: batting.runs,
        balls: batting.balls,
        wickets: stats.wickets,
        fours: batting.fours,
        sixes: batting.sixes,
      };
    }
  }

  // Find top batter
  let topBatter = { name: '', runs: 0, balls: 0 };
  for (const [name, stats] of Object.entries(battingStats)) {
    if (stats.runs > topBatter.runs) {
      topBatter = { name, runs: stats.runs, balls: stats.balls };
    }
  }

  // Find top bowler
  let topBowler = { name: '', wickets: 0, runs: 0 };
  for (const [name, stats] of Object.entries(bowlingStats)) {
    if (stats.wickets > topBowler.wickets || (stats.wickets === topBowler.wickets && stats.runs < topBowler.runs)) {
      topBowler = { name, wickets: stats.wickets, runs: stats.runs };
    }
  }

  // Calculate totals
  const totalBoundaries = Object.values(battingStats).reduce((sum, s) => sum + s.fours, 0);
  const totalSixes = Object.values(battingStats).reduce((sum, s) => sum + s.sixes, 0);

  // Generate POTM reason
  const contributions: string[] = [];
  if (potmData.runs > 0) contributions.push(`scoring ${potmData.runs} runs`);
  if (potmData.wickets > 0) contributions.push(`taking ${potmData.wickets} wicket${potmData.wickets > 1 ? 's' : ''}`);
  const potmReason = contributions.length > 0
    ? `Awarded for ${contributions.join(' and ')}.`
    : 'Awarded for outstanding performance.';

  const summary: MatchSummaryData = {
    potmName,
    potmTeam: playerTeams[potmName] || '',
    potmRuns: potmData.runs,
    potmBalls: potmData.balls,
    potmWickets: potmData.wickets,
    potmFours: potmData.fours,
    potmSixes: potmData.sixes,
    potmSR: potmData.balls > 0 ? (potmData.runs / potmData.balls) * 100 : 0,
    potmReason,
    topBatterName: topBatter.name,
    topBatterRuns: topBatter.runs,
    topBatterBalls: topBatter.balls,
    topBowlerName: topBowler.name,
    topBowlerWickets: topBowler.wickets,
    topBowlerRuns: topBowler.runs,
    highestPartnership: '', // TODO: Calculate partnerships
    totalBoundaries,
    totalSixes,
    bestOver: '', // TODO: Calculate best over
    matchReport: '',
  };

  summary.matchReport = generateMatchReport(match, summary);

  // Save match summary
  await supabase.from('match_summaries').upsert({
    match_id: matchId,
    user_id: userId,
    potm_name: summary.potmName,
    potm_team: summary.potmTeam,
    potm_runs: summary.potmRuns,
    potm_balls: summary.potmBalls,
    potm_wickets: summary.potmWickets,
    potm_fours: summary.potmFours,
    potm_sixes: summary.potmSixes,
    potm_sr: summary.potmSR,
    potm_reason: summary.potmReason,
    top_batter_name: summary.topBatterName,
    top_batter_runs: summary.topBatterRuns,
    top_batter_balls: summary.topBatterBalls,
    top_bowler_name: summary.topBowlerName,
    top_bowler_wickets: summary.topBowlerWickets,
    top_bowler_runs: summary.topBowlerRuns,
    highest_partnership: summary.highestPartnership,
    total_boundaries: summary.totalBoundaries,
    total_sixes: summary.totalSixes,
    best_over: summary.bestOver,
    match_report: summary.matchReport,
  }, { onConflict: 'match_id' });

  // Update match with POTM
  await supabase.from('matches').update({ player_of_match: potmName }).eq('id', matchId);

  // Update player career stats
  await updatePlayerCareerStats(matchId, userId, battingStats, bowlingStats, playerTeams, potmName);
}

async function updatePlayerCareerStats(
  _matchId: string,
  userId: string,
  battingStats: Record<string, BattingStats>,
  bowlingStats: Record<string, BowlingStats>,
  playerTeams: Record<string, string>,
  potmName: string
): Promise<void> {
  const allPlayers = new Set([...Object.keys(battingStats), ...Object.keys(bowlingStats)]);

  for (const playerName of allPlayers) {
    const batting = battingStats[playerName] || { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
    const bowling = bowlingStats[playerName] || { wickets: 0, balls: 0, runs: 0 };
    const teamName = playerTeams[playerName] || '';

    // Check if player stats exist
    const { data: existing } = await supabase
      .from('player_career_stats')
      .select('*')
      .eq('player_name', playerName)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Update existing stats
      const newRuns = existing.runs + batting.runs;
      const newBallsFaced = existing.balls_faced + batting.balls;
      const newWickets = existing.wickets + bowling.wickets;
      const newBallsBowled = existing.balls_bowled + bowling.balls;
      const newRunsConceded = existing.runs_conceded + bowling.runs;
      const newFours = existing.fours + batting.fours;
      const newSixes = existing.sixes + batting.sixes;
      const newInnings = existing.innings_played + (batting.balls > 0 ? 1 : 0);
      const newNotOuts = existing.not_outs + (batting.balls > 0 && !batting.isOut ? 1 : 0);
      const newPotm = existing.potm_awards + (playerName === potmName ? 1 : 0);

      const highestScore = Math.max(existing.highest_score, batting.runs);
      const outs = newInnings - newNotOuts;
      const average = outs > 0 ? newRuns / outs : newRuns;
      const strikeRate = newBallsFaced > 0 ? (newRuns / newBallsFaced) * 100 : 0;
      const economy = newBallsBowled > 0 ? (newRunsConceded / (newBallsBowled / 6)) : 0;

      // Check for 50s and 100s
      const fifties = existing.fifties + (batting.runs >= 50 && batting.runs < 100 ? 1 : 0);
      const hundreds = existing.hundreds + (batting.runs >= 100 ? 1 : 0);
      const fiveWickets = existing.five_wicket_hauls + (bowling.wickets >= 5 ? 1 : 0);

      // Best bowling
      let bestBowling = existing.best_bowling;
      if (bowling.wickets > 0) {
        const currentBest = existing.best_bowling ? parseInt(existing.best_bowling.split('/')[0]) : 0;
        if (bowling.wickets > currentBest || (bowling.wickets === currentBest && bowling.runs < parseInt(existing.best_bowling.split('/')[1]))) {
          bestBowling = `${bowling.wickets}/${bowling.runs}`;
        }
      }

      await supabase.from('player_career_stats').update({
        matches_played: existing.matches_played + 1,
        innings_played: newInnings,
        not_outs: newNotOuts,
        runs: newRuns,
        balls_faced: newBallsFaced,
        highest_score: highestScore,
        strike_rate: strikeRate,
        average: average,
        fifties: fifties,
        hundreds: hundreds,
        fours: newFours,
        sixes: newSixes,
        wickets: newWickets,
        balls_bowled: newBallsBowled,
        runs_conceded: newRunsConceded,
        best_bowling: bestBowling,
        economy: economy,
        five_wicket_hauls: fiveWickets,
        potm_awards: newPotm,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      // Create new stats
      await supabase.from('player_career_stats').insert({
        user_id: userId,
        player_name: playerName,
        team_name: teamName,
        matches_played: 1,
        innings_played: batting.balls > 0 ? 1 : 0,
        not_outs: batting.balls > 0 && !batting.isOut ? 1 : 0,
        runs: batting.runs,
        balls_faced: batting.balls,
        highest_score: batting.runs,
        strike_rate: batting.balls > 0 ? (batting.runs / batting.balls) * 100 : 0,
        average: batting.isOut && batting.balls > 0 ? batting.runs : batting.runs,
        fifties: batting.runs >= 50 && batting.runs < 100 ? 1 : 0,
        hundreds: batting.runs >= 100 ? 1 : 0,
        fours: batting.fours,
        sixes: batting.sixes,
        wickets: bowling.wickets,
        balls_bowled: bowling.balls,
        runs_conceded: bowling.runs,
        best_bowling: bowling.wickets > 0 ? `${bowling.wickets}/${bowling.runs}` : '',
        economy: bowling.balls > 0 ? (bowling.runs / (bowling.balls / 6)) : 0,
        five_wicket_hauls: bowling.wickets >= 5 ? 1 : 0,
        potm_awards: playerName === potmName ? 1 : 0,
      });
    }
  }
}

export interface RankingEntry {
  playerName: string;
  teamName: string;
  value: number;
  secondary?: number;
  matches: number;
}

export async function getRankings(userId: string, type: 'runs' | 'wickets' | 'mvp' | 'sixes' | 'fours' | 'sr' | 'economy' | 'potm'): Promise<RankingEntry[]> {
  const { data: stats } = await supabase
    .from('player_career_stats')
    .select('*')
    .eq('user_id', userId);

  if (!stats) return [];

  const rankings: RankingEntry[] = [];

  for (const stat of stats) {
    const entry: RankingEntry = {
      playerName: stat.player_name,
      teamName: stat.team_name || '',
      value: 0,
      matches: stat.matches_played,
    };

    switch (type) {
      case 'runs':
        entry.value = stat.runs;
        entry.secondary = stat.strike_rate;
        break;
      case 'wickets':
        entry.value = stat.wickets;
        entry.secondary = stat.economy;
        break;
      case 'mvp':
        entry.value = stat.runs + stat.wickets * 25 + stat.potm_awards * 50;
        break;
      case 'sixes':
        entry.value = stat.sixes;
        break;
      case 'fours':
        entry.value = stat.fours;
        break;
      case 'sr':
        entry.value = stat.strike_rate;
        entry.secondary = stat.runs;
        break;
      case 'economy':
        entry.value = stat.economy ? 100 - stat.economy : 0; // Lower is better, invert for ranking
        entry.secondary = stat.wickets;
        break;
      case 'potm':
        entry.value = stat.potm_awards;
        break;
    }

    rankings.push(entry);
  }

  // Sort by value descending
  rankings.sort((a, b) => b.value - a.value || (b.secondary || 0) - (a.secondary || 0));

  return rankings;
}
