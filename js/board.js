/* ============================================================
   Project Grandmaster — Board Renderer & Interaction
   ============================================================ */

(function () {
const PIECE_GLYPH = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

class BoardView {
  constructor(rootEl, options = {}) {
    this.root = rootEl;
    this.flipped = false;
    this.onSquareClick = options.onSquareClick || (() => {});
    this.squares = [];
    this._build();
  }

  _build() {
    this.root.innerHTML = '';
    this.root.setAttribute('role', 'grid');
    this.root.setAttribute('aria-label', 'Chess board');
    for (let visRow = 0; visRow < 8; visRow++) {
      for (let visCol = 0; visCol < 8; visCol++) {
        const { file, rank } = this._visualToBoard(visRow, visCol);
        const s = rank * 8 + file;
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'square ' + ((file + rank) % 2 === 0 ? 'square--dark' : 'square--light');
        el.dataset.square = s;
        el.setAttribute('role', 'gridcell');
        el.setAttribute('aria-label', 'abcdefgh'[file] + (rank + 1));
        el.addEventListener('click', () => this.onSquareClick(s));
        this.root.appendChild(el);
        this.squares[s] = el;
      }
    }
  }

  _visualToBoard(visRow, visCol) {
    // visRow 0 = top of screen. Not flipped: top row = rank 8 (r=7).
    if (!this.flipped) {
      return { file: visCol, rank: 7 - visRow };
    }
    return { file: 7 - visCol, rank: visRow };
  }

  setFlipped(flag) {
    this.flipped = flag;
    this._build();
  }

  render(game, viewState) {
    const { WHITE } = window.ChessUtil;
    const controlMap = viewState.showHeatmap ? window.ChessAI.computeControlMap(game) : null;
    const maxControl = 4;

    for (let s = 0; s < 64; s++) {
      const el = this.squares[s];
      el.innerHTML = '';
      el.classList.remove('square--selected', 'square--last-from', 'square--last-to',
        'square--check', 'square--hint');
      el.style.removeProperty('--heat-white');
      el.style.removeProperty('--heat-black');

      const piece = game.board[s];
      if (piece) {
        const glyph = document.createElement('span');
        glyph.className = 'piece piece--' + piece.color;
        glyph.textContent = PIECE_GLYPH[piece.color + piece.type];
        el.appendChild(glyph);
      }

      if (viewState.selectedSquare === s) el.classList.add('square--selected');
      if (viewState.lastMove) {
        if (viewState.lastMove.from === s) el.classList.add('square--last-from');
        if (viewState.lastMove.to === s) el.classList.add('square--last-to');
      }
      if (viewState.hintSquares && viewState.hintSquares.includes(s)) {
        el.classList.add('square--hint');
      }

      if (viewState.legalTargets && viewState.legalTargets.some(m => m.to === s)) {
        const dot = document.createElement('span');
        dot.className = game.board[s] ? 'move-marker move-marker--capture' : 'move-marker';
        el.appendChild(dot);
      }

      if (controlMap) {
        const w = Math.min(controlMap.whiteControl[s], maxControl) / maxControl;
        const b = Math.min(controlMap.blackControl[s], maxControl) / maxControl;
        if (w > b) el.style.setProperty('--heat-white', (0.12 + w * 0.35).toFixed(2));
        else if (b > w) el.style.setProperty('--heat-black', (0.12 + b * 0.35).toFixed(2));
      }
    }

    // Check indicator
    if (game.inCheck(game.turn)) {
      const ks = game.kingSquare(game.turn);
      if (ks !== -1) this.squares[ks].classList.add('square--check');
    }
  }
}

window.BoardView = BoardView;
window.PIECE_GLYPH = PIECE_GLYPH;
})();
