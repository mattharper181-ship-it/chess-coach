import { Chess } from 'chess.js';
import type { ChesscomGame } from './chesscom-api';

export interface MoveAnnotation {
  ply: number;
  san: string;
  fen: string;
  eval?: number;
  nag?: number;
  comment?: string;
}

export interface AnalyzedGame {
  game: ChesscomGame;
  playerColor: 'white' | 'black';
  result: 'win' | 'loss' | 'draw';
  opening: string;
  eco: string;
  moves: MoveAnnotation[];
  playerMoves: MoveAnnotation[];
  blunders: MoveAnnotation[];
  mistakes: MoveAnnotation[];
  inaccuracies: MoveAnnotation[];
  phase: 'opening' | 'middlegame' | 'endgame' | 'balanced';
  accuracy?: number;
}

function parsePGNHeaders(pgn: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of pgn.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

function parseMoves(pgn: string): MoveAnnotation[] {
  const chess = new Chess();
  const annotations: MoveAnnotation[] = [];

  // Strip headers
  const body = pgn.replace(/\[.*?\]\s*/gs, '').trim();

  // Tokenise: move numbers, SANs, NAGs, comments
  const tokens = body.match(/(\d+\.\.?\.|O-O-O|O-O|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?[+#]?|\$\d+|\{[^}]*\}|1-0|0-1|1\/2-1\/2)/g) ?? [];

  let ply = 0;
  let pendingNAG: number | undefined;

  for (const tok of tokens) {
    if (/^\d+\./.test(tok)) continue;
    if (/^(1-0|0-1|1\/2-1\/2)$/.test(tok)) break;

    if (tok.startsWith('$')) {
      pendingNAG = parseInt(tok.slice(1));
      continue;
    }

    if (tok.startsWith('{')) {
      const raw = tok.slice(1, -1);
      if (annotations.length > 0) {
        const last = annotations[annotations.length - 1];
        last.comment = raw;
        if (pendingNAG !== undefined) { last.nag = pendingNAG; pendingNAG = undefined; }
        const em = raw.match(/\[%eval\s+(-?\d+(?:\.\d+)?|#-?\d+)\]/);
        if (em) {
          const v = em[1];
          last.eval = v.startsWith('#') ? (v.includes('-') ? -999 : 999) : parseFloat(v);
        }
      }
      continue;
    }

    try {
      chess.move(tok);
      annotations.push({ ply, san: tok, fen: chess.fen(), nag: pendingNAG });
      pendingNAG = undefined;
      ply++;
    } catch {}
  }

  return annotations;
}

function playerResult(r: string): 'win' | 'loss' | 'draw' {
  if (r === 'win') return 'win';
  if (['resigned', 'checkmated', 'timeout', 'abandoned', 'lose'].includes(r)) return 'loss';
  return 'draw';
}

function mistakePhase(bad: MoveAnnotation[]): AnalyzedGame['phase'] {
  if (bad.length === 0) return 'balanced';
  const opening = bad.filter(m => m.ply < 20).length;
  const endgame = bad.filter(m => m.ply > 59).length;
  const middle = bad.length - opening - endgame;
  const max = Math.max(opening, middle, endgame);
  if (max === opening) return 'opening';
  if (max === endgame) return 'endgame';
  return 'middlegame';
}

export function analyzeGame(game: ChesscomGame, username: string): AnalyzedGame {
  const headers = parsePGNHeaders(game.pgn);
  const moves = parseMoves(game.pgn);

  const playerColor = game.white.username.toLowerCase() === username.toLowerCase() ? 'white' : 'black';
  const pRes = playerColor === 'white' ? game.white.result : game.black.result;
  const result = playerResult(pRes);

  const startPly = playerColor === 'white' ? 0 : 1;
  const playerMoves = moves.filter(m => m.ply % 2 === startPly);

  const blunders = playerMoves.filter(m => m.nag === 2);
  const mistakes = playerMoves.filter(m => m.nag === 4);
  const inaccuracies = playerMoves.filter(m => m.nag === 6);
  const phase = mistakePhase([...blunders, ...mistakes]);

  const accuracy = playerColor === 'white' ? game.accuracies?.white : game.accuracies?.black;

  const eco = headers['ECO'] ?? '';
  const opening = headers['Opening'] ?? (eco ? `ECO ${eco}` : 'Unknown Opening');

  return {
    game,
    playerColor,
    result,
    opening,
    eco,
    moves,
    playerMoves,
    blunders,
    mistakes,
    inaccuracies,
    phase,
    accuracy,
  };
}

export interface Weaknesses {
  avgAccuracy: number;
  avgBlunders: number;
  worstPhase: AnalyzedGame['phase'];
  worstOpenings: { name: string; winRate: number; games: number }[];
  bestOpenings: { name: string; winRate: number; games: number }[];
  recentTrend: 'improving' | 'declining' | 'stable';
}

export function deriveWeaknesses(games: AnalyzedGame[]): Weaknesses {
  if (!games.length) {
    return { avgAccuracy: 0, avgBlunders: 0, worstPhase: 'balanced', worstOpenings: [], bestOpenings: [], recentTrend: 'stable' };
  }

  const withAcc = games.filter(g => g.accuracy != null);
  const avgAccuracy = withAcc.length
    ? withAcc.reduce((s, g) => s + g.accuracy!, 0) / withAcc.length
    : 0;

  const avgBlunders = games.reduce((s, g) => s + g.blunders.length, 0) / games.length;

  // phase frequency
  const phases: Record<string, number> = {};
  for (const g of games) phases[g.phase] = (phases[g.phase] ?? 0) + 1;
  const worstPhase = (Object.entries(phases).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'balanced') as AnalyzedGame['phase'];

  // opening stats
  const openingMap = new Map<string, { w: number; t: number }>();
  for (const g of games) {
    const key = g.opening.split(':')[0].trim().slice(0, 40);
    const e = openingMap.get(key) ?? { w: 0, t: 0 };
    e.t++;
    if (g.result === 'win') e.w++;
    openingMap.set(key, e);
  }
  const openingStats = [...openingMap.entries()]
    .filter(([, v]) => v.t >= 2)
    .map(([name, v]) => ({ name, winRate: v.w / v.t, games: v.t }));
  const worstOpenings = [...openingStats].sort((a, b) => a.winRate - b.winRate).slice(0, 4);
  const bestOpenings = [...openingStats].sort((a, b) => b.winRate - a.winRate).slice(0, 4);

  // trend: compare accuracy of first half vs second half
  const half = Math.floor(withAcc.length / 2);
  const recent = withAcc.slice(0, half);
  const older = withAcc.slice(half);
  const recentAvg = recent.length ? recent.reduce((s, g) => s + g.accuracy!, 0) / recent.length : avgAccuracy;
  const olderAvg = older.length ? older.reduce((s, g) => s + g.accuracy!, 0) / older.length : avgAccuracy;
  const diff = recentAvg - olderAvg;
  const recentTrend = diff > 2 ? 'improving' : diff < -2 ? 'declining' : 'stable';

  return { avgAccuracy, avgBlunders, worstPhase, worstOpenings, bestOpenings, recentTrend };
}
