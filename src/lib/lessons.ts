import type { Weaknesses, AnalyzedGame } from './game-analyzer';

export interface Lesson {
  id: string;
  title: string;
  category: 'opening' | 'tactics' | 'endgame' | 'strategy' | 'mindset';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
  summary: string;
  points: string[];
  practicePrompt?: string;
  relevance: number; // 0-1, how much this applies to the player
}

const LESSON_BANK: Omit<Lesson, 'relevance'>[] = [
  {
    id: 'opening-principles',
    title: 'Opening Principles',
    category: 'opening',
    difficulty: 'beginner',
    icon: '♟',
    summary: 'The first 10 moves set the tone for the whole game. Most games are decided in the opening.',
    points: [
      'Control the center with pawns (e4, d4, e5, d5)',
      'Develop your knights and bishops early — aim for all pieces out by move 10',
      'Castle early (usually kingside) to protect your king',
      'Don\'t move the same piece twice in the opening unless forced',
      'Don\'t bring your queen out too early — it gets chased and you lose tempo',
    ],
    practicePrompt: 'In your next 5 games, count how many pieces you have developed by move 10. Aim for 4+.',
  },
  {
    id: 'tactics-forks',
    title: 'Knight Forks',
    category: 'tactics',
    difficulty: 'beginner',
    icon: '⚔',
    summary: 'A fork attacks two pieces at once. Knights are the sneakiest forkers because they jump over pieces.',
    points: [
      'A fork forces your opponent to lose material — they can only save one piece',
      'Knights on d5/d4/e5/e4 (strong central squares) threaten the most squares',
      'Look for forks whenever your knight can reach an "outpost" near enemy pieces',
      'Classic fork targets: king + queen, king + rook, rook + rook',
      'Before moving, scan all squares your knight can reach — one might hit two targets',
    ],
    practicePrompt: 'Spend 10 minutes on chess.com tactics trainer filtering for "Fork" puzzles.',
  },
  {
    id: 'tactics-pins',
    title: 'Pins and Skewers',
    category: 'tactics',
    difficulty: 'intermediate',
    icon: '📌',
    summary: 'A pin immobilizes a piece because moving it would expose something more valuable behind it.',
    points: [
      'Absolute pin: piece is pinned to the king and literally cannot move',
      'Relative pin: piece could move but would lose something valuable behind it',
      'Bishops and rooks create pins along diagonals and files',
      'A skewer is like a reverse pin — the valuable piece moves away, exposing what\'s behind it',
      'To break a pin: move the pinned piece\'s defender away from the pin line, or block the pin with another piece',
    ],
  },
  {
    id: 'blunder-checks',
    title: 'Blunder Prevention: Always Check',
    category: 'mindset',
    difficulty: 'beginner',
    icon: '🛑',
    summary: 'Most blunders happen because players don\'t check one simple thing before moving.',
    points: [
      'Before every move, ask: "Can my opponent take anything for free after I move?"',
      'Check if you\'re leaving a piece hanging (undefended and attackable)',
      'Check if you\'re walking into a fork, pin, or skewer',
      'Check if your opponent has any checks or threats you haven\'t answered',
      'Slow down — most blunders happen when you move quickly without thinking',
    ],
    practicePrompt: 'Adopt the "Touch-Move" rule: once you decide on a move, take 5 more seconds to check for blunders before playing it.',
  },
  {
    id: 'endgame-king',
    title: 'Activate Your King in the Endgame',
    category: 'endgame',
    difficulty: 'intermediate',
    icon: '♔',
    summary: 'In the endgame, the king is a powerful piece. Keeping it safe costs you games.',
    points: [
      'Once most queens are off the board, centralize your king immediately',
      'King on e4/d4/e5/d5 controls 8 squares — it\'s attacking from there',
      'King + pawn endgames: use the "opposition" rule to outmaneuver your opponent',
      'In king + rook vs king: your king needs to help trap the enemy king on the edge',
      'Rule of thumb: the side with the active king usually wins the endgame',
    ],
  },
  {
    id: 'endgame-pawns',
    title: 'Pawn Endgame Fundamentals',
    category: 'endgame',
    difficulty: 'intermediate',
    icon: '♙',
    summary: 'Pawn endgames are the foundation of chess. Small mistakes here are game-deciding.',
    points: [
      'Passed pawns (no enemy pawns blocking or capturing them) are deadly — push them!',
      'Connected passed pawns (side by side) are even stronger',
      'Doubled pawns (two pawns on same file) are a weakness — avoid them',
      'The "square rule": if the enemy king can\'t reach the queening square, the pawn promotes',
      'Triangulation: a technique to lose a tempo and gain opposition against the enemy king',
    ],
  },
  {
    id: 'strategy-outposts',
    title: 'Creating Outposts',
    category: 'strategy',
    difficulty: 'intermediate',
    icon: '🏰',
    summary: 'An outpost is a square that your opponent\'s pawns can never attack — a permanent home for your piece.',
    points: [
      'Knights on outposts in the enemy\'s half of the board are extremely powerful',
      'To create an outpost, advance your pawn to force the opponent to capture or leave a hole',
      'd5 and e5 (for White) are the classic outpost squares',
      'A knight on d6 in enemy territory can cripple their position',
      'Deny your opponent outposts by keeping your pawns mobile and pawn structure solid',
    ],
  },
  {
    id: 'strategy-open-files',
    title: 'Open Files and the 7th Rank',
    category: 'strategy',
    difficulty: 'intermediate',
    icon: '🚂',
    summary: 'Rooks are most powerful on open files and the 7th rank. Get them there.',
    points: [
      'An open file has no pawns on it — ideal for rooks',
      'Semi-open file: your pawns are gone but opponent\'s remain — still good for rooks',
      'Doubling rooks on an open file creates overwhelming pressure',
      'The 7th rank (or 2nd rank for Black) is where rooks become monsters — they attack pawns and cut off the king',
      'Trade a minor piece to open a file toward the enemy king',
    ],
  },
  {
    id: 'tactics-discovered',
    title: 'Discovered Attacks',
    category: 'tactics',
    difficulty: 'intermediate',
    icon: '💥',
    summary: 'A discovered attack reveals a threat from a piece behind the one you moved — creating two threats at once.',
    points: [
      'When you move one piece, it can uncover an attack from the piece behind it',
      'Discovered check is especially powerful because your opponent MUST deal with the check',
      'Double check (piece moves AND gives check AND reveals check) forces the king to move',
      'Look for pieces "lined up" on a file, rank, or diagonal — moving the front piece unleashes the back one',
      'Set up discovered attacks during the middlegame by aligning your pieces carefully',
    ],
  },
  {
    id: 'mindset-time',
    title: 'Time Management',
    category: 'mindset',
    difficulty: 'beginner',
    icon: '⏱',
    summary: 'Running low on time causes more blunders than any tactic. Manage your clock.',
    points: [
      'Use more time in complex positions, less in forced/obvious moves',
      'In bullet/blitz, think during your opponent\'s time whenever possible',
      'Don\'t spend 2 minutes on move 5 — openings should be quick (memorized or principled)',
      'When low on time, simplify: trade pieces, reach a clear position',
      'Flagging (losing on time in a winning position) is demoralizing — practice faster play',
    ],
  },
];

export function generateLessons(weaknesses: Weaknesses, games: AnalyzedGame[]): Lesson[] {
  const scored = LESSON_BANK.map(lesson => {
    let relevance = 0.3; // base relevance

    if (weaknesses.worstPhase === 'opening' && lesson.category === 'opening') relevance += 0.5;
    if (weaknesses.worstPhase === 'endgame' && lesson.category === 'endgame') relevance += 0.5;
    if (weaknesses.worstPhase === 'middlegame' && lesson.category === 'tactics') relevance += 0.4;
    if (weaknesses.worstPhase === 'middlegame' && lesson.category === 'strategy') relevance += 0.3;

    if (weaknesses.avgBlunders > 2 && lesson.id === 'blunder-checks') relevance += 0.5;
    if (weaknesses.avgBlunders > 1 && lesson.category === 'tactics') relevance += 0.2;
    if (weaknesses.avgAccuracy < 75 && lesson.id === 'blunder-checks') relevance += 0.2;
    if (weaknesses.avgAccuracy < 70 && lesson.category === 'mindset') relevance += 0.2;

    if (weaknesses.recentTrend === 'declining' && lesson.id === 'mindset-time') relevance += 0.2;

    // more games with endgame issues
    const endgameGames = games.filter(g => g.phase === 'endgame').length;
    if (endgameGames > games.length * 0.3 && lesson.category === 'endgame') relevance += 0.2;

    return { ...lesson, relevance: Math.min(relevance, 1) };
  });

  return scored.sort((a, b) => b.relevance - a.relevance);
}
