/* ============================================================
   Project Grandmaster — Evaluation Engine & Socratic Coach
   A compact material + positional evaluator, alpha-beta search
   for the computer opponent, and the 3-tier natural-language
   hint system described in the GDD (Conceptual -> Spatial -> Direct).
   ============================================================ */

(function () {
const { WHITE, BLACK, fileOf, rankOf, sqName, PIECE_VALUE, otherColor } = window.ChessUtil;

// Piece-square tables (white's perspective; mirrored for black). Encourage
// center control, king safety, and pawn advancement — enough to produce
// sensible, human-legible play without a full engine.
const PST = {
  P: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10,-20,-20, 10, 10,  5,
     5, -5,-10,  0,  0,-10, -5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5,  5, 10, 25, 25, 10,  5,  5,
    10, 10, 20, 30, 30, 20, 10, 10,
    50, 50, 50, 50, 50, 50, 50, 50,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  N: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  B: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  R: [
     0,  0,  0,  5,  5,  0,  0,  0,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     5, 10, 10, 10, 10, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  Q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -10,  5,  5,  5,  5,  5,  0,-10,
      0,  0,  5,  5,  5,  5,  0, -5,
     -5,  0,  5,  5,  5,  5,  0, -5,
    -10,  0,  5,  5,  5,  5,  0,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  K: [
     20, 30, 10,  0,  0, 10, 30, 20,
     20, 20,  0,  0,  0,  0, 20, 20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
  ],
};

function pstValue(type, color, s) {
  const idx = color === WHITE ? s : (63 - s); // mirror vertically for black
  return PST[type][idx];
}

// Static evaluation in centipawns from White's perspective.
function evaluate(game) {
  let score = 0;
  let whiteMobility = 0, blackMobility = 0;
  for (let s = 0; s < 64; s++) {
    const p = game.board[s];
    if (!p) continue;
    const val = PIECE_VALUE[p.type] + pstValue(p.type, p.color, s);
    score += p.color === WHITE ? val : -val;
  }
  // Small mobility bonus keeps the AI from making passive shuffling moves.
  const turnBefore = game.turn;
  game.turn = WHITE; whiteMobility = game._allPseudoMoves(WHITE).length;
  game.turn = BLACK; blackMobility = game._allPseudoMoves(BLACK).length;
  game.turn = turnBefore;
  score += (whiteMobility - blackMobility) * 2;
  return score;
}

// Score always returned from the perspective of `color` (positive = good for color).
function evaluateFor(game, color) {
  const white = evaluate(game);
  return color === WHITE ? white : -white;
}

function orderMoves(game, moves) {
  // MVV-LVA-ish ordering: captures and promotions first, for better alpha-beta pruning.
  return moves.slice().sort((a, b) => {
    const av = (a.captured ? PIECE_VALUE[a.captured] : 0) + (a.flags.promotion ? 800 : 0);
    const bv = (b.captured ? PIECE_VALUE[b.captured] : 0) + (b.flags.promotion ? 800 : 0);
    return bv - av;
  });
}

function minimax(game, depth, alpha, beta, maximizingColor) {
  const status = game.status();
  if (status.over) {
    if (status.reason === 'checkmate') {
      const winnerIsMaximizer = (status.result === '1-0' && maximizingColor === WHITE) ||
                                 (status.result === '0-1' && maximizingColor === BLACK);
      return winnerIsMaximizer ? 100000 - depth : -100000 + depth;
    }
    return 0; // draw
  }
  if (depth === 0) return evaluateFor(game, maximizingColor);

  const moves = orderMoves(game, game.legalMoves(game.turn));
  const isMaximizing = game.turn === maximizingColor;
  let best = isMaximizing ? -Infinity : Infinity;
  for (const m of moves) {
    const undo = game._rawApply(m);
    const val = minimax(game, depth - 1, alpha, beta, maximizingColor);
    game._rawUndo(undo);
    if (isMaximizing) {
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
    } else {
      best = Math.min(best, val);
      beta = Math.min(beta, val);
    }
    if (beta <= alpha) break;
  }
  return best;
}

// Find the best move for the side to move, searching `depth` plies ahead.
function findBestMove(game, depth = 3) {
  const color = game.turn;
  const moves = orderMoves(game, game.legalMoves(color));
  if (moves.length === 0) return null;
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    const undo = game._rawApply(m);
    const val = minimax(game, depth - 1, -Infinity, Infinity, color);
    game._rawUndo(undo);
    if (val > bestScore) { bestScore = val; best = m; }
  }
  return { move: best, score: bestScore };
}

// Rank every legal move by how good it is for `color`. Used for hints & blunder checks.
function rankMoves(game, color, depth = 2) {
  const moves = orderMoves(game, game.legalMoves(color));
  const scored = moves.map(m => {
    const undo = game._rawApply(m);
    const val = minimax(game, depth - 1, -Infinity, Infinity, color);
    game._rawUndo(undo);
    return { move: m, score: val };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// ---- Control heatmap: how many times each square is attacked by each side ----
function computeControlMap(game) {
  const whiteControl = new Array(64).fill(0);
  const blackControl = new Array(64).fill(0);
  const turnBefore = game.turn;
  for (const color of [WHITE, BLACK]) {
    game.turn = color;
    const moves = game._allPseudoMoves(color);
    const target = color === WHITE ? whiteControl : blackControl;
    for (const m of moves) {
      if (m.piece === 'P' && !m.captured && !m.flags.enPassant) continue; // plain pawn pushes don't "control" the square
      target[m.to]++;
    }
  }
  game.turn = turnBefore;
  return { whiteControl, blackControl };
}

// ---- Socratic 3-tier hint system ----
// Level 1 (Conceptual): a theme, no squares named.
// Level 2 (Spatial): names the piece/zone that needs attention.
// Level 3 (Direct): the exact move and the tactical reason.
function generateHint(game, level, depth = 3) {
  const color = game.turn;
  const ranked = rankMoves(game, color, depth);
  if (ranked.length === 0) return { level, text: "There are no legal moves — the game has ended." };
  const best = ranked[0];
  const bestMove = best.move;
  const reason = describeMoveReason(game, bestMove, best.score);

  if (level === 1) {
    return { level: 1, text: reason.concept };
  }
  if (level === 2) {
    const pieceName = pieceFullName(bestMove.piece);
    const zone = zoneDescription(bestMove.to);
    return {
      level: 2,
      text: `Take a look at your ${pieceName.toLowerCase()} on ${sqName(bestMove.from)} — there's something worth doing in the ${zone}.`,
      highlightSquares: [bestMove.from, bestMove.to],
    };
  }
  // Level 3
  return {
    level: 3,
    text: `Move your ${pieceFullName(bestMove.piece).toLowerCase()} from ${sqName(bestMove.from)} to ${sqName(bestMove.to)}. ${reason.direct}`,
    move: bestMove,
    highlightSquares: [bestMove.from, bestMove.to],
  };
}

function pieceFullName(type) {
  return { P: 'Pawn', N: 'Knight', B: 'Bishop', R: 'Rook', Q: 'Queen', K: 'King' }[type] || type;
}

function zoneDescription(s) {
  const f = fileOf(s), r = rankOf(s);
  const fileZone = f <= 2 ? 'queenside' : f >= 5 ? 'kingside' : 'center';
  const rankZone = r <= 2 ? 'near your own back ranks' : r >= 5 ? "deep in your opponent's territory" : 'in the middle of the board';
  return `${fileZone}, ${rankZone}`;
}

// Produce a short natural-language explanation for why a move is good, in the
// Socratic voice described by the GDD (concept first, specifics on request).
function describeMoveReason(game, move, score) {
  const isCapture = !!move.captured || move.flags.enPassant;
  const undo = game._rawApply(move);
  const opponent = game.turn;
  const givesCheck = game.inCheck(opponent);
  const opponentMoves = game.legalMoves(opponent);
  const isMate = givesCheck && opponentMoves.length === 0;
  game._rawUndo(undo);

  if (isMate) {
    return { concept: 'There is a forced checkmate available. Look for a decisive attack on the king.', direct: 'This delivers checkmate.' };
  }
  if (isCapture) {
    const capturedVal = PIECE_VALUE[move.captured] || 100;
    if (capturedVal >= 300) {
      return { concept: 'Look for an unprotected piece.', direct: `This wins material by capturing the ${pieceFullName(move.captured).toLowerCase()}.` };
    }
    return { concept: 'There is a favorable trade or capture on the board.', direct: `This captures the opponent's ${pieceFullName(move.captured).toLowerCase()}.` };
  }
  if (givesCheck) {
    return { concept: 'Your opponent\'s king is exposed — consider forcing moves.', direct: 'This gives check and improves your position.' };
  }
  if (move.piece === 'K' && move.flags.castle) {
    return { concept: 'King safety matters before you commit to an attack.', direct: 'Castling tucks your king away and connects your rooks.' };
  }
  if (score > 150) {
    return { concept: 'There is a strong tactical or positional opportunity here.', direct: 'This move creates lasting pressure on your opponent\'s position.' };
  }
  return { concept: 'Think about improving your least active piece.', direct: 'This improves your piece activity and central control.' };
}

// ---- Blunder Interception System ----
// Compares the evaluation before and after a candidate move (from the mover's
// perspective). If it drops by more than `threshold` centipawns (the GDD spec's
// "3.0 points" = 300 centipawns), the move is flagged.
function checkBlunder(game, move, threshold = 300, depth = 2) {
  const color = game.turn;
  const before = rankMoves(game, color, depth);
  const bestScoreBefore = before.length ? before[0].score : 0;
  const thisEntry = before.find(e =>
    e.move.from === move.from && e.move.to === move.to &&
    (e.move.flags.promotion || null) === (move.flags.promotion || null));
  if (!thisEntry) return { blunder: false };
  const drop = bestScoreBefore - thisEntry.score;
  if (drop >= threshold && bestScoreBefore - thisEntry.score > 0) {
    const best = before[0].move;
    return {
      blunder: true,
      drop,
      betterMove: best,
      message: buildBlunderMessage(game, move, best),
    };
  }
  return { blunder: false };
}

function buildBlunderMessage(game, badMove, betterMove) {
  // Simulate the bad move to see what the opponent could immediately win.
  const undo = game._rawApply(badMove);
  const opp = game.turn;
  const oppRanked = rankMoves(game, opp, 1);
  let threat = null;
  if (oppRanked.length && oppRanked[0].move.captured) {
    threat = oppRanked[0].move;
  }
  game._rawUndo(undo);

  if (threat) {
    return `Wait. If you play that, your ${pieceFullName(badMove.piece).toLowerCase()} on ${sqName(badMove.to)} can be answered by ${sqName(threat.from)}-${sqName(threat.to)}, losing material. Take a second look — ${sqName(betterMove.from)} to ${sqName(betterMove.to)} looks stronger.`;
  }
  return `Wait. That move gives up a significant advantage. Take a second look before you commit.`;
}

window.ChessAI = {
  evaluate, evaluateFor, findBestMove, rankMoves,
  computeControlMap, generateHint, checkBlunder, describeMoveReason,
};
})();
