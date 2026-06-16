import { Chess } from 'chess.js';
import type { EngineAnalysis } from '../hooks/useStockfish';

interface Props {
  analysis: EngineAnalysis;
  fen: string;
}

function EvalBar({ score, mate }: { score: number | null; mate: number | null }) {
  // percentage of bar that is white (50 = equal)
  let whitePct = 50;
  let label = '0.00';

  if (mate !== null) {
    whitePct = mate > 0 ? 95 : 5;
    label = mate > 0 ? `M${mate}` : `M${Math.abs(mate)}`;
  } else if (score !== null) {
    // clamp to ±1000cp for display
    const clamped = Math.max(-1000, Math.min(1000, score));
    whitePct = 50 + (clamped / 1000) * 45;
    const pawns = Math.abs(score / 100);
    label = (score >= 0 ? '+' : '-') + pawns.toFixed(2);
  }

  const isWhiteAdvantage = mate !== null ? mate > 0 : (score ?? 0) >= 0;

  return (
    <div className="flex items-center gap-3">
      {/* Vertical bar */}
      <div className="w-5 h-28 bg-gray-900 rounded overflow-hidden border border-gray-700 flex flex-col-reverse">
        <div
          className="bg-white transition-all duration-300"
          style={{ height: `${whitePct}%` }}
        />
      </div>
      {/* Score label */}
      <div className={`text-2xl font-bold tabular-nums ${isWhiteAdvantage ? 'text-white' : 'text-gray-400'}`}>
        {label}
      </div>
    </div>
  );
}

function uciToSan(fen: string, uciMoves: string[]): string[] {
  const chess = new Chess(fen);
  const sans: string[] = [];
  for (const uci of uciMoves.slice(0, 6)) {
    try {
      const from = uci.slice(0, 2) as any;
      const to = uci.slice(2, 4) as any;
      const promotion = uci[4] as any;
      const result = chess.move({ from, to, promotion });
      if (result) sans.push(result.san);
    } catch { break; }
  }
  return sans;
}

export function EnginePanel({ analysis, fen }: Props) {
  const { score, mate, depth, pv, isAnalyzing } = analysis;

  const pvSan = pv.length > 0 ? uciToSan(fen, pv) : [];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Stockfish 18
        </span>
        <div className="flex items-center gap-2">
          {isAnalyzing ? (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              depth {depth}
            </span>
          ) : depth > 0 ? (
            <span className="text-xs text-gray-500">depth {depth}</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-start gap-4">
        <EvalBar score={score} mate={mate} />

        <div className="flex-1 min-w-0">
          {/* Best move */}
          {analysis.bestMove && (
            <div className="mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Best move</span>
              <div className="text-lg font-bold text-amber-400 mt-0.5">
                {pvSan[0] ?? analysis.bestMove}
              </div>
            </div>
          )}

          {/* Principal variation */}
          {pvSan.length > 1 && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">Line</span>
              <p className="text-sm text-gray-300 mt-0.5 font-mono leading-relaxed">
                {pvSan.join(' ')}
              </p>
            </div>
          )}

          {!analysis.bestMove && !isAnalyzing && (
            <p className="text-sm text-gray-600 italic">Enable analysis to see engine suggestions</p>
          )}

          {isAnalyzing && !analysis.bestMove && (
            <p className="text-sm text-gray-500 animate-pulse">Calculating…</p>
          )}
        </div>
      </div>
    </div>
  );
}
