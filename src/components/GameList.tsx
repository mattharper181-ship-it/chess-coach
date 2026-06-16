import { useState } from 'react';
import type { AnalyzedGame } from '../lib/game-analyzer';
import { GameViewer } from './GameViewer';

interface Props {
  games: AnalyzedGame[];
}

function ResultBadge({ result }: { result: AnalyzedGame['result'] }) {
  const map = { win: 'bg-green-900 text-green-300', loss: 'bg-red-900 text-red-300', draw: 'bg-gray-700 text-gray-300' };
  const label = { win: 'W', loss: 'L', draw: 'D' };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${map[result]}`}>{label[result]}</span>
  );
}

function PhaseBadge({ phase }: { phase: AnalyzedGame['phase'] }) {
  const map: Record<string, string> = {
    opening: 'text-blue-400',
    middlegame: 'text-purple-400',
    endgame: 'text-orange-400',
    balanced: 'text-gray-500',
  };
  if (phase === 'balanced') return null;
  return <span className={`text-xs capitalize ${map[phase]}`}>errors in {phase}</span>;
}

export function GameList({ games }: Props) {
  const [selected, setSelected] = useState<AnalyzedGame | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 20;
  const total = games.length;
  const pageGames = games.slice(page * perPage, (page + 1) * perPage);

  return (
    <div>
      {selected && <GameViewer game={selected} onClose={() => setSelected(null)} />}

      <div className="space-y-2">
        {pageGames.map(g => {
          const opponent = g.playerColor === 'white' ? g.game.black.username : g.game.white.username;
          const oppRating = g.playerColor === 'white' ? g.game.black.rating : g.game.white.rating;
          const date = new Date(g.game.end_time * 1000).toLocaleDateString();
          const totalErrors = g.blunders.length + g.mistakes.length + g.inaccuracies.length;

          return (
            <button
              key={g.game.uuid}
              onClick={() => setSelected(g)}
              className="w-full text-left bg-gray-800 hover:bg-gray-750 rounded-xl p-4 transition-colors border border-gray-700 hover:border-gray-600"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ResultBadge result={g.result} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">vs {opponent}</span>
                      <span className="text-gray-500 text-xs">({oppRating})</span>
                    </div>
                    <div className="text-gray-500 text-xs truncate">{g.opening}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <div className="hidden sm:block">
                    <PhaseBadge phase={g.phase} />
                    {totalErrors > 0 && (
                      <div className="text-xs text-gray-500">
                        {g.blunders.length > 0 && <span className="text-red-400">{g.blunders.length}??</span>}
                        {g.mistakes.length > 0 && <span className="text-orange-400 ml-1">{g.mistakes.length}?</span>}
                        {g.inaccuracies.length > 0 && <span className="text-yellow-400 ml-1">{g.inaccuracies.length}?!</span>}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {g.accuracy != null && (
                      <div className={`text-sm font-medium ${g.accuracy >= 85 ? 'text-green-400' : g.accuracy >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                        {Math.round(g.accuracy)}%
                      </div>
                    )}
                    <div className="text-xs text-gray-500">{date}</div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pagination */}
      {total > perPage && (
        <div className="flex items-center justify-between mt-4">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-30 hover:bg-gray-700 disabled:hover:bg-gray-800"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-400">
            {page * perPage + 1}–{Math.min((page + 1) * perPage, total)} of {total}
          </span>
          <button
            disabled={(page + 1) * perPage >= total}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-30 hover:bg-gray-700 disabled:hover:bg-gray-800"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
