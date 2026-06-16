const BASE = 'https://api.chess.com/pub';

export interface PlayerProfile {
  username: string;
  name?: string;
  avatar?: string;
  country: string;
  joined: number;
  last_online: number;
  followers: number;
  league?: string;
}

export interface RatingStats {
  last: { rating: number; date: number };
  best: { rating: number; date: number; game: string };
  record: { win: number; loss: number; draw: number };
}

export interface PlayerStats {
  chess_rapid?: RatingStats;
  chess_bullet?: RatingStats;
  chess_blitz?: RatingStats;
  tactics?: { highest: { rating: number }; lowest: { rating: number } };
}

export interface ChesscomGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  accuracies?: { white: number; black: number };
  uuid: string;
  time_class: string;
  white: { rating: number; result: string; username: string };
  black: { rating: number; result: string; username: string };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'User-Agent': 'ChessCoach/1.0' },
  });
  if (!res.ok) throw new Error(`chess.com API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const getProfile = (u: string) => get<PlayerProfile>(`/player/${u}`);
export const getStats = (u: string) => get<PlayerStats>(`/player/${u}/stats`);

export async function getRecentGames(username: string, months = 3): Promise<ChesscomGame[]> {
  const all: ChesscomGame[] = [];
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    try {
      const data = await get<{ games: ChesscomGame[] }>(`/player/${username}/games/${y}/${m}`);
      all.push(...(data.games ?? []));
    } catch {}
  }
  return all.sort((a, b) => b.end_time - a.end_time);
}
