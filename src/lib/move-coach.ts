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

function allSquares(): string[] {
  const sqs: string[] = [];
  for (const f of 'abcdefgh') for (const r of '12345678') sqs.push(`${f}${r}`);
  return sqs;
}

const SQUARES = allSquares();

function knightAttacks(sq: string): string[] {
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1]) - 1;
  return [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
    .map(([df, dr]) => [f+df, r+dr])
    .filter(([nf, nr]) => nf >= 0 && nf < 8 && nr >= 0 && nr < 8)
    .map(([nf, nr]) => `${String.fromCharCode(97+nf)}${nr+1}`);
}

// Pieces of `color` that are attacked by opponent AND not defended by own pieces
function findHangingPieces(chess: Chess, color: 'w' | 'b'): Array<{ square: string; piece: string }> {
  const opp = color === 'w' ? 'b' : 'w';
  const result: Array<{ square: string; piece: string }> = [];
  for (const sq of SQUARES) {
    const p = chess.get(sq as any);
    if (!p || p.color !== color || p.type === 'k') continue;
    if (!(chess.attackers(sq as any, opp) as string[]).length) continue;
    // Temporarily remove the piece to see if the square is still defended
    const removed = chess.remove(sq as any);
    const defended = (chess.attackers(sq as any, color) as string[]).length > 0;
    chess.put(removed!, sq as any);
    if (!defended) result.push({ square: sq, piece: p.type });
  }
  return result;
}

// After a knight move, check if it's forking 2+ valuable enemy pieces
function detectKnightFork(chess: Chess, toSq: string, movedColor: 'w' | 'b'): string[] {
  const opp = movedColor === 'w' ? 'b' : 'w';
  return knightAttacks(toSq).filter(sq => {
    const p = chess.get(sq as any);
    return p && p.color === opp && PIECE_VALUE[p.type] >= 3;
  });
}

function countPieces(chess: Chess): number {
  return SQUARES.reduce((n, sq) => n + (chess.get(sq as any) ? 1 : 0), 0);
}

function phase(ply: number, pieces: number): 'opening' | 'middlegame' | 'endgame' {
  if (ply < 20) return 'opening';
  if (pieces <= 12) return 'endgame';
  return 'middlegame';
}

function evalSeverity(swing: number): string {
  if (swing < -5) return 'This was effectively game-deciding.';
  if (swing < -3) return `The position swung ${Math.abs(swing).toFixed(1)} pawns against you.`;
  if (swing < -1.5) return `The eval dropped about ${Math.abs(swing).toFixed(1)} pawns.`;
  return '';
}

export function startTip(playerColor: 'white' | 'black', opening: string): CoachTip {
  return {
    headline: 'Game start',
    body: `You're playing ${playerColor} in the ${opening}. Navigate through each move with ◀ ▶ (or arrow keys) to see turn-by-turn coaching.`,
    category: 'info',
  };
}

export function analyzeMove(
  prevFen: string,
  san: string,
  nag: number | undefined,
  ply: number,
  isPlayerMove: boolean,
  evalSwing?: number, // positive = improved for the moving player, negative = worsened
): CoachTip {
  const chess = new Chess(prevFen);
  let moveObj: ReturnType<typeof chess.move> | null = null;
  try { moveObj = chess.move(san); } catch {}
  // chess is now the position AFTER the move

  const pieces = countPieces(chess);
  const p = phase(ply, pieces);
  const who = isPlayerMove ? 'You' : 'Your opponent';
  const yourMove = isPlayerMove;
  const movedPiece = moveObj?.piece ?? '';
  const captured = moveObj?.captured;
  const toSquare = moveObj?.to ?? '';
  const movedColor = moveObj?.color ?? 'w';
  const isCastle = san === 'O-O' || san === 'O-O-O';
  const isPromotion = san.includes('=');
  const givesCheck = san.includes('+') && !san.includes('#');
  const isCheckmate = san.includes('#');
  const isCapture = !!captured;

  // ── Annotations ────────────────────────────────────────────────────────────
  if (nag === 2 && yourMove) {
    const severity = evalSwing !== undefined ? evalSeverity(evalSwing) : '';
    return {
      headline: '?? Blunder!',
      body: `${san} was a serious error. ${severity} Before each move, ask: "Does this leave any piece undefended? Can my opponent fork, pin, or check me?" Slowing down on complex positions is the fastest way to stop blundering.`.trim(),
      category: 'mistake',
    };
  }
  if (nag === 4 && yourMove) {
    const severity = evalSwing !== undefined && evalSwing < -1
      ? ` The position dropped about ${Math.abs(evalSwing).toFixed(1)} pawns.` : '';
    return {
      headline: '? Mistake',
      body: `${san} wasn't the best.${severity} Look one move deeper: after you play, what can your opponent do? Thinking about their threats before moving is the single biggest improvement you can make.`,
      category: 'mistake',
    };
  }
  if (nag === 6 && yourMove) return {
    headline: '?! Inaccuracy',
    body: `${san} is slightly off. The position is still okay, but there was a more precise move. Inaccuracies often happen when playing on autopilot — pause to reconsider even "obvious" moves.`,
    category: 'mistake',
  };
  if (nag === 1 && yourMove) {
    const gain = evalSwing !== undefined && evalSwing > 0.5
      ? ` You swung the eval +${evalSwing.toFixed(1)} pawns in your favor.` : '';
    return {
      headline: '! Good move',
      body: `${san} was a strong choice.${gain} Bookmark this moment — understanding why it works helps you find similar moves in future games.`,
      category: 'good',
    };
  }
  if (nag === 3 && yourMove) return {
    headline: '!! Brilliant!',
    body: `${san} was an exceptional move — the engine agrees. Brilliant moves often involve a sacrifice or a non-obvious idea. This kind of thinking wins games at higher levels.`,
    category: 'good',
  };

  // ── Missed win / missed defensive resource (no NAG but big eval swing) ──────
  if (!nag && yourMove && evalSwing !== undefined) {
    if (evalSwing < -2.0) return {
      headline: 'Missed advantage',
      body: `Before this move you had a significant edge, but ${san} let it slip. With eval swings like this, there was likely a stronger continuation — try enabling the engine to see what was available.`,
      category: 'mistake',
    };
    if (evalSwing > 2.0) return {
      headline: 'Great defensive resource!',
      body: `You were under pressure, but ${san} dramatically improved your position. Well done for finding the right way back into the game.`,
      category: 'good',
    };
  }

  // ── Special moves ───────────────────────────────────────────────────────────
  if (isCheckmate) return {
    headline: yourMove ? '🎉 Checkmate — you won!' : 'Checkmate — game over',
    body: yourMove
      ? `${san} delivers checkmate. Study this mating pattern — recognising it quickly will help you spot and create it in future games.`
      : `${san} ends the game. Study how the mating net was built: what piece gave check, and what cut off your king's escape? That knowledge prevents it next time.`,
    category: 'tactic',
  };

  if (isCastle) {
    const side = san === 'O-O' ? 'kingside' : 'queenside';
    return {
      headline: yourMove ? `You castled ${side}` : `Opponent castled ${side}`,
      body: yourMove
        ? `Castling tucks your king behind a pawn wall and connects your rooks. Now focus on opening the center or the flank — your rook is ready to join the fight on an open file.`
        : `Your opponent's king is now safe and their rook is active. Consider castling yourself if you haven't, and look for play in the center to keep them busy.`,
      category: 'strategy',
    };
  }

  if (isPromotion) {
    const promTo = san.slice(-1).toUpperCase();
    return {
      headline: yourMove ? `Pawn promoted to ${promTo}!` : `Opponent promoted to ${promTo}`,
      body: yourMove
        ? `Queen promotion is almost always correct — unless it creates stalemate (opponent has only their king with no legal moves, which draws the game). Always check for stalemate before promoting!`
        : `Your opponent now has an extra queen. Look for a counterattack, a passed pawn of your own, or trade pieces to simplify and reduce their winning chances.`,
      category: 'endgame',
    };
  }

  if (givesCheck) return {
    headline: yourMove ? 'You gave check' : "You're in check",
    body: yourMove
      ? `Giving check forces your opponent to respond, limiting their options. Make sure your piece is safe after the check and that you have a follow-up plan — checks without purpose are just moves.`
      : `Your king is in check. You have three ways out: move the king, block the check, or capture the attacker. Pick the option that keeps your position best, not just the easiest escape.`,
    category: 'tactic',
  };

  // ── Tactical patterns ───────────────────────────────────────────────────────
  // Knight fork detection
  if (movedPiece === 'n' && toSquare) {
    const forked = detectKnightFork(chess, toSquare, movedColor);
    if (forked.length >= 2) {
      const targets = forked.map(sq => {
        const piece = chess.get(sq as any);
        return piece ? `${PIECE_NAME[piece.type]} on ${sq}` : sq;
      }).join(' and ');
      return {
        headline: yourMove ? '⚡ Knight fork!' : 'Knight fork — watch out',
        body: yourMove
          ? `Your knight on ${toSquare} is forking your opponent's ${targets}. They can only save one! This is one of chess's most powerful tactics — follow up by capturing whichever piece they don't move.`
          : `Your opponent's knight on ${toSquare} is forking your ${targets}. Move the more valuable piece to safety, or find a counter-threat that wins back the material.`,
        category: 'tactic',
      };
    }
  }

  // Hanging pieces left by this move (opponent or you)
  if (!isCapture && toSquare) {
    const yourColor = isPlayerMove ? movedColor : (movedColor === 'w' ? 'b' : 'w');
    const hanging = findHangingPieces(chess, yourColor);
    if (hanging.length > 0) {
      const pieces_s = hanging.map(h => `${PIECE_NAME[h.piece]} on ${h.square}`).join(', ');
      if (isPlayerMove) {
        return {
          headline: '⚠ Piece left undefended',
          body: `After ${san}, your ${pieces_s} ${hanging.length > 1 ? 'are' : 'is'} undefended and can be captured for free. Your opponent may not take it immediately, but watch out next turn.`,
          category: 'mistake',
        };
      }
    }
  }

  // ── Opening phase ───────────────────────────────────────────────────────────
  if (p === 'opening') {
    if (movedPiece === 'p' && !isCapture) {
      const file = toSquare[0];
      const isCenter = file === 'd' || file === 'e';
      if (isCenter && ply < 6) return {
        headline: yourMove ? 'Claiming the center' : 'Opponent controls the center',
        body: yourMove
          ? `Center pawns (d and e) control key squares and give your pieces room to maneuver. This is the most important opening principle. Now develop your knights and bishops to support and reinforce that central claim.`
          : `Your opponent has staked out the center. Claim your own share with your d or e pawn, or plan a pawn break to challenge their grip later — don't let them expand unopposed.`,
        category: 'opening',
      };
      return {
        headline: 'Pawn move in the opening',
        body: `Each pawn move is a tempo NOT spent developing a piece. Aim to move only the pawns needed to open lines and control the center — then get your knights and bishops out before anything else.`,
        category: 'opening',
      };
    }
    if (movedPiece === 'n') return {
      headline: yourMove ? 'Knight developed' : 'Opponent develops knight',
      body: yourMove
        ? `Knights must be developed early — they need several moves to reach good squares. Central squares (c3/f3 for White, c6/f6 for Black) are ideal: from there a knight controls 8 squares. Avoid edges like a3 or h3 where they have far less impact.`
        : `Match their development. Every move your opponent spends developing is a chance for you to develop too. Falling behind in development gives them a free initiative.`,
      category: 'opening',
    };
    if (movedPiece === 'b') return {
      headline: yourMove ? 'Bishop developed' : 'Opponent develops bishop',
      body: yourMove
        ? `Place your bishop on a long diagonal aiming at the center or your opponent's kingside. A bishop blocked by its own pawns is called a "bad bishop" and can be weak for the entire game — plan your pawn structure around keeping your bishops active.`
        : `Watch the diagonal their bishop is pointing at — it may be targeting your king or key pawns. You may need to block it or exchange it.`,
      category: 'opening',
    };
    if (movedPiece === 'q') return {
      headline: yourMove ? 'Early queen move — be careful' : 'Opponent plays early queen',
      body: yourMove
        ? `Moving the queen early is usually risky: your opponent can chase it with developing moves, gaining a tempo each time. Develop your knights and bishops first, castle, then activate the queen with piece support.`
        : `An early queen can be chased and harassed. Develop with threats that attack or inconvenience the queen — each forcing move you make is both development AND tempo.`,
      category: 'opening',
    };
    if (movedPiece === 'r' && !isCastle) return {
      headline: 'Rook in the opening',
      body: `Rooks need open files to be effective, and files are usually blocked in the opening. Moving a rook early is almost never efficient. Castle first to connect your rooks, then activate them on open files in the middlegame.`,
      category: 'opening',
    };
    if (isCapture) return {
      headline: yourMove ? 'Capture in the opening' : 'Opponent captures',
      body: `After a capture, recapture with a less-developed piece when possible — you gain development for free. Principle: recapture toward the center, and don't trade active well-placed pieces for inactive or passive ones just to win an early pawn.`,
      category: 'opening',
    };
    return {
      headline: 'Opening play',
      body: `Opening goals: control the center, develop knights and bishops, castle to safety, connect your rooks. Ask after each move: am I getting closer to those four goals, or am I drifting?`,
      category: 'opening',
    };
  }

  // ── Middlegame ──────────────────────────────────────────────────────────────
  if (p === 'middlegame') {
    if (isCapture && captured) {
      const capVal = PIECE_VALUE[captured] ?? 0;
      const movVal = PIECE_VALUE[movedPiece] ?? 0;
      if (movVal > capVal && yourMove) return {
        headline: 'You traded down in value',
        body: `You captured a ${PIECE_NAME[captured]} with your ${PIECE_NAME[movedPiece]}. That's a material loss unless you gain something concrete — a decisive attack, a strong passed pawn, or a significant positional advantage. Was it necessary?`,
        category: 'strategy',
      };
      if (capVal > movVal && yourMove) return {
        headline: 'You won material! 🎯',
        body: `Excellent — you captured a ${PIECE_NAME[captured]} with a less valuable ${PIECE_NAME[movedPiece]}. Now convert: simplify by trading more pieces (not pawns), deny your opponent counterplay, and steer toward an endgame where extra material is decisive.`,
        category: 'tactic',
      };
      return {
        headline: yourMove ? 'Equal exchange' : 'Opponent exchanges',
        body: `Equal trades aren't neutral — they favor whoever benefits from simplification. Trades help the side with more space, the side going into an endgame advantage, and the defending side (fewer attackers). Ask: who benefits more here?`,
        category: 'strategy',
      };
    }
    if (movedPiece === 'r') return {
      headline: `${who} activates a rook`,
      body: yourMove
        ? `Rooks belong on open files and the 7th rank. If you can double your rooks on an open file pointing at the enemy king or weak pawns, that's often a decisive advantage. Keep looking for ways to open the file further.`
        : `Their rook is more active now. If it's pointing at weak pawns in your camp, defend or create a counter-threat — passive defense rarely holds against an active rook.`,
      category: 'strategy',
    };
    if (movedPiece === 'n') return {
      headline: `${who} repositions a knight`,
      body: yourMove
        ? `Knights are most powerful on "outpost" squares — deep in enemy territory where they can't be attacked by pawns. A knight on d5/e5 (for White) can be worth more than a rook. Is yours heading somewhere like that?`
        : `Watch where their knight is going. Knights telegraph their destination over several moves, giving you time to prevent them from reaching a strong square with a pawn advance.`,
      category: 'strategy',
    };
    return {
      headline: `${who} makes a plan`,
      body: yourMove
        ? `Middlegame principle: find a plan, then make moves that advance it. Look at the position: where are your pieces best placed? What does your opponent want? Use the CCTB checklist before each move — Check? Capture? Threat? Best move?`
        : `After every opponent move, ask: what did that threaten? Don't just play your planned move — check first that you're not walking into a trap.`,
      category: 'strategy',
    };
  }

  // ── Endgame ─────────────────────────────────────────────────────────────────
  if (p === 'endgame') {
    if (movedPiece === 'k') return {
      headline: `${who} activates the king`,
      body: yourMove
        ? `In the endgame, your king transforms from a liability into a powerful fighting piece. Centralise it — aim for d4/e4 (or d5/e5). An active king attacks pawns, supports your own, and can often decide the entire game.`
        : `Their king is heading to the center. You must do the same — king activity is often the deciding factor in endgames. A passive king almost always loses.`,
      category: 'endgame',
    };
    if (movedPiece === 'p') return {
      headline: yourMove ? 'Pawn push' : 'Opponent advances a pawn',
      body: yourMove
        ? `Passed pawns (no enemy pawns on the same or adjacent files to stop them) are extremely powerful in the endgame — push them! Your opponent may have to sacrifice material to stop promotion.`
        : `If this becomes a passed pawn, it's a serious threat. Blockade it early with your king or a knight before it gets too far — passed pawns that reach the 6th rank are usually unstoppable.`,
      category: 'endgame',
    };
    if (movedPiece === 'r') return {
      headline: `${who} repositions a rook`,
      body: yourMove
        ? `Endgame rook rule: place your rook BEHIND passed pawns — yours to push it forward, your opponent's to attack it from behind. A rook in front of a passed pawn blocks it; behind it, the rook gains power as the pawn advances.`
        : `In rook endgames, activity is everything. A passive rook almost always loses. Find a way to activate yours, even at the cost of a pawn — activity often outweighs a small material deficit.`,
      category: 'endgame',
    };
    return {
      headline: 'Endgame technique',
      body: yourMove
        ? `Endgame rules: activate your king, create or push a passed pawn, put rooks behind passed pawns. And always check for stalemate if you're winning — accidentally giving your opponent stalemate (no legal moves with only a king) draws the game.`
        : `In the endgame, one inaccuracy can flip the result. Take your time and be precise — a win can become a draw or a draw a loss with a single careless move.`,
      category: 'endgame',
    };
  }

  return {
    headline: `${who} plays ${san}`,
    body: `Assess the position after every move: who controls the center? Are any pieces undefended? What are both sides' plans? Developing this habit of evaluation is what separates improving players from stagnating ones.`,
    category: 'info',
  };
}

// Prospective tip — run BEFORE the player moves to warn about immediate threats
export function prospectiveTip(currentFen: string, playerColor: 'white' | 'black'): CoachTip | null {
  try {
    const chess = new Chess(currentFen);
    const turn = chess.turn();
    const isPlayerTurn = (turn === 'w') === (playerColor === 'white');
    if (!isPlayerTurn) return null;

    const yourColor = turn;
    const hanging = findHangingPieces(chess, yourColor);

    if (hanging.length > 0) {
      const list = hanging.map(h => `${PIECE_NAME[h.piece]} on ${h.square}`).join(', ');
      return {
        headline: `⚠ Before you move: ${hanging.length === 1 ? 'an undefended piece' : 'undefended pieces'}`,
        body: `Your ${list} ${hanging.length > 1 ? 'are' : 'is'} undefended right now and can be captured for free. Before making your next move, either defend ${hanging.length > 1 ? 'them' : 'it'} or move ${hanging.length > 1 ? 'them' : 'it'} to safety.`,
        category: 'tactic',
      };
    }
  } catch {}
  return null;
}
