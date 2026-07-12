/* ============================================================
   Project Grandmaster — Application Controller
   ============================================================ */

(function () {
  const { WHITE, BLACK, sqName, nameToSq, otherColor } = window.ChessUtil;
  const { PUZZLES, HISTORICAL_GAMES } = window.LearningContent;

  const els = {
    board: document.getElementById('board'),
    modeTabs: document.getElementById('modeTabs'),
    modeSetup: document.getElementById('modeSetup'),
    modeStatus: document.getElementById('modeStatus'),
    hintLedger: document.getElementById('hintLedger'),
    moveHistory: document.getElementById('moveHistory'),
    statusLine: document.getElementById('statusLine'),
    flipBtn: document.getElementById('flipBtn'),
    heatmapToggle: document.getElementById('heatmapToggle'),
    blunderModal: document.getElementById('blunderModal'),
    blunderText: document.getElementById('blunderText'),
    blunderTakeBack: document.getElementById('blunderTakeBack'),
    blunderPlayAnyway: document.getElementById('blunderPlayAnyway'),
    ratingBadge: document.getElementById('ratingBadge'),
  };

  const state = {
    mode: 'practice',
    game: new window.ChessGame(),
    board: null,
    selectedSquare: null,
    legalTargets: [],
    lastMove: null,
    hintSquares: null,
    showHeatmap: false,
    // practice mode config
    practice: {
      humanColor: WHITE,
      aiDepth: 3,
      handicap: 'none',
      hintsEnabled: true,
      blunderCheckEnabled: true,
      aiThinking: false,
    },
    pendingMove: null, // move awaiting blunder confirmation
    // puzzle rush
    rush: null,
    // guess the grandmaster
    guess: null,
  };

  const HANDICAPS = {
    none: { label: 'No handicap', remove: [] },
    knight: { label: "Knight odds (remove opponent's Nb1)", remove: ['b1', 'b8'] },
    rook: { label: "Rook odds (remove opponent's Ra1)", remove: ['a1', 'a8'] },
    queen: { label: "Queen odds (remove opponent's Queen)", remove: ['d1', 'd8'] },
  };

  function getLocalRating() {
    const v = localStorage.getItem('pg_local_rating');
    return v ? parseInt(v, 10) : 1200;
  }
  function setLocalRating(v) {
    localStorage.setItem('pg_local_rating', String(Math.round(v)));
    renderRatingBadge();
  }
  function renderRatingBadge() {
    els.ratingBadge.textContent = `Local practice rating: ${getLocalRating()}`;
  }
  function adjustRatingAfterGame(result) {
    // Lightweight Elo-style nudge against a nominal AI rating tied to search depth.
    const aiRatingByDepth = { 1: 900, 2: 1100, 3: 1400, 4: 1700, 5: 2000 };
    const aiRating = aiRatingByDepth[state.practice.aiDepth] || 1400;
    const rating = getLocalRating();
    const expected = 1 / (1 + Math.pow(10, (aiRating - rating) / 400));
    const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    const K = 24;
    setLocalRating(rating + K * (score - expected));
  }

  // ---------------- Board wiring ----------------

  state.board = new window.BoardView(els.board, { onSquareClick: handleSquareClick });

  function viewState() {
    return {
      selectedSquare: state.selectedSquare,
      legalTargets: state.legalTargets,
      lastMove: state.lastMove,
      hintSquares: state.hintSquares,
      showHeatmap: state.showHeatmap,
    };
  }

  function render() {
    state.board.render(state.game, viewState());
    renderMoveHistory();
    renderStatusLine();
  }

  function renderMoveHistory() {
    const moves = state.game.history.map(h => h.san);
    let html = '';
    for (let i = 0; i < moves.length; i += 2) {
      const num = i / 2 + 1;
      html += `<div class="move-row"><span class="move-num">${num}.</span>` +
        `<span class="move-san">${moves[i] || ''}</span>` +
        `<span class="move-san">${moves[i + 1] || ''}</span></div>`;
    }
    els.moveHistory.innerHTML = `<h3>Move history</h3><div class="move-list">${html || '<p class="muted">No moves yet.</p>'}</div>`;
  }

  function renderStatusLine() {
    const status = state.game.status();
    let text;
    if (status.over) {
      if (status.reason === 'checkmate') {
        const winner = status.result === '1-0' ? 'White' : 'Black';
        text = `Checkmate — ${winner} wins.`;
      } else {
        text = `Draw by ${status.reason}.`;
      }
    } else {
      text = `${state.game.turn === WHITE ? 'White' : 'Black'} to move${status.check ? ' — check!' : ''}`;
    }
    els.statusLine.textContent = text;
  }

  function handleSquareClick(square) {
    if (state.mode === 'practice') return handlePracticeClick(square);
    if (state.mode === 'local') return handleLocalClick(square);
    if (state.mode === 'rush') return handleRushClick(square);
    // guess mode has no board interaction (multiple choice only)
  }

  function clearSelection() {
    state.selectedSquare = null;
    state.legalTargets = [];
  }

  // ---------------- Practice vs Computer ----------------

  function isHumanTurn() {
    return state.game.turn === state.practice.humanColor && !state.practice.aiThinking;
  }

  function handlePracticeClick(square) {
    const status = state.game.status();
    if (status.over || !isHumanTurn()) return;
    const piece = state.game.board[square];

    if (state.selectedSquare !== null) {
      const move = state.legalTargets.find(m => m.to === square);
      if (move) {
        attemptHumanMove(move);
        return;
      }
    }
    if (piece && piece.color === state.game.turn) {
      state.selectedSquare = square;
      state.legalTargets = state.game.legalMovesFrom(square);
    } else {
      clearSelection();
    }
    render();
  }

  function attemptHumanMove(move) {
    move = resolvePromotion(move);
    if (!move) return;
    if (state.practice.blunderCheckEnabled) {
      const check = window.ChessAI.checkBlunder(state.game, move, 300, 2);
      if (check.blunder) {
        state.pendingMove = move;
        showBlunderModal(check.message);
        return;
      }
    }
    commitPracticeMove(move);
  }

  function resolvePromotion(move) {
    if (move.flags && move.flags.promotion) {
      // Simplify: always promote to Queen unless multiple promotion options exist for same from/to (they do, one per piece) — auto-pick Queen.
      if (move.flags.promotion !== 'Q') return null;
    }
    return move;
  }

  function commitPracticeMove(move) {
    clearSelection();
    state.hintSquares = null;
    state.game.makeMove(move);
    state.lastMove = { from: move.from, to: move.to };
    render();
    resetHintPanelForTurn();
    const status = state.game.status();
    if (status.over) return handleGameOver(status);
    scheduleAiMove();
  }

  function scheduleAiMove() {
    state.practice.aiThinking = true;
    renderModeStatus();
    setTimeout(() => {
      const result = window.ChessAI.findBestMove(state.game, state.practice.aiDepth);
      state.practice.aiThinking = false;
      if (!result) { render(); return; }
      state.game.makeMove(result.move);
      state.lastMove = { from: result.move.from, to: result.move.to };
      render();
      resetHintPanelForTurn();
      const status = state.game.status();
      if (status.over) handleGameOver(status);
      renderModeStatus();
    }, 380);
  }

  function handleGameOver(status) {
    if (state.mode !== 'practice') return;
    let result = 'draw';
    if (status.reason === 'checkmate') {
      const humanWon = (status.result === '1-0' && state.practice.humanColor === WHITE) ||
                        (status.result === '0-1' && state.practice.humanColor === BLACK);
      result = humanWon ? 'win' : 'loss';
    }
    adjustRatingAfterGame(result);
  }

  function showBlunderModal(message) {
    els.blunderText.textContent = message;
    els.blunderModal.classList.remove('hidden');
  }
  function hideBlunderModal() {
    els.blunderModal.classList.add('hidden');
    state.pendingMove = null;
  }
  els.blunderTakeBack.addEventListener('click', () => {
    hideBlunderModal();
    clearSelection();
    render();
  });
  els.blunderPlayAnyway.addEventListener('click', () => {
    const move = state.pendingMove;
    hideBlunderModal();
    if (move) commitPracticeMove(move);
  });

  function resetHintPanelForTurn() {
    if (state.mode !== 'practice') return;
    renderHintLedger([]);
  }

  function renderHintLedger(log) {
    if (state.mode !== 'practice') { els.hintLedger.innerHTML = ''; return; }
    const disabled = !state.practice.hintsEnabled || !isHumanTurn() || state.game.status().over;
    els.hintLedger.innerHTML = `
      <h3>Socratic coach</h3>
      <p class="muted small">Ask for a hint, one tier at a time — concept first, then the exact move.</p>
      <div class="hint-buttons">
        <button class="btn btn--ghost" id="hint1" ${disabled ? 'disabled' : ''}>Level 1 · Concept</button>
        <button class="btn btn--ghost" id="hint2" ${disabled ? 'disabled' : ''}>Level 2 · Zone</button>
        <button class="btn btn--ghost" id="hint3" ${disabled ? 'disabled' : ''}>Level 3 · Exact move</button>
      </div>
      <div class="ledger-log">${(log || []).map(renderHintEntry).join('')}</div>
    `;
    if (!disabled) {
      document.getElementById('hint1').addEventListener('click', () => requestHint(1));
      document.getElementById('hint2').addEventListener('click', () => requestHint(2));
      document.getElementById('hint3').addEventListener('click', () => requestHint(3));
    }
    els.hintLedger._log = log || [];
  }

  function renderHintEntry(h) {
    const tierLabel = ['', 'Concept', 'Zone', 'Exact move'][h.level];
    return `<div class="ledger-entry ledger-entry--l${h.level}"><span class="ledger-tier">Tier ${h.level} · ${tierLabel}</span><p>${h.text}</p></div>`;
  }

  function requestHint(level) {
    const hint = window.ChessAI.generateHint(state.game, level, Math.max(2, state.practice.aiDepth));
    const log = (els.hintLedger._log || []).concat([hint]);
    renderHintLedger(log);
    state.hintSquares = hint.highlightSquares || null;
    render();
  }

  // ---------------- Local 2-player ----------------

  function handleLocalClick(square) {
    const status = state.game.status();
    if (status.over) return;
    const piece = state.game.board[square];
    if (state.selectedSquare !== null) {
      const move = state.legalTargets.find(m => m.to === square);
      if (move) {
        const resolved = resolvePromotion(move);
        if (resolved) {
          clearSelection();
          state.game.makeMove(resolved);
          state.lastMove = { from: resolved.from, to: resolved.to };
          render();
        }
        return;
      }
    }
    if (piece && piece.color === state.game.turn) {
      state.selectedSquare = square;
      state.legalTargets = state.game.legalMovesFrom(square);
    } else {
      clearSelection();
    }
    render();
  }

  // ---------------- Survival Puzzle Rush ----------------

  function startRush() {
    state.rush = {
      order: shuffle(PUZZLES.map((_, i) => i)),
      pointer: 0,
      lives: 3,
      solved: 0,
      timeLeft: 180,
      timer: null,
      finished: false,
    };
    loadRushPuzzle();
    state.rush.timer = setInterval(() => {
      state.rush.timeLeft--;
      if (state.rush.timeLeft <= 0) endRush();
      else renderModeStatus();
    }, 1000);
    renderModeStatus();
  }

  function loadRushPuzzle() {
    const idx = state.rush.order[state.rush.pointer % state.rush.order.length];
    const puzzle = PUZZLES[idx];
    state.rush.current = puzzle;
    state.game = new window.ChessGame();
    state.game.loadFen(puzzle.fen);
    clearSelection();
    state.lastMove = null;
    state.hintSquares = null;
    render();
  }

  function handleRushClick(square) {
    if (!state.rush || state.rush.finished) return;
    const piece = state.game.board[square];
    if (state.selectedSquare !== null) {
      const move = state.legalTargets.find(m => m.to === square);
      if (move) {
        checkRushMove(move);
        return;
      }
    }
    if (piece && piece.color === state.game.turn) {
      state.selectedSquare = square;
      state.legalTargets = state.game.legalMovesFrom(square);
      render();
    } else {
      clearSelection();
      render();
    }
  }

  function checkRushMove(move) {
    const puzzle = state.rush.current;
    const correct = sqName(move.from) === puzzle.solution.from && sqName(move.to) === puzzle.solution.to;
    clearSelection();
    if (correct) {
      state.rush.solved++;
      state.rush.pointer++;
      flashModeStatus(`Correct — ${puzzle.explain}`, 'good');
      setTimeout(loadRushPuzzle, 1100);
    } else {
      state.rush.lives--;
      flashModeStatus(`Not quite. ${puzzle.explain}`, 'bad');
      if (state.rush.lives <= 0) {
        setTimeout(endRush, 900);
      } else {
        setTimeout(loadRushPuzzle, 1300);
      }
    }
    renderModeStatus();
  }

  function endRush() {
    if (!state.rush || state.rush.finished) return;
    state.rush.finished = true;
    clearInterval(state.rush.timer);
    renderModeStatus();
  }

  function flashModeStatus(msg, cls) {
    state.rush.flash = { msg, cls };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------------- Guess the Grandmaster ----------------

  function startGuess(gameId) {
    const hg = HISTORICAL_GAMES.find(g => g.id === gameId);
    state.guess = {
      hg, pointer: 0, waiting: false, score: 0, attempts: 0, done: false,
    };
    state.game = new window.ChessGame();
    clearSelection();
    state.lastMove = null;
    render();
    renderModeStatus();
    advanceGuess();
  }

  function advanceGuess() {
    const g = state.guess;
    if (!g) return;
    if (g.pointer >= g.hg.moves.length) {
      g.done = true;
      renderModeStatus();
      return;
    }
    if (g.hg.pauses.includes(g.pointer)) {
      presentGuessChoice();
      return;
    }
    playNextHistoricalMove();
    setTimeout(advanceGuess, 550);
  }

  function playNextHistoricalMove() {
    const g = state.guess;
    const target = g.hg.moves[g.pointer];
    const legal = state.game.legalMoves(state.game.turn);
    const match = legal.find(m => state.game._toSAN(m) === target);
    if (!match) return; // defensive; verified offline already
    state.game.makeMove(match);
    state.lastMove = { from: match.from, to: match.to };
    g.pointer++;
    render();
  }

  function presentGuessChoice() {
    const g = state.guess;
    g.waiting = true;
    const target = g.hg.moves[g.pointer];
    const legal = state.game.legalMoves(state.game.turn);
    const correctMove = legal.find(m => state.game._toSAN(m) === target);
    if (!correctMove) { g.pointer++; advanceGuess(); return; }
    const others = legal.filter(m => m !== correctMove);
    const distractors = shuffle(others).slice(0, 3).map(m => ({ move: m, san: state.game._toSAN(m) }));
    const choices = shuffle([{ move: correctMove, san: target, correct: true }, ...distractors]);
    g.choices = choices;
    renderModeStatus();
  }

  function chooseGuess(san) {
    const g = state.guess;
    if (!g || !g.waiting) return;
    g.waiting = false;
    g.attempts++;
    const picked = g.choices.find(c => c.san === san);
    if (picked && picked.correct) g.score++;
    g.lastResult = { picked: san, correctSan: g.hg.moves[g.pointer], wasCorrect: picked && picked.correct };
    playNextHistoricalMove();
    renderModeStatus();
    setTimeout(advanceGuess, 900);
  }

  // ---------------- Mode setup / status panels ----------------

  function renderModeTabs() {
    const tabs = [
      { id: 'practice', label: 'Practice vs. AI' },
      { id: 'local', label: 'Local 2-player' },
      { id: 'rush', label: 'Survival Puzzle Rush' },
      { id: 'guess', label: 'Guess the Grandmaster' },
    ];
    els.modeTabs.innerHTML = tabs.map(t =>
      `<button class="tab ${state.mode === t.id ? 'tab--active' : ''}" data-mode="${t.id}">${t.label}</button>`
    ).join('');
    els.modeTabs.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });
  }

  function switchMode(mode) {
    if (state.rush && state.rush.timer) clearInterval(state.rush.timer);
    state.mode = mode;
    state.game = new window.ChessGame();
    clearSelection();
    state.lastMove = null;
    state.hintSquares = null;
    state.rush = null;
    state.guess = null;
    renderModeTabs();
    renderModeSetup();
    renderModeStatus();
    renderHintLedger([]);
    render();
  }

  function renderModeSetup() {
    if (state.mode === 'practice') {
      els.modeSetup.innerHTML = `
        <h3>Set up your game</h3>
        <label class="field">Play as
          <select id="colorSelect">
            <option value="w" ${state.practice.humanColor === WHITE ? 'selected' : ''}>White</option>
            <option value="b" ${state.practice.humanColor === BLACK ? 'selected' : ''}>Black</option>
          </select>
        </label>
        <label class="field">Opponent strength
          <select id="depthSelect">
            <option value="1">Casual (instant)</option>
            <option value="2">Club player</option>
            <option value="3" selected>Tournament</option>
            <option value="4">Strong</option>
          </select>
        </label>
        <label class="field">Handicap
          <select id="handicapSelect">
            ${Object.entries(HANDICAPS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
          </select>
        </label>
        <label class="checkbox"><input type="checkbox" id="hintsCheck" checked> Socratic hints available</label>
        <label class="checkbox"><input type="checkbox" id="blunderCheck" checked> Blunder interception</label>
        <button class="btn btn--primary" id="startPracticeBtn">Start game</button>
      `;
      document.getElementById('startPracticeBtn').addEventListener('click', () => {
        state.practice.humanColor = document.getElementById('colorSelect').value;
        state.practice.aiDepth = parseInt(document.getElementById('depthSelect').value, 10);
        state.practice.handicap = document.getElementById('handicapSelect').value;
        state.practice.hintsEnabled = document.getElementById('hintsCheck').checked;
        state.practice.blunderCheckEnabled = document.getElementById('blunderCheck').checked;
        beginPracticeGame();
      });
    } else if (state.mode === 'local') {
      els.modeSetup.innerHTML = `
        <h3>Local 2-player</h3>
        <p class="muted small">Pass the device between moves. Full FIDE rules apply, including castling, en passant and the 50-move rule.</p>
        <button class="btn btn--primary" id="startLocalBtn">New game</button>
      `;
      document.getElementById('startLocalBtn').addEventListener('click', () => {
        state.game = new window.ChessGame();
        clearSelection(); state.lastMove = null;
        render();
      });
    } else if (state.mode === 'rush') {
      els.modeSetup.innerHTML = `
        <h3>Survival Puzzle Rush</h3>
        <p class="muted small">3 minutes, 3 lives. Solve as many tactics as you can before time or lives run out.</p>
        <button class="btn btn--primary" id="startRushBtn">Start rush</button>
      `;
      document.getElementById('startRushBtn').addEventListener('click', startRush);
    } else if (state.mode === 'guess') {
      els.modeSetup.innerHTML = `
        <h3>Guess the Grandmaster</h3>
        <p class="muted small">Watch a historical game unfold. At key junctures, pick the move that was actually played.</p>
        ${HISTORICAL_GAMES.map(hg => `
          <button class="btn btn--ghost guess-pick" data-id="${hg.id}">
            <strong>${hg.title}</strong><br><span class="muted small">${hg.players}, ${hg.year}</span>
          </button>`).join('')}
      `;
      els.modeSetup.querySelectorAll('.guess-pick').forEach(btn => {
        btn.addEventListener('click', () => startGuess(btn.dataset.id));
      });
    }
  }

  function beginPracticeGame() {
    state.game = new window.ChessGame();
    const removals = HANDICAPS[state.practice.handicap].remove;
    const aiColor = otherColor(state.practice.humanColor);
    for (const name of removals) {
      const s = nameToSq(name);
      const p = state.game.board[s];
      if (p && p.color === aiColor) state.game.board[s] = null;
    }
    clearSelection();
    state.lastMove = null;
    render();
    resetHintPanelForTurn();
    state.board.setFlipped(state.practice.humanColor === BLACK);
    if (state.game.turn !== state.practice.humanColor) scheduleAiMove();
  }

  function renderModeStatus() {
    if (state.mode === 'practice') {
      els.modeStatus.innerHTML = state.practice.aiThinking
        ? `<p class="muted">The engine is thinking…</p>` : '';
    } else if (state.mode === 'rush') {
      const r = state.rush;
      if (!r) { els.modeStatus.innerHTML = ''; return; }
      if (r.finished) {
        els.modeStatus.innerHTML = `<h3>Round over</h3><p>You solved <strong>${r.solved}</strong> puzzle${r.solved === 1 ? '' : 's'}.</p>
          <button class="btn btn--primary" id="rushAgain">Try again</button>`;
        document.getElementById('rushAgain').addEventListener('click', startRush);
        return;
      }
      const mins = Math.floor(r.timeLeft / 60), secs = String(r.timeLeft % 60).padStart(2, '0');
      const flash = r.flash ? `<p class="flash flash--${r.flash.cls}">${r.flash.msg}</p>` : '';
      els.modeStatus.innerHTML = `
        <div class="rush-hud">
          <span>⏱ ${mins}:${secs}</span>
          <span>♥ ${'●'.repeat(r.lives)}${'○'.repeat(Math.max(0, 3 - r.lives))}</span>
          <span>Solved: ${r.solved}</span>
        </div>
        <p class="muted small">${r.current ? r.current.theme : ''}</p>
        ${flash}
      `;
      r.flash = null;
    } else if (state.mode === 'guess') {
      const g = state.guess;
      if (!g) { els.modeStatus.innerHTML = ''; return; }
      if (g.done) {
        els.modeStatus.innerHTML = `<h3>Game complete</h3><p>You matched <strong>${g.score}/${g.attempts}</strong> critical moves in ${g.hg.title}.</p>`;
        return;
      }
      let choicesHtml = '';
      if (g.waiting) {
        choicesHtml = `<h4>What was played here?</h4><div class="choice-grid">` +
          g.choices.map(c => `<button class="btn btn--ghost choice-btn" data-san="${c.san}">${c.san}</button>`).join('') +
          `</div>`;
      } else if (g.lastResult) {
        choicesHtml = `<p class="${g.lastResult.wasCorrect ? 'flash flash--good' : 'flash flash--bad'}">
          You picked ${g.lastResult.picked}. The game continued ${g.lastResult.correctSan}.</p>`;
      }
      els.modeStatus.innerHTML = `<h3>${g.hg.title}</h3><p class="muted small">${g.hg.players}, ${g.hg.year}</p>
        <p>Score: ${g.score}/${g.attempts}</p>${choicesHtml}`;
      els.modeStatus.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => chooseGuess(btn.dataset.san));
      });
    } else {
      els.modeStatus.innerHTML = '';
    }
  }

  // ---------------- Global controls ----------------

  els.flipBtn.addEventListener('click', () => state.board.setFlipped(!state.board.flipped));
  els.heatmapToggle.addEventListener('click', () => {
    state.showHeatmap = !state.showHeatmap;
    els.heatmapToggle.classList.toggle('btn--active', state.showHeatmap);
    render();
  });

  // ---------------- Boot ----------------

  renderRatingBadge();
  renderModeTabs();
  renderModeSetup();
  renderHintLedger([]);
  render();
})();
