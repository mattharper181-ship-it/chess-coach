import { useState, useEffect, useCallback } from 'react';
import { getProfile, getStats, getRecentGames, type PlayerProfile, type PlayerStats, type ChesscomGame } from '../lib/chesscom-api';
import { analyzeGame, deriveWeaknesses, type AnalyzedGame, type Weaknesses } from '../lib/game-analyzer';
import { generateLessons, type Lesson } from '../lib/lessons';

export type TimeClass = 'all' | 'blitz' | 'rapid' | 'bullet';

export interface ChessData {
  profile: PlayerProfile | null;
  stats: PlayerStats | null;
  rawGames: ChesscomGame[];
  analyzedGames: AnalyzedGame[];
  weaknesses: Weaknesses | null;
  lessons: Lesson[];
  loading: boolean;
  error: string | null;
  timeClass: TimeClass;
  setTimeClass: (t: TimeClass) => void;
  reload: () => void;
}

export function useChessData(username: string): ChessData {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [rawGames, setRawGames] = useState<ChesscomGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeClass, setTimeClass] = useState<TimeClass>('blitz');
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const [p, s, g] = await Promise.all([
          getProfile(username),
          getStats(username),
          getRecentGames(username, 3),
        ]);
        if (!cancelled) {
          setProfile(p);
          setStats(s);
          setRawGames(g);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [username, tick]);

  const filtered = timeClass === 'all'
    ? rawGames
    : rawGames.filter(g => g.time_class === timeClass);

  const analyzedGames = filtered.slice(0, 80).map(g => analyzeGame(g, username));
  const weaknesses = analyzedGames.length ? deriveWeaknesses(analyzedGames) : null;
  const lessons = weaknesses ? generateLessons(weaknesses, analyzedGames) : [];

  return { profile, stats, rawGames, analyzedGames, weaknesses, lessons, loading, error, timeClass, setTimeClass, reload };
}
