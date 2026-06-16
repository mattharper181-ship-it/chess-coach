import { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { AnalyzedGame } from '../lib/game-analyzer';
import { useStockfish } from '../hooks/useStockfish';
import { EnginePanel } from './EnginePanel';
import { MoveCoach } from './MoveCoach';
import { analyzeMove, startTip, prospectiveTip } from '../lib/move-coach';
import type { CoachCategory } from '../lib/move-coach';

interface Props {
  game: AnalyzedGame;
  onClose: () => void;
}

const NAG_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '!',  color: 'text-green-400' },
  2: { label: '??', color: 'text-red-500'   },
  3: { label: '!!', color: 'text-blue-400'  },
  4: { label: '?',  color: 'text-orange-400'},
  5: { label: '!?', color: 'text-purple-400'},
  6: { label: '?!', color: 'text-yellow-400'},
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

type CoachFilter = 'all' | 'mistakes' | 'tactics' | 'openings';

const FILTER_LABELS: { key: CoachFilter; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'mistakes', label: 'Mistakes' },
  { key: 'tactics',  label: 'Tactics'  },
  { key: 'openings', label: 'Openings' },
];

const FILTER_CATEGORIES: Record<CoachFilter, CoachCategory[]> = {
  all:      ['mistake','good','opening','tactic','strategy','endgame','info'],
  mistakes: ['mistake'],
  tactics:  ['tactic'],
  openings: ['opening'],
};

function uciToSanSingle(fen: string, uci: string): string | null {
  if (!uci || uci.length < 4) return null;
  try {
    const chess = new Chess(fen);
    const result = chess.move({ from: uci.slice(0,2) as any, to: uci.slice(2,4) as any, promotion: uci[4] as any });
    return result?.san ?? null;
  } catch { return null; }
}

export function GameViewer({ game, onClose }: Props) {
  const [ply, setPly] = useState(0);
  const [engineOn, setEngineOn] = useState(false);
  const [coachFilter, setCoachFilter] = useState<CoachFilter>('all');
  const { analysis, analyze, stop, ready } = useStockfish();

  // Cache engine best move per FEN so blunder tips can show "what you should have played"
  const [analysisByFen, setAnalysisByFen] = useState<Map<string, string>>(new Map());

  const currentFen = ply === 0 ? START_FEN : game.moves[ply - 1]?.fen ?? START_FEN;
  const move = game.moves[ply];
  const isPlayerMove = move?.ply % 2 === (game.playerColor === 'white' ? 0 : 1);
  const annotation = move?.nag ? NAG_LABELS[move.nag] : null;

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); setPly(p => Math.max(0, p - 1)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setPly(p => Math.min(game.moves.length - 1, p + 1)); }
      if (e.key === 'Home')       { e.preventDefault(); setPly(0); }
      if (e.key === 'End')        { e.preventDefault(); setPly(game.moves.length - 1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [game.moves.length]);

  // Engine analysis trigger
  useEffect(() => {
    if (engineOn && ready) analyze(currentFen);
    else if (!engineOn) stop();
  }, [engineOn, currentFen, ready]);

  // Cache bestMove per FEN when engine finishes
  useEffect(() => {
    if (analysis.bestMove && !analysis.isAnalyzing && currentFen) {
      setAnalysisByFen(prev => {
        if (prev.get(currentFen) === analysis.bestMove) return prev;
        const next = new Map(prev);
        next.set(currentFen, analysis.bestMove!);
        return next;
      });
    }
  }, [analysis.bestMove, analysis.isAnalyzing, currentFen]);

  // Coach tip (base position analysis)
  const coachTip = useMemo(() => {
    if (ply === 0) return startTip(game.playerColor, game.opening);
    const lastMove = game.moves[ply - 1];
    if (!lastMove) return startTip(game.playerColor, game.opening);

    const prevFen = ply <= 1 ? START_FEN : (game.moves[ply - 2]?.fen ?? START_FEN);
    const lastIsPlayerMove = lastMove.ply % 2 === (game.playerColor === 'white' ? 0 : 1);

    // Eval swing from player's perspective (+ = improved, - = worsened)
    const playerSign = game.playerColor === 'white' ? 1 : -1;
    const prevEvalRaw = ply <= 1 ? null : (game.moves[ply - 2]?.eval ?? null);
    const currEvalRaw = lastMove.eval ?? null;
    const evalSwing = prevEvalRaw != null && currEvalRaw != null
      ? (currEvalRaw - prevEvalRaw) * playerSign * (lastIsPlayerMove ? 1 : -1)
      : undefined;

    return analyzeMove(prevFen, lastMove.san, lastMove.nag, lastMove.ply, lastIsPlayerMove, evalSwing);
  }, [ply, game]);

  // Engine note — best move for current position
  const engineNote = useMemo(() => {
    if (!engineOn || !ready || !analysis.bestMove) return undefined;
    const bestSAN = uciToSanSingle(currentFen, analysis.bestMove);
    if (!bestSAN) return undefined;
    const evalStr = analysis.mate != null
      ? (analysis.mate > 0 ? `Mate in ${analysis.mate}` : `Opp mates in ${Math.abs(analysis.mate)}`)
      : analysis.score != null
        ? `${analysis.score >= 0 ? '+' : ''}${(analysis.score / 100).toFixed(2)}`
        : null;
    const lastMove = ply > 0 ? game.moves[ply - 1] : null;
    let note = `Best: ${bestSAN}`;
    if (evalStr) note += ` (${evalStr})`;
    if (lastMove && bestSAN !== lastMove.san) note += ` — you played ${lastMove.san}`;
    return note;
  }, [engineOn, ready, analysis.bestMove, analysis.score, analysis.mate, currentFen, ply, game]);

  // "What should I have played?" — engine's suggestion for position BEFORE a blunder/mistake
  const suggestedMove = useMemo(() => {
    if (!engineOn) return undefined;
    const lastMove = ply > 0 ? game.moves[ply - 1] : null;
    if (!lastMove || (lastMove.nag !== 2 && lastMove.nag !== 4)) return undefined;
    const lastIsPlayer = lastMove.ply % 2 === (game.playerColor === 'white' ? 0 : 1);
    if (!lastIsPlayer) return undefined;
    const prevFen = ply <= 1 ? START_FEN : (game.moves[ply - 2]?.fen ?? START_FEN);
    const cachedUCI = analysisByFen.get(prevFen);
    if (!cachedUCI) return undefined;
    const san = uciToSanSingle(prevFen, cachedUCI);
    return san ? `Stockfish suggested ${san} instead` : undefined;
  }, [engineOn, ply, game, analysisByFen]);

  // Prospective tip — warn about hanging pieces before player moves
  const prospective = useMemo(
    () => prospectiveTip(currentFen, game.playerColor),
    [currentFen, game.playerColor]
  );

  // Coach filter matching
  const tipMatchesFilter = FILTER_CATEGORIES[coachFilter].includes(coachTip.category);

  const result = game.result === 'win' ? '✅ Win' : game.result === 'loss' ? '❌ Loss' : '🤝 Draw';
  const opponent = game.playerColor === 'white' ? game.game.black.username : game.game.white.username;
  const opponentRating = game.playerColor === 'white' ? game.game.black.rating : game.game.white.rating;

  // Best move arrow
  const bestMoveArrows: [string, string, string][] = [];
  if (engineOn && analysis.bestMove && analysis.bestMove.length >= 4) {
    bestMoveArrows.push([analysis.bestMove.slice(0,2), analysis.bestMove.slice(2,4), 'rgb(0, 200, 100)']);
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="text-white font-semibold">{game.opening}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
              <span>{result}</span>
              <span>vs {opponent} ({opponentRating})</span>
              <span className="capitalize">{game.game.time_class}</span>
              {game.accuracy != null && <span>Accuracy: {Math.round(game.accuracy)}%</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEngineOn(o => !o)}
              title={ready ? undefined : 'Engine loading…'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                engineOn
                  ? 'bg-green-700 text-green-100 hover:bg-green-600'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              } ${!ready ? 'opacity-50 cursor-wait' : ''}`}
            >
              <span>⚙</span>
              {engineOn ? 'Engine ON' : 'Engine OFF'}
              {!ready && <span className="text-xs opacity-70">(loading)</span>}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 p-5">
          {/* Board column */}
          <div className="w-full md:w-[380px] flex-shrink-0">
            <Chessboard
              position={currentFen}
              boardOrientation={game.playerColor}
              arePiecesDraggable={false}
              customBoardStyle={{ borderRadius: '8px' }}
              customArrows={bestMoveArrows}
            />

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-150"
                style={{ width: `${game.moves.length ? (ply / game.moves.length) * 100 : 0}%` }}
              />
            </div>

            {/* Nav controls */}
            <div className="flex gap-2 mt-2 justify-center">
              <button onClick={() => setPly(0)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm" title="Start (Home)">⏮</button>
              <button onClick={() => setPly(p => Math.max(0, p - 1))} className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm" title="Previous (←)">◀</button>
              <button onClick={() => setPly(p => Math.min(game.moves.length - 1, p + 1))} className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm" title="Next (→)">▶</button>
              <button onClick={() => setPly(game.moves.length - 1)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm" title="End (End)">⏭</button>
            </div>
            <p className="text-center text-xs text-gray-600 mt-1">or use ← → arrow keys</p>

            {move && (
              <div className="mt-2 text-center text-sm text-gray-400">
                Move {Math.floor(move.ply / 2) + 1}{move.ply % 2 === 0 ? '.' : '...'}{' '}
                <span className="text-white font-medium">{move.san}</span>
                {annotation && <span className={`ml-1 font-bold ${annotation.color}`}>{annotation.label}</span>}
                {isPlayerMove
                  ? <span className="ml-2 text-amber-400">← your move</span>
                  : <span className="ml-2 text-gray-600">(opponent)</span>}
              </div>
            )}

            {/* Engine panel */}
            {engineOn && (
              <div className="mt-4">
                <EnginePanel analysis={analysis} fen={currentFen} />
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex-1 min-w-0">
            {/* Coach section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Coach</h3>
                {/* Filter pills */}
                <div className="flex gap-1">
                  {FILTER_LABELS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setCoachFilter(key)}
                      className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                        coachFilter === key
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <MoveCoach
                tip={coachTip}
                engineNote={engineNote}
                suggestedMove={suggestedMove}
                compact={!tipMatchesFilter}
              />

              {/* Prospective tip — warn about hanging pieces */}
              {prospective && (
                <div className="mt-2">
                  <MoveCoach tip={prospective} />
                </div>
              )}
            </div>

            {/* Move list */}
            <h3 className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Moves</h3>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {Array.from({ length: Math.ceil(game.moves.length / 2) }, (_, i) => {
                const w = game.moves[i * 2];
                const b = game.moves[i * 2 + 1];
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 w-6 flex-shrink-0">{i + 1}.</span>
                    {[w, b].map((m, j) => m && (
                      <button
                        key={j}
                        onClick={() => setPly(i * 2 + j + 1)}
                        className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                          ply === i * 2 + j + 1 ? 'bg-amber-500 text-black' : 'hover:bg-gray-800 text-gray-300'
                        }`}
                      >
                        {m.san}
                        {m.nag && NAG_LABELS[m.nag] && (
                          <span className={`font-bold ${NAG_LABELS[m.nag].color}`}>{NAG_LABELS[m.nag].label}</span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Errors list */}
            {(game.blunders.length > 0 || game.mistakes.length > 0) && (
              <div className="mt-4">
                <h3 className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">Your Errors</h3>
                <div className="space-y-2">
                  {game.blunders.map(m => (
                    <button
                      key={m.ply}
                      onClick={() => setPly(m.ply + 1)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-700/40 rounded-lg hover:bg-red-900/50 transition-colors"
                    >
                      <span className="text-red-400 font-bold">??</span>
                      <span className="text-sm text-gray-300">Move {Math.floor(m.ply / 2) + 1} — {m.san}</span>
                    </button>
                  ))}
                  {game.mistakes.map(m => (
                    <button
                      key={m.ply}
                      onClick={() => setPly(m.ply + 1)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 bg-orange-900/30 border border-orange-700/40 rounded-lg hover:bg-orange-900/50 transition-colors"
                    >
                      <span className="text-orange-400 font-bold">?</span>
                      <span className="text-sm text-gray-300">Move {Math.floor(m.ply / 2) + 1} — {m.san}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
