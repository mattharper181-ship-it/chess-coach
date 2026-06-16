import { useState } from 'react';
import { useChessData } from './hooks/useChessData';
import { ProfileHeader } from './components/ProfileHeader';
import { WeaknessReport } from './components/WeaknessReport';
import { LessonsPanel } from './components/LessonsPanel';
import { GameList } from './components/GameList';

const DEFAULT_USERNAME = 'UrinalCakeReviewer';

type Tab = 'dashboard' | 'games' | 'lessons';

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-5xl animate-bounce">♟</div>
      <p className="text-gray-400 text-lg">Analyzing your games…</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-5xl">⚠️</div>
      <p className="text-red-400">{message}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-amber-500 text-black rounded-lg font-medium hover:bg-amber-400"
      >
        Try Again
      </button>
    </div>
  );
}

function UsernameForm({ onSubmit }: { onSubmit: (u: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      <div className="text-6xl">♟</div>
      <h1 className="text-3xl font-bold text-white">Chess Coach</h1>
      <p className="text-gray-400 text-center max-w-sm">
        Enter your chess.com username and we'll analyze your games to build a personalized training plan.
      </p>
      <form
        className="flex gap-2 w-full max-w-sm"
        onSubmit={e => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()); }}
      >
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="chess.com username"
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="px-5 py-2 bg-amber-500 text-black rounded-lg font-semibold hover:bg-amber-400"
        >
          Analyze
        </button>
      </form>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'games', label: '♟ Games' },
  { id: 'lessons', label: '📚 Lessons' },
];

export default function App() {
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const { profile, stats, analyzedGames, weaknesses, lessons, loading, error, timeClass, setTimeClass, reload } = useChessData(username);

  if (showForm) {
    return <UsernameForm onSubmit={u => { setUsername(u); setShowForm(false); }} />;
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <ProfileHeader
        profile={profile}
        stats={stats}
        weaknesses={weaknesses}
        gamesAnalyzed={analyzedGames.length}
        timeClass={timeClass}
        setTimeClass={setTimeClass}
      />

      {/* Tab bar */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="ml-auto flex items-center">
              <button
                onClick={() => setShowForm(true)}
                className="text-xs text-gray-500 hover:text-gray-300 py-3 px-2"
              >
                Change player
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Analysis</h2>
              {weaknesses ? (
                <WeaknessReport weaknesses={weaknesses} totalGames={analyzedGames.length} />
              ) : (
                <p className="text-gray-500">No games found for this time class. Try switching to "All".</p>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Top Lessons For You</h2>
              {lessons.length > 0 ? (
                <LessonsPanel lessons={lessons.slice(0, 4)} />
              ) : (
                <p className="text-gray-500">Load some games to get personalized lessons.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'games' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Recent Games</h2>
            {analyzedGames.length > 0 ? (
              <GameList games={analyzedGames} />
            ) : (
              <p className="text-gray-500">No games found. Try switching the time class filter.</p>
            )}
          </div>
        )}

        {activeTab === 'lessons' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">All Lessons</h2>
            <p className="text-gray-400 mb-6 text-sm">
              Lessons marked <span className="text-amber-400 font-medium">"Recommended for you"</span> are based on patterns found in your games.
            </p>
            <LessonsPanel lessons={lessons} />
          </div>
        )}
      </div>
    </div>
  );
}
