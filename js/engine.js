/* ============================================================
   Project Grandmaster — Chess Rules Engine
   Self-contained, dependency-free implementation of FIDE rules:
   legal moves, check/checkmate/stalemate, castling, en passant,
   promotion, 50-move rule, threefold repetition, SAN notation.
   Board: 0..63, a1=0 ... h1=7, a2=8 ... h8=63 (rank-major).
   ============================================================ */

(function () {
const WHITE = 'w', BLACK = 'b';
const FILES = 'abcdefgh';

function sq(file, rank) { return rank * 8 + file; } // file/rank 0-indexed
function fileOf(s) { return s % 8; }
function rankOf(s) { return Math.floor(s / 8); }
function sqName(s) { return FILES[fileOf(s)] + (rankOf(s) + 1); }
function nameToSq(name) { return sq(FILES.indexOf(name[0]), parseInt(name[1], 10) - 1); }
function inBounds(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }
function otherColor(c) { return c === WHITE ? BLACK : WHITE; }

const PIECE_VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

const KNIGHT_DELTAS = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
const KING_DELTAS   = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
const BISHOP_DIRS   = [[1,1],[1,-1],[-1,1],[-1,-1]];
const ROOK_DIRS     = [[1,0],[-1,0],[0,1],[0,-1]];

class ChessGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = new Array(64).fill(null);
    const backRank = ['R','N','B','Q','K','B','N','R'];
    for (let f = 0; f < 8; f++) {
      this.board[sq(f,0)] = { type: backRank[f], color: WHITE };
      this.board[sq(f,1)] = { type: 'P', color: WHITE };
      this.board[sq(f,6)] = { type: 'P', color: BLACK };
      this.board[sq(f,7)] = { type: backRank[f], color: BLACK };
    }
    this.turn = WHITE;
    this.castling = { wk: true, wq: true, bk: true, bq: true };
    this.epSquare = null; // en-passant target square
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.history = []; // {move, san, castlingBefore, epBefore, halfmoveBefore, capturedPiece}
    this.positionCounts = {};
    this._recordPosition();
  }

  clone() {
    const g = new ChessGame();
    g.board = this.board.map(p => p ? { ...p } : null);
    g.turn = this.turn;
    g.castling = { ...this.castling };
    g.epSquare = this.epSquare;
    g.halfmoveClock = this.halfmoveClock;
    g.fullmoveNumber = this.fullmoveNumber;
    g.history = this.history.slice();
    g.positionCounts = { ...this.positionCounts };
    return g;
  }

  kingSquare(color) {
    for (let s = 0; s < 64; s++) {
      const p = this.board[s];
      if (p && p.type === 'K' && p.color === color) return s;
    }
    return -1;
  }

  isSquareAttacked(target, byColor) {
    const tf = fileOf(target), tr = rankOf(target);
    // Pawn attacks
    const dir = byColor === WHITE ? -1 : 1; // squares attacking `target` are one rank behind relative to attacker direction
    for (const df of [-1, 1]) {
      const f = tf + df, r = tr + dir;
      if (inBounds(f, r)) {
        const p = this.board[sq(f, r)];
        if (p && p.color === byColor && p.type === 'P') return true;
      }
    }
    // Knights
    for (const [df, dr] of KNIGHT_DELTAS) {
      const f = tf + df, r = tr + dr;
      if (inBounds(f, r)) {
        const p = this.board[sq(f, r)];
        if (p && p.color === byColor && p.type === 'N') return true;
      }
    }
    // King
    for (const [df, dr] of KING_DELTAS) {
      const f = tf + df, r = tr + dr;
      if (inBounds(f, r)) {
        const p = this.board[sq(f, r)];
        if (p && p.color === byColor && p.type === 'K') return true;
      }
    }
    // Sliding: bishop/queen diagonals
    for (const [df, dr] of BISHOP_DIRS) {
      let f = tf + df, r = tr + dr;
      while (inBounds(f, r)) {
        const p = this.board[sq(f, r)];
        if (p) {
          if (p.color === byColor && (p.type === 'B' || p.type === 'Q')) return true;
          break;
        }
        f += df; r += dr;
      }
    }
    // Sliding: rook/queen orthogonals
    for (const [df, dr] of ROOK_DIRS) {
      let f = tf + df, r = tr + dr;
      while (inBounds(f, r)) {
        const p = this.board[sq(f, r)];
        if (p) {
          if (p.color === byColor && (p.type === 'R' || p.type === 'Q')) return true;
          break;
        }
        f += df; r += dr;
      }
    }
    return false;
  }

  inCheck(color) {
    const ks = this.kingSquare(color);
    if (ks === -1) return false;
    return this.isSquareAttacked(ks, otherColor(color));
  }

  // Pseudo-legal moves for a single piece at square `from`.
  _pseudoMovesFrom(from) {
    const piece = this.board[from];
    if (!piece) return [];
    const moves = [];
    const f0 = fileOf(from), r0 = rankOf(from);
    const color = piece.color;

    const addMove = (to, flags = {}) => {
      moves.push({ from, to, piece: piece.type, color, flags, captured: this.board[to] ? this.board[to].type : null });
    };

    if (piece.type === 'P') {
      const dir = color === WHITE ? 1 : -1;
      const startRank = color === WHITE ? 1 : 6;
      const promoRank = color === WHITE ? 7 : 0;
      const oneStep = sq(f0, r0 + dir);
      if (inBounds(f0, r0 + dir) && !this.board[oneStep]) {
        if (rankOf(oneStep) === promoRank) {
          for (const promo of ['Q','R','B','N']) addMove(oneStep, { promotion: promo });
        } else {
          addMove(oneStep);
        }
        const twoStep = sq(f0, r0 + 2 * dir);
        if (r0 === startRank && !this.board[twoStep]) {
          addMove(twoStep, { double: true });
        }
      }
      for (const df of [-1, 1]) {
        const f = f0 + df, r = r0 + dir;
        if (!inBounds(f, r)) continue;
        const to = sq(f, r);
        const target = this.board[to];
        if (target && target.color !== color) {
          if (rankOf(to) === promoRank) {
            for (const promo of ['Q','R','B','N']) addMove(to, { promotion: promo });
          } else {
            addMove(to);
          }
        } else if (!target && this.epSquare === to) {
          addMove(to, { enPassant: true });
        }
      }
    } else if (piece.type === 'N') {
      for (const [df, dr] of KNIGHT_DELTAS) {
        const f = f0 + df, r = r0 + dr;
        if (!inBounds(f, r)) continue;
        const to = sq(f, r);
        const target = this.board[to];
        if (!target || target.color !== color) addMove(to);
      }
    } else if (piece.type === 'K') {
      for (const [df, dr] of KING_DELTAS) {
        const f = f0 + df, r = r0 + dr;
        if (!inBounds(f, r)) continue;
        const to = sq(f, r);
        const target = this.board[to];
        if (!target || target.color !== color) addMove(to);
      }
      // Castling
      const rank = color === WHITE ? 0 : 7;
      if (from === sq(4, rank) && !this.inCheck(color)) {
        const canK = color === WHITE ? this.castling.wk : this.castling.bk;
        const canQ = color === WHITE ? this.castling.wq : this.castling.bq;
        if (canK && !this.board[sq(5, rank)] && !this.board[sq(6, rank)] &&
            !this.isSquareAttacked(sq(5, rank), otherColor(color)) &&
            !this.isSquareAttacked(sq(6, rank), otherColor(color))) {
          addMove(sq(6, rank), { castle: 'k' });
        }
        if (canQ && !this.board[sq(3, rank)] && !this.board[sq(2, rank)] && !this.board[sq(1, rank)] &&
            !this.isSquareAttacked(sq(3, rank), otherColor(color)) &&
            !this.isSquareAttacked(sq(2, rank), otherColor(color))) {
          addMove(sq(2, rank), { castle: 'q' });
        }
      }
    } else {
      const dirs = piece.type === 'B' ? BISHOP_DIRS : piece.type === 'R' ? ROOK_DIRS : BISHOP_DIRS.concat(ROOK_DIRS);
      for (const [df, dr] of dirs) {
        let f = f0 + df, r = r0 + dr;
        while (inBounds(f, r)) {
          const to = sq(f, r);
          const target = this.board[to];
          if (!target) {
            addMove(to);
          } else {
            if (target.color !== color) addMove(to);
            break;
          }
          f += df; r += dr;
        }
      }
    }
    return moves;
  }

  _allPseudoMoves(color) {
    let moves = [];
    for (let s = 0; s < 64; s++) {
      const p = this.board[s];
      if (p && p.color === color) moves = moves.concat(this._pseudoMovesFrom(s));
    }
    return moves;
  }

  // Apply a move directly to the board without legality checks (used internally + for simulation).
  _rawApply(move) {
    const undo = {
      move,
      captured: move.captured,
      epSquareBefore: this.epSquare,
      castlingBefore: { ...this.castling },
      halfmoveBefore: this.halfmoveClock,
      capturedEpSquare: null,
      rookMove: null,
    };
    const piece = this.board[move.from];
    const color = piece.color;

    // Halfmove clock
    if (piece.type === 'P' || move.captured) this.halfmoveClock = 0;
    else this.halfmoveClock++;

    // En passant capture removes the pawn behind the target square
    if (move.flags.enPassant) {
      const capSq = sq(fileOf(move.to), rankOf(move.from));
      undo.capturedEpSquare = capSq;
      undo.captured = this.board[capSq] ? this.board[capSq].type : 'P';
      this.board[capSq] = null;
    }

    // Move the piece
    this.board[move.to] = { type: move.flags.promotion || piece.type, color };
    this.board[move.from] = null;

    // Castling: move the rook too
    if (move.flags.castle) {
      const rank = color === WHITE ? 0 : 7;
      if (move.flags.castle === 'k') {
        undo.rookMove = { from: sq(7, rank), to: sq(5, rank) };
        this.board[sq(5, rank)] = this.board[sq(7, rank)];
        this.board[sq(7, rank)] = null;
      } else {
        undo.rookMove = { from: sq(0, rank), to: sq(3, rank) };
        this.board[sq(3, rank)] = this.board[sq(0, rank)];
        this.board[sq(0, rank)] = null;
      }
    }

    // Update castling rights
    if (piece.type === 'K') {
      if (color === WHITE) { this.castling.wk = false; this.castling.wq = false; }
      else { this.castling.bk = false; this.castling.bq = false; }
    }
    const clearRookRight = (s) => {
      if (s === sq(0,0)) this.castling.wq = false;
      if (s === sq(7,0)) this.castling.wk = false;
      if (s === sq(0,7)) this.castling.bq = false;
      if (s === sq(7,7)) this.castling.bk = false;
    };
    clearRookRight(move.from);
    clearRookRight(move.to);

    // Update en passant target
    this.epSquare = move.flags.double ? sq(fileOf(move.from), (rankOf(move.from) + rankOf(move.to)) / 2) : null;

    if (color === BLACK) this.fullmoveNumber++;
    this.turn = otherColor(color);
    return undo;
  }

  _rawUndo(undo) {
    const move = undo.move;
    const color = this.board[move.to] ? this.board[move.to].color : otherColor(this.turn);
    // Move piece back
    const movedType = move.piece; // original type before any promotion
    this.board[move.from] = { type: movedType, color };
    this.board[move.to] = null;

    if (move.flags.enPassant) {
      this.board[undo.capturedEpSquare] = { type: 'P', color: otherColor(color) };
    } else if (move.captured) {
      this.board[move.to] = { type: move.captured, color: otherColor(color) };
    }

    if (undo.rookMove) {
      this.board[undo.rookMove.from] = this.board[undo.rookMove.to];
      this.board[undo.rookMove.to] = null;
    }

    this.castling = undo.castlingBefore;
    this.epSquare = undo.epSquareBefore;
    this.halfmoveClock = undo.halfmoveBefore;
    if (color === BLACK) this.fullmoveNumber--;
    this.turn = color;
  }

  // Fully legal moves for the side to move (or specified color), filtering out moves that leave own king in check.
  legalMoves(color = this.turn) {
    const pseudo = this._allPseudoMoves(color);
    const legal = [];
    for (const m of pseudo) {
      const undo = this._rawApply(m);
      if (!this.inCheck(color)) legal.push(m);
      this._rawUndo(undo);
    }
    return legal;
  }

  legalMovesFrom(square) {
    return this.legalMoves(this.turn).filter(m => m.from === square);
  }

  _positionKey() {
    return this.board.map(p => p ? p.color + p.type : '-').join('') + '|' + this.turn +
      '|' + JSON.stringify(this.castling) + '|' + (this.epSquare === null ? '-' : this.epSquare);
  }

  _recordPosition() {
    const key = this._positionKey();
    this.positionCounts[key] = (this.positionCounts[key] || 0) + 1;
  }

  // Make a move (must be a legal move object from legalMoves()). Returns SAN string.
  makeMove(move) {
    const san = this._toSAN(move);
    const undo = this._rawApply(move);
    undo.san = san;
    this.history.push(undo);
    this._recordPosition();
    return san;
  }

  undoMove() {
    if (this.history.length === 0) return;
    const undo = this.history.pop();
    // reverse position count
    const key = this._positionKey();
    this.positionCounts[key] = Math.max(0, (this.positionCounts[key] || 1) - 1);
    this._rawUndo(undo);
  }

  status() {
    const color = this.turn;
    const moves = this.legalMoves(color);
    const check = this.inCheck(color);
    if (moves.length === 0) {
      return check ? { over: true, result: color === WHITE ? '0-1' : '1-0', reason: 'checkmate' }
                   : { over: true, result: '1/2-1/2', reason: 'stalemate' };
    }
    if (this.halfmoveClock >= 100) return { over: true, result: '1/2-1/2', reason: 'fifty-move rule' };
    const key = this._positionKey();
    if ((this.positionCounts[key] || 0) >= 3) return { over: true, result: '1/2-1/2', reason: 'threefold repetition' };
    return { over: false, check };
  }

  _toSAN(move) {
    if (move.flags.castle === 'k') return this._sanSuffix(move, 'O-O');
    if (move.flags.castle === 'q') return this._sanSuffix(move, 'O-O-O');
    const piece = move.piece;
    const destName = sqName(move.to);
    const isCapture = !!move.captured || move.flags.enPassant;
    let s = '';
    if (piece === 'P') {
      if (isCapture) s += FILES[fileOf(move.from)] + 'x';
      s += destName;
      if (move.flags.promotion) s += '=' + move.flags.promotion;
    } else {
      s += piece;
      // Disambiguation: check other same-type pieces that can also reach move.to
      const others = this.legalMoves(move.color).filter(m =>
        m.piece === piece && m.to === move.to && m.from !== move.from);
      if (others.length) {
        const sameFile = others.some(m => fileOf(m.from) === fileOf(move.from));
        const sameRank = others.some(m => rankOf(m.from) === rankOf(move.from));
        if (!sameFile) s += FILES[fileOf(move.from)];
        else if (!sameRank) s += (rankOf(move.from) + 1);
        else s += sqName(move.from);
      }
      if (isCapture) s += 'x';
      s += destName;
    }
    return this._sanSuffix(move, s);
  }

  _sanSuffix(move, base) {
    // Simulate to see if the resulting position is check/checkmate for annotation.
    const undo = this._rawApply(move);
    const opp = this.turn;
    const inCheck = this.inCheck(opp);
    const noMoves = this.legalMoves(opp).length === 0;
    this._rawUndo(undo);
    if (inCheck && noMoves) return base + '#';
    if (inCheck) return base + '+';
    return base;
  }

  fen() {
    let rows = [];
    for (let r = 7; r >= 0; r--) {
      let row = '', empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.board[sq(f, r)];
        if (!p) { empty++; continue; }
        if (empty) { row += empty; empty = 0; }
        row += p.color === WHITE ? p.type : p.type.toLowerCase();
      }
      if (empty) row += empty;
      rows.push(row);
    }
    const castleStr = (this.castling.wk?'K':'') + (this.castling.wq?'Q':'') + (this.castling.bk?'k':'') + (this.castling.bq?'q':'') || '-';
    const epStr = this.epSquare === null ? '-' : sqName(this.epSquare);
    return `${rows.join('/')} ${this.turn} ${castleStr} ${epStr} ${this.halfmoveClock} ${this.fullmoveNumber}`;
  }

  loadFen(fenStr) {
    this.board = new Array(64).fill(null);
    const [placement, turn, castling, ep, half, full] = fenStr.trim().split(/\s+/);
    const rows = placement.split('/');
    for (let i = 0; i < 8; i++) {
      const r = 7 - i;
      let f = 0;
      for (const ch of rows[i]) {
        if (/\d/.test(ch)) { f += parseInt(ch, 10); continue; }
        const color = ch === ch.toUpperCase() ? WHITE : BLACK;
        this.board[sq(f, r)] = { type: ch.toUpperCase(), color };
        f++;
      }
    }
    this.turn = turn === 'w' ? WHITE : BLACK;
    this.castling = { wk: castling.includes('K'), wq: castling.includes('Q'), bk: castling.includes('k'), bq: castling.includes('q') };
    this.epSquare = ep === '-' ? null : nameToSq(ep);
    this.halfmoveClock = half ? parseInt(half, 10) : 0;
    this.fullmoveNumber = full ? parseInt(full, 10) : 1;
    this.history = [];
    this.positionCounts = {};
    this._recordPosition();
  }
}

// Export to global scope (plain <script> usage, no bundler required).
window.ChessGame = ChessGame;
window.ChessUtil = { WHITE, BLACK, sq, fileOf, rankOf, sqName, nameToSq, PIECE_VALUE, otherColor };
})();
