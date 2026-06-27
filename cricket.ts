import { Ball, BattingStats, BowlingStats, Match } from '../types';

export function formatOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export function isLegalDelivery(ball: Ball): boolean {
  return !ball.is_wide && !ball.is_no_ball;
}

export function isBowlerWicket(ball: Ball): boolean {
  return ball.is_wicket && !['Run Out', 'Retired Out', 'Retired Hurt', 'Obstructing'].includes(ball.wicket_type);
}

export function calculateInningsScore(balls: Ball[], innings: number) {
  const inningsBalls = balls.filter(ball => ball.innings === innings);
  return {
    score: inningsBalls.reduce((sum, ball) => sum + ball.total_runs, 0),
    wickets: inningsBalls.filter(ball => ball.is_wicket).length,
    legalBalls: inningsBalls.filter(isLegalDelivery).length,
  };
}

export function calculateBattingStats(balls: Ball[], innings: number): BattingStats[] {
  const stats: Record<string, BattingStats> = {};

  for (const ball of balls.filter(item => item.innings === innings)) {
    if (!ball.batsman) continue;

    stats[ball.batsman] ??= {
      name: ball.batsman,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      is_out: false,
      strike_rate: 0,
    };

    const batter = stats[ball.batsman];
    if (!ball.is_wide && !ball.is_no_ball) {
      batter.balls += 1;
    }

    if (!ball.is_bye && !ball.is_leg_bye && !ball.is_wide) {
      batter.runs += ball.runs;
      if (ball.runs === 4) batter.fours += 1;
      if (ball.runs === 6) batter.sixes += 1;
    }

    if (ball.is_wicket && ball.dismissed_batsman) {
      stats[ball.dismissed_batsman] ??= {
        name: ball.dismissed_batsman,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        is_out: false,
        strike_rate: 0,
      };
      stats[ball.dismissed_batsman].is_out = true;
      stats[ball.dismissed_batsman].wicket_type = ball.wicket_type;
      stats[ball.dismissed_batsman].fielder = ball.fielder;
      stats[ball.dismissed_batsman].bowler = ball.bowler;
    }
  }

  return Object.values(stats).map(stat => ({
    ...stat,
    strike_rate: stat.balls > 0 ? (stat.runs / stat.balls) * 100 : 0,
  }));
}

export function calculateBowlingStats(balls: Ball[], innings: number): BowlingStats[] {
  const stats: Record<string, BowlingStats> = {};

  for (const ball of balls.filter(item => item.innings === innings)) {
    if (!ball.bowler) continue;

    stats[ball.bowler] ??= {
      name: ball.bowler,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      wides: 0,
      no_balls: 0,
    };

    const bowler = stats[ball.bowler];
    if (isLegalDelivery(ball)) bowler.balls += 1;
    if (ball.is_wide) bowler.wides += 1;
    if (ball.is_no_ball) bowler.no_balls += 1;
    bowler.runs += ball.total_runs - (ball.is_bye || ball.is_leg_bye ? ball.extra_runs : 0);
    if (isBowlerWicket(ball)) bowler.wickets += 1;
  }

  return Object.values(stats).map(stat => ({
    ...stat,
    overs: Math.floor(stat.balls / 6),
    economy: stat.balls > 0 ? stat.runs / (stat.balls / 6) : 0,
  }));
}

export function calculateExtras(balls: Ball[], innings: number): number {
  return balls
    .filter(ball => ball.innings === innings)
    .reduce((sum, ball) => sum + ball.extra_runs, 0);
}

export function calculateFallOfWickets(balls: Ball[], innings: number) {
  const fall: { score: number; wicket: number; batsman: string; overs: string }[] = [];
  let score = 0;
  let wickets = 0;
  let legalBalls = 0;

  for (const ball of balls.filter(item => item.innings === innings)) {
    score += ball.total_runs;
    if (isLegalDelivery(ball)) legalBalls += 1;
    if (ball.is_wicket) {
      wickets += 1;
      fall.push({
        score,
        wicket: wickets,
        batsman: ball.dismissed_batsman || ball.batsman,
        overs: formatOvers(legalBalls),
      });
    }
  }

  return fall;
}

export function getInningsTeamName(match: Match, innings: number): string {
  const firstBattingTeam = match.innings === 1 ? match.batting_team : match.bowling_team;
  const secondBattingTeam = firstBattingTeam === match.team_a_name ? match.team_b_name : match.team_a_name;
  return innings === 1 ? firstBattingTeam : secondBattingTeam;
}

export function calculateSecondInningsResult(match: Match, score: number, wickets: number): string {
  if (!match.target) return 'Match tied';
  if (score >= match.target) {
    return `${match.batting_team} won by ${Math.max(0, 10 - wickets)} wickets`;
  }
  if (score === match.target - 1) {
    return 'Match tied';
  }
  return `${match.bowling_team} won by ${match.target - score - 1} runs`;
}
