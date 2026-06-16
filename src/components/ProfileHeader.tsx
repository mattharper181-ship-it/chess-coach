import type { PlayerProfile, PlayerStats } from '../lib/chesscom-api';
import type { Weaknesses } from '../lib/game-analyzer';
import type { TimeClass } from '../hooks/useChessData';

interface Props {
  profile: PlayerProfile;
  stats: PlayerStats | null;
  weaknesses: Weaknesses | null;
  gamesAnalyzed: number;
  timeClass: TimeClass;
  setTimeClass: (t: TimeClass) => void;
}

function RatingBadge({ label, rating, record }: { label: string; rating?: number; record?: { win: number; loss: number; draw: number } }) {
  if (!rating) return null;
  const total = record ? record.win + record.loss + record.draw : 0;
  const winPct = total ? Math.round((record!.win / total) * 100) : 0;
  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">{label}</span>
      <span className="text-3xl font-bold text-white">{rating}</span>
      {record && (
        <span className="text-sm text-gray-400">
          {record.win}W / {record.loss}L / {record.draw}D
          <span className="ml-2 text-green-400">{winPct}%</span>
        </span>
      )}
    </div>
  );
}

const TIME_CLASSES: { value: TimeClass; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'bullet', label: '🔫 Bullet' },
  { value: 'blitz', label: '⚡ Blitz' },
  { value: 'rapid', label: '🕐 Rapid' },
];

export function ProfileHeader({ profile, stats, weaknesses, gamesAnalyzed, timeClass, setTimeClass }: Props) {
  const trend = weaknesses?.recentTrend;
  const trendIcon = trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '➡️';
  const trendColor = trend === 'improving' ? 'text-green-400' : trend === 'declining' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Player info */}
        <div className="flex items-center gap-4 mb-6">
          {profile.avatar && (
            <img src={profile.avatar} alt={profile.username} className="w-16 h-16 rounded-full border-2 border-amber-500" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{profile.username.replace(/\b\w/g, c => c.toUpperCase())}</h1>
            {profile.name && <p className="text-gray-400">{profile.name}</p>}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500">{gamesAnalyzed} {gamesAnalyzed === 1 ? 'game' : 'games'} analyzed</span>
              {weaknesses && (
                <span className={`text-sm font-medium ${trendColor}`}>
                  {trendIcon} {trend}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <RatingBadge label="Rapid" rating={stats?.chess_rapid?.last.rating} record={stats?.chess_rapid?.record} />
          <RatingBadge label="Blitz" rating={stats?.chess_blitz?.last.rating} record={stats?.chess_blitz?.record} />
          <RatingBadge label="Bullet" rating={stats?.chess_bullet?.last.rating} record={stats?.chess_bullet?.record} />
        </div>

        {/* Time class filter */}
        <div className="flex gap-2">
          {TIME_CLASSES.map(tc => (
            <button
              key={tc.value}
              onClick={() => setTimeClass(tc.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeClass === tc.value
                  ? 'bg-amber-500 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tc.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
