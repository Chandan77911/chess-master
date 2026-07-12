# Project Grandmaster — Manual Test Checklist

Open `index.html` in your browser, then work through these. Each test lists
steps and what you should see. Check them off as you go.

---

## 0. Page load

- [ ] **T0.1** — Page opens with no visible errors, board shows the standard
  starting position, "White to move" appears under the board.
- [ ] **T0.2** — Open the browser's developer console (F12 → Console tab)
  before doing anything else, and glance back at it periodically. No red
  errors should appear during normal use.

---

## 1. Practice vs. Computer

- [ ] **T1.1 — Basic setup:** Click the **Practice vs. AI** tab. Choose
  "White", strength "Casual", handicap "No handicap", leave both checkboxes
  ticked, click **Start game**. Board resets to the starting position.
- [ ] **T1.2 — Make a move:** Click a pawn (e.g. the one in front of the
  king), see legal-move dots appear on its reachable squares, click one of
  those dots. The pawn moves there.
- [ ] **T1.3 — AI replies:** Within about a second, "The engine is
  thinking…" appears briefly and then the computer plays a reply move
  automatically. Turn indicator flips back to "White to move".
- [ ] **T1.4 — Play as Black:** Start a new game choosing "Black". The
  computer should immediately make White's first move before you can act.
- [ ] **T1.5 — Handicap:** Start a new game with handicap set to "Queen
  odds". Confirm the opponent's queen is simply missing from the board at
  the start.
- [ ] **T1.6 — Checkmate ends the game:** Play (or deliberately blunder
  into) a game to checkmate — easiest way: set strength to "Strong" and
  play a few careless moves. When mate occurs, the status line reads
  "Checkmate — White/Black wins," no further moves are accepted, and the
  **local practice rating** badge at the top updates.

### Socratic hints

- [ ] **T1.7 — Hints available on your turn only:** At the very start of a
  new practice game (your turn), the three hint buttons (Level 1/2/3) in
  the side panel should be clickable, not greyed out.
- [ ] **T1.8 — Tier 1:** Click "Level 1 · Concept". A short, square-free
  sentence appears in the ledger below the buttons (a general theme, no
  exact move named).
- [ ] **T1.9 — Tier 2:** Click "Level 2 · Zone". A new entry appears
  naming a piece and a general board zone, and that piece's square plus
  its destination square are outlined in green on the board.
- [ ] **T1.10 — Tier 3:** Click "Level 3 · Exact move". A new entry names
  the exact from/to squares and the tactical reason.
- [ ] **T1.11 — Hints reset each turn:** After you or the computer moves,
  the ledger clears and all three buttons return to their default,
  unclicked state.
- [ ] **T1.12 — Hints disabled off:** Start a new game with "Socratic
  hints available" unchecked. Confirm the hint buttons stay greyed out
  the whole game.

### Blunder interception

- [ ] **T1.13 — Trigger a blunder warning:** Start a new game as White,
  strength "Tournament" or higher, blunder interception checked. Play
  **1.e4**, let the computer reply, then move your queen out early to an
  exposed square (e.g. **Qh5**). A "Wait." dialog should pop up over the
  board with an explanation before the move is finalized.
- [ ] **T1.14 — Take it back:** In that dialog, click **Take it back**.
  The dialog closes and the board is unchanged — your queen never moved.
- [ ] **T1.15 — Play it anyway:** Trigger the same warning again and this
  time click **Play it anyway**. The dialog closes and the move is now
  played on the board, and the computer replies as normal.
- [ ] **T1.16 — Disabled setting:** Start a new game with "Blunder
  interception" unchecked, then repeat T1.13's queen sortie. No dialog
  should appear — the move just happens.

---

## 2. Local 2-player

- [ ] **T2.1 — Start:** Click the **Local 2-player** tab, click **New
  game**. Standard starting position appears, no computer opponent
  responds — it's fully your control both sides.
- [ ] **T2.2 — Alternating turns:** Move a White piece, then confirm only
  Black pieces are selectable next, and vice versa.
- [ ] **T2.3 — Castling:** Clear the squares between king and rook (play
  out a few normal opening moves for both sides), then click the king and
  click the castling destination two squares over. Confirm both the king
  and rook jump into their castled position in one click, and the move
  list shows "O-O" or "O-O-O".
- [ ] **T2.4 — En passant:** Push a pawn two squares next to an enemy
  pawn on an adjacent file that's already on its 4th/5th rank, then
  capture en passant with that adjacent pawn. Confirm the captured pawn
  disappears even though it isn't on the destination square.
- [ ] **T2.5 — Promotion:** Advance a pawn to the last rank. Confirm it
  automatically becomes a queen (shown by the glyph changing) and the
  move list shows `=Q`.
- [ ] **T2.6 — Hints/rating absent:** Confirm the Socratic hint panel is
  empty in this mode (hints are a Practice-mode-only feature) and the
  rating badge does **not** change after the game ends.

---

## 3. Survival Puzzle Rush

- [ ] **T3.1 — Start:** Click the **Survival Puzzle Rush** tab, click
  **Start rush**. A timer (3:00), 3 filled heart/life icons, "Solved: 0",
  and a puzzle theme label appear, and the board loads a non-standard
  position.
- [ ] **T3.2 — Correct solve:** Work out and play the solution (try the
  built-in "Spot the hanging piece" one first — just capture the
  undefended queen). A green "Correct" message with a short explanation
  appears, "Solved" increments, and a new puzzle loads after about a
  second.
- [ ] **T3.3 — Incorrect attempt:** On a puzzle, deliberately play a
  wrong (but legal) move. A red "Not quite" message appears with the
  correct explanation, and one heart/life is removed.
- [ ] **T3.4 — Lives run out:** Get 3 wrong answers in a row (or across
  the round). Confirm the round ends immediately with a "Round over"
  summary showing your solved count, even if time remains.
- [ ] **T3.5 — Time runs out:** Start a fresh rush and simply let the
  clock reach 0:00 without answering (or answer correctly a few times
  first). Confirm the round ends automatically with the summary when the
  timer hits zero.
- [ ] **T3.6 — Try again:** From the round-over summary, click **Try
  again**. A brand new 3:00/3-life round starts.

---

## 4. Guess the Grandmaster

- [ ] **T4.1 — Pick a game:** Click the **Guess the Grandmaster** tab,
  click **The Opera Game**. The board resets and moves start
  auto-playing on their own every half-second or so.
- [ ] **T4.2 — Reaches a pause:** After a handful of moves, the
  auto-play stops and a "What was played here?" prompt appears with four
  clickable move buttons (in algebraic notation, e.g. `Bxf3`, `Nf6`…).
- [ ] **T4.3 — Correct pick:** Click the button matching the move that
  was actually historically played (if unsure, note the move on the
  board's move-history panel afterward to check). A green confirmation
  appears, the score counter increments, and auto-play resumes.
- [ ] **T4.4 — Incorrect pick:** On a later pause, deliberately click a
  wrong option. A message shows what you picked versus what was actually
  played, and the score denominator increments without the numerator.
- [ ] **T4.5 — Completion:** Let the game play through to its final
  move (Opera Game ends in checkmate). A "Game complete" summary shows
  your final score out of total attempts.
- [ ] **T4.6 — Second game:** Return to the tab and pick **The Immortal
  Game** instead. Confirm it starts fresh from the standard position with
  its own pause points.
- [ ] **T4.7 — No manual moves:** Confirm clicking squares on the board
  does nothing in this mode — the only way to interact is the
  multiple-choice buttons.

---

## 5. Shared controls (test in any mode)

- [ ] **T5.1 — Flip board:** Click **Flip board**. The board rotates
  180° (rank 1 now at top). Click again to flip back.
- [ ] **T5.2 — Control heatmap:** Click **Control heatmap** during a game
  with a few pieces developed. Squares should tint red or blue depending
  on which side contests them more; the button visually shows as active.
  Click again to turn it off and confirm the tint disappears.
- [ ] **T5.3 — Move history:** After a few moves in any playable mode,
  confirm the move list on the right shows correctly numbered move pairs
  (e.g. "1. e4 e5").
- [ ] **T5.4 — Switching modes mid-game:** Start a game in one mode,
  switch tabs to a different mode before finishing it. Confirm the board
  and side panels reset cleanly with no leftover state or errors in the
  console.
- [ ] **T5.5 — Rating persistence:** Finish a Practice game to
  checkmate, note the rating badge value, then refresh the whole page.
  Confirm the badge still shows the updated value (it's saved in your
  browser).

---

### If something fails

Note which test ID failed, what you clicked, and what happened instead
of the expected result — that's exactly what's needed to track down the
issue.
