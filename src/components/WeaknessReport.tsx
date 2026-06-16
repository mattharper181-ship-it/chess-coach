import type { Weaknesses } from '../lib/game-analyzer';

interface Props {
  weaknesses: Weaknesses;
  totalGames: number;
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const PHASE_LABELS: Record<string, string> = {
  opening: 'Opening — you tend to get into trouble in the first 10 moves',
  middlegame: 'Middlegame — complex positions with many pieces lead to mistakes',
  endgame: 'Endgame — technique and precision let you down after most pieces are off',
  balanced: 'Balanced — mistakes are spread evenly across all phases',
};

const PHASE_TIPS: Record<string, string[]> = {
  opening: [
    'Memorize one solid opening for White and one for Black',
    'Follow opening principles: center, develop, castle',
    'Study your most-played openings in the "Openings" tab',
  ],
  middlegame: [
    'Slow down before every move — ask "what does my opponent threaten?"',
    'Look for tactics: forks, pins, discovered attacks',
    'Study the Lessons below for key tactical patterns',
  ],
  endgame: [
    'Activate your king — it\'s a strong piece in the endgame',
    'Pass pawns are your best weapon — push them',
    'Study basic endgame theory: K+P vs K, rook endgames',
  ],
  balanced: [
    'Keep doing tactics puzzles daily',
    'Review your lost games for recurring patterns',
  ],
};

export function WeaknessReport({ weaknesses, totalGames }: Props) {
  const { avgAccuracy, avgBlunders, worstPhase, worstOpenings, bestOpenings, recentTrend } = weaknesses;

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="bg-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Performance Overview</h2>
        <div className="space-y-4">
          {avgAccuracy > 0 && (
            <StatBar
              label="Avg Accuracy"
              value={Math.round(avgAccuracy * 10) / 10}
              max={100}
              color={avgAccuracy >= 85 ? 'bg-green-500' : avgAccuracy >= 70 ? 'bg-amber-500' : 'bg-red-500'}
            />
          )}
          <StatBar
            label="Avg Blunders / Game"
            value={Math.round(avgBlunders * 10) / 10}
            max={5}
            color={avgBlunders < 1 ? 'bg-green-500' : avgBlunders < 2 ? 'bg-amber-500' : 'bg-red-500'}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{totalGames}</div>
            <div className="text-sm text-gray-400">Games analyzed</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className={`text-2xl ${recentTrend === 'improving' ? 'text-green-400' : recentTrend === 'declining' ? 'text-red-400' : 'text-gray-300'}`}>
              {recentTrend === 'improving' ? '📈' : recentTrend === 'declining' ? '📉' : '➡️'}
            </div>
            <div className="text-sm text-gray-400 capitalize">{recentTrend}</div>
          </div>
        </div>
      </div>

      {/* Weakness phase */}
      <div className="bg-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Biggest Weakness</h2>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-sm font-medium px-3 py-1 rounded-full capitalize ${
            worstPhase === 'opening' ? 'bg-blue-900 text-blue-300' :
            worstPhase === 'middlegame' ? 'bg-purple-900 text-purple-300' :
            worstPhase === 'endgame' ? 'bg-orange-900 text-orange-300' :
            'bg-gray-700 text-gray-300'
          }`}>
            {worstPhase}
          </span>
        </div>
        <p className="text-gray-300 text-sm mb-4">{PHASE_LABELS[worstPhase]}</p>
        <ul className="space-y-2">
          {PHASE_TIPS[worstPhase]?.map(tip => (
            <li key={tip} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-amber-400 mt-0.5">→</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Openings */}
      {worstOpenings.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Openings to Improve</h2>
          <div className="space-y-2">
            {worstOpenings.map(o => (
              <div key={o.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 truncate max-w-[65%]">{o.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{o.games}g</span>
                  <span className={`text-sm font-medium ${o.winRate < 0.4 ? 'text-red-400' : o.winRate < 0.55 ? 'text-amber-400' : 'text-green-400'}`}>
                    {Math.round(o.winRate * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best openings */}
      {bestOpenings.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Your Best Openings</h2>
          <div className="space-y-2">
            {bestOpenings.map(o => (
              <div key={o.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 truncate max-w-[65%]">{o.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{o.games}g</span>
                  <span className="text-sm font-medium text-green-400">{Math.round(o.winRate * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
