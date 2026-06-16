import { Chess } from 'chess.js';

export type CoachCategory = 'mistake' | 'good' | 'opening' | 'tactic' | 'strategy' | 'endgame' | 'info';

export interface CoachTip {
  headline: string;
  body: string;
  category: CoachCategory;
}

const PIECE_NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function countPieces(chess: Chess): number {
  let n = 0;
  for (const rank of ['1','2','3','4','5','6','7','8'] as const)
    for (const file of ['a','b','c','d','e','f','g','h'] as const)
      if (chess.get(`${file}${rank}` as any)) n++;
  return n;
}

function phase(ply: number, pieces: number): 'opening' | 'middlegame' | 'endgame' {
  if (ply < 20) return 'opening';
  if (pieces <= 12) return 'endgame';
  return 'middlegame';
}

export function startTip(playerColor: 'white' | 'black', opening: string): CoachTip {
  return {
    headline: 'Game start',
    body: `You're playing ${playerColor} in the ${opening}. Navigate through each move with ◀ ▶ to get a lesson on what happened and why.`,
    category: 'info',
  };
}

export function analyzeMove(
  prevFen: string,
  san: string,
  nag: number | undefined,
  ply: number,
  isPlayerMove: boolean,
): CoachTip {
  // Apply the move to get details
  const prev = new Chess(prevFen);
  let moveDetails: ReturnType<typeof prev.move> | null = null;
  try { moveDetails = prev.move(san); } catch {}

  const afterChess = new Chess(prevFen);
  try { afterChess.move(san); } catch {}

  const pieces = countPieces(afterChess);
  const p = phase(ply, pieces);
  const who = isPlayerMove ? 'You' : 'Your opponent';
  const yourMove = isPlayerMove;

  const captured = moveDetails?.captured;
  const movedPiece = moveDetails?.piece ?? '';
  const isCastle = san === 'O-O' || san === 'O-O-O';
  const isPromotion = san.includes('=');
  const givesCheck = san.includes('+') && !san.includes('#');
  const isCheckmate = san.includes('#');
  const isCapture = !!captured;
  const toSquare = moveDetails?.to ?? '';

  // ── Annotations ──────────────────────────────────────────────────────────
  if (nag === 2 && yourMove) return {
    headline: '?? Blunder!',
    body: `${san} was a serious error. Before each move, ask yourself: "Does this leave any of my pieces undefended? Does my opponent have a fork, pin, or check?" Taking 5 extra seconds here would have caught this.`,
    category: 'mistake',
  };
  if (nag === 4 && yourMove) return {
    headline: '? Mistake',
    body: `${san} wasn't the best choice. A stronger move was available. Look one move deeper: after you play, what can your opponent do? Thinking about their threats before moving is the single biggest improvement you can make.`,
    category: 'mistake',
  };
  if (nag === 6 && yourMove) return {
    headline: '?! Inaccuracy',
    body: `${san} is slightly off. The position is still okay, but there was a more precise move. Inaccuracies often happen when playing on autopilot — pause to reconsider even "obvious" moves.`,
    category: 'mistake',
  };
  if (nag === 1 && yourMove) return {
    headline: '! Good move',
    body: `${san} was a strong choice. Bookmark this moment — what made it good? Understanding why a move works helps you find similar moves in future games.`,
    category: 'good',
  };
  if (nag === 3 && yourMove) return {
    headline: '!! Brilliant!',
    body: `${san} was an exceptional move — the engine agrees. Brilliant moves often involve a sacrifice or a non-obvious idea. This is the kind of thinking that wins games at higher levels.`,
    category: 'good',
  };

  // ── Special moves ─────────────────────────────────────────────────────────
  if (isCheckmate) return {
    headline: yourMove ? '🎉 Checkmate — you won!' : 'Checkmate — game over',
    body: yourMove
      ? `${san} delivers checkmate. Study this mating pattern — recognising it quickly will help you spot and create it in future games.`
      : `${san} ends the game. Study how the mating net was built: what piece gave check, and what cut off your king's escape? Knowing this helps you avoid it next time.`,
    category: 'tactic',
  };

  if (isCastle) {
    const side = san === 'O-O' ? 'kingside' : 'queenside';
    return {
      headline: yourMove ? `You castled ${side}` : `Opponent castled ${side}`,
      body: yourMove
        ? `Smart! Castling tucks your king behind a wall of pawns and activates your rook. Now focus on opening the center or the flank — your rook is ready to join the fight on an open file.`
        : `Your opponent has their king safe. Their rook is now active too. Consider whether you need to castle soon, and look for play in the center to keep them occupied.`,
      category: 'strategy',
    };
  }

  if (isPromotion) {
    const promTo = san.slice(-1).toUpperCase();
    return {
      headline: yourMove ? `Pawn promoted to ${promTo}!` : `Opponent promoted to ${promTo}`,
      body: yourMove
        ? `Queen promotion is almost always correct — unless it creates stalemate (opponent has only their king and no legal moves, which would be a draw). Always check for that before promoting!`
        : `Your opponent now has an extra queen. The fastest way to respond is to create your own counterplay — a passed pawn, a check, or immediate trades to simplify.`,
      category: 'endgame',
    };
  }

  if (givesCheck) return {
    headline: yourMove ? 'You gave check' : "You're in check",
    body: yourMove
      ? `Giving check limits your opponent's options — they must respond. Make sure your piece is safe after delivering the check and that this isn't just a "check for the sake of it." Every check should have a follow-up plan.`
      : `Your king is in check. You have three ways to escape: move the king, block the check with a piece, or capture the attacking piece. Pick the one that keeps your position best, not just the easiest escape.`,
    category: 'tactic',
  };

  // ── Opening phase ─────────────────────────────────────────────────────────
  if (p === 'opening') {
    if (isCastle) {}  // handled above

    if (movedPiece === 'p' && !isCapture) {
      const file = toSquare[0];
      const isCenter = file === 'd' || file === 'e';
      if (isCenter && ply < 6) return {
        headline: yourMove ? 'Claiming the center' : 'Opponent controls the center',
        body: yourMove
          ? `Center pawns (d and e) control key squares and give your pieces room to maneuver. This is one of the most important first moves you can make. Now develop your knights and bishops to support them.`
          : `Your opponent has staked out the center. Claim your own share with your d or e pawn, or prepare a pawn break to challenge their central grip later.`,
        category: 'opening',
      };
      return {
        headline: 'Pawn move in the opening',
        body: `Each pawn move in the opening is a tempo NOT spent developing a piece. Aim to move only the pawns needed to open lines for your bishops and control the center — then get your knights and bishops out.`,
        category: 'opening',
      };
    }

    if (movedPiece === 'n') return {
      headline: yourMove ? 'Knight developed' : 'Opponent develops knight',
      body: yourMove
        ? `Knights need multiple moves to reach their best squares, so develop them early. Central squares (c3/f3 for White, c6/f6 for Black) are ideal — from there a knight attacks 8 squares. Avoid edge squares (a3, h3) where they're much weaker.`
        : `Your opponent is developing. Match their development: get your pieces out too. Falling behind in development gives your opponent a free attack.`,
      category: 'opening',
    };

    if (movedPiece === 'b') return {
      headline: yourMove ? 'Bishop developed' : 'Opponent develops bishop',
      body: yourMove
        ? `Place your bishop on a diagonal where it has a future — ideally pointing toward the center or targeting your opponent's kingside. A bishop that gets blocked by its own pawns is "bad" and often weak for the rest of the game.`
        : `Their bishop is now active. Watch the diagonal it's pointing at — it might be targeting your king or key pawns.`,
      category: 'opening',
    };

    if (movedPiece === 'q') return {
      headline: yourMove ? 'Early queen move' : 'Opponent plays early queen',
      body: yourMove
        ? `Moving the queen early is usually risky — your opponent can chase it with developing moves, gaining a tempo each time. Develop your knights and bishops first, then bring the queen out once you have support.`
        : `Your opponent has moved their queen early. Try to attack it with your developing moves. Each move that chases the queen is both development AND a threat.`,
      category: 'opening',
    };

    if (movedPiece === 'r' && !isCastle) return {
      headline: 'Rook in the opening',
      body: `Rooks need open files to be effective — in the opening, files are usually blocked by pawns. Moving a rook early is rarely efficient. Castle first to connect your rooks, then put them on open files in the middlegame.`,
      category: 'opening',
    };

    if (isCapture) return {
      headline: yourMove ? 'Capture in the opening' : 'Opponent captures',
      body: `After a capture, recapture with the piece that gains tempo (a less developed piece) rather than a well-placed one. Principle: recapture toward the center when possible, and don't trade your good pieces for passive ones just to win a pawn.`,
      category: 'opening',
    };
  }

  // ── Middlegame ────────────────────────────────────────────────────────────
  if (p === 'middlegame') {
    if (isCapture && captured) {
      const capVal = PIECE_VALUE[captured] ?? 0;
      const movVal = PIECE_VALUE[movedPiece] ?? 0;

      if (movVal > capVal && yourMove) return {
        headline: 'You traded down in value',
        body: `You captured a ${PIECE_NAME[captured]} with your ${PIECE_NAME[movedPiece]}. That's a material loss unless you gain something concrete in return — like a crushing attack or a positional advantage. Double-check: was this necessary?`,
        category: 'strategy',
      };
      if (capVal > movVal && yourMove) return {
        headline: 'You won material! 🎯',
        body: `Great — you captured a ${PIECE_NAME[captured]} with a less valuable ${PIECE_NAME[movedPiece]}. Now convert your advantage: simplify the position, avoid giving your opponent counterplay, and head toward an endgame where your extra material wins.`,
        category: 'tactic',
      };
      return {
        headline: yourMove ? 'Even exchange' : 'Opponent exchanges',
        body: `Equal trades aren't neutral — they favor whoever benefits more from simplification. Trades help: the side with more space (less cramped), the side with a better endgame, and the side that's defending (fewer attackers). Ask yourself which side that is.`,
        category: 'strategy',
      };
    }

    if (movedPiece === 'r') return {
      headline: `${who} activated a rook`,
      body: yourMove
        ? `Rooks belong on open files and the 7th rank. If you can double rooks on an open file pointing at your opponent's king or weak pawns, that often becomes a decisive advantage. Look for ways to open the file further.`
        : `Their rook is now more active. If it's pointing at a weak pawn in your camp, defend or counterattack — passive defense alone rarely works.`,
      category: 'strategy',
    };

    if (movedPiece === 'n') return {
      headline: `${who} repositioned a knight`,
      body: yourMove
        ? `Knights are most powerful on outpost squares — squares deep in enemy territory that can't be attacked by opponent pawns. A knight on d5/e5 (for White) can be worth more than a rook. Is your knight heading somewhere like that?`
        : `Their knight is relocating. Watch where it's headed — knights telegraph their destination over several moves, giving you a chance to prevent them from reaching a strong square.`,
      category: 'strategy',
    };

    return {
      headline: `${who} makes a plan`,
      body: yourMove
        ? `In the middlegame, always play with a plan. Look at the position and ask: where are my pieces best placed? What does my opponent want to do? Then make a move that advances your plan AND stops their threat. The CCTB checklist helps: Check? Capture? Threat? Best move?`
        : `After every opponent move, stop and ask: what did that move threaten? Don't just play your planned move — make sure you're not walking into something first.`,
      category: 'strategy',
    };
  }

  // ── Endgame ───────────────────────────────────────────────────────────────
  if (p === 'endgame') {
    if (movedPiece === 'k') return {
      headline: `${who} activates the king`,
      body: yourMove
        ? `In the endgame, your king transforms from a liability into a powerful piece. Centralise it — aim for d4/e4 (or d5/e5). An active king attacks pawns, helps your own pawns promote, and often decides the game.`
        : `Their king is marching to the center. You must do the same — king activity is often the deciding factor in endgames. Passive kings lose.`,
      category: 'endgame',
    };

    if (movedPiece === 'p') return {
      headline: yourMove ? 'Pawn push' : 'Opponent advances a pawn',
      body: yourMove
        ? `Passed pawns (no enemy pawns on the same or adjacent files to stop them) are the most valuable pawns in the endgame. If this pawn is passed, push it! Your opponent may have to sacrifice a piece to stop it from promoting.`
        : `Watch this pawn — if it becomes passed, it could be a serious threat. Blockade it with your king or a knight (knights are great blockaders) before it gets too far.`,
      category: 'endgame',
    };

    if (movedPiece === 'r') return {
      headline: `${who} repositions a rook`,
      body: yourMove
        ? `Rooks belong BEHIND passed pawns — yours and your opponent's. Behind your own passed pawn, the rook pushes it forward. Behind their passed pawn, the rook attacks it from a safe distance. This is the single most important rook endgame rule.`
        : `Their rook is active. In rook endgames, activity is everything — a passive rook almost always loses. If your rook is passive, find a way to activate it, even at the cost of a pawn.`,
      category: 'endgame',
    };

    return {
      headline: 'Endgame technique',
      body: yourMove
        ? `Key endgame rules: activate your king, create or advance a passed pawn, place rooks behind passed pawns, and always check for stalemate if you're winning (accidentally stalemating your opponent draws the game). Precise technique here decides the result.`
        : `In the endgame, every tempo counts. Be precise — one inaccuracy can turn a win into a draw or a draw into a loss. Take your time on each move.`,
      category: 'endgame',
    };
  }

  return {
    headline: `${who} plays ${san}`,
    body: `Assess the position: who controls the center? Are any pieces undefended? What plans are available for both sides? Getting into the habit of evaluating the position after every move is what separates improving players from stagnating ones.`,
    category: 'info',
  };
}
