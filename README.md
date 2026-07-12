# Project Grandmaster — Playable Client Build

This is a self-contained, dependency-free web app built from `Project_Grandmaster_GDD.pdf`.
It runs entirely in your browser — no install, no server, no build step.

## Run it

Just open **`index.html`** in any modern browser (Chrome, Firefox, Safari, Edge).
Double-click the file, or drag it into a browser window.

*(A couple of Google Fonts are loaded over the network for the type pairing; everything
else — including the entire chess engine — runs locally with no external calls.)*

## What's implemented, from the GDD

**2. Core Mechanics & UI Interactions**
- Full FIDE rules: legal move generation, check/checkmate/stalemate detection, castling
  (both sides), en passant, promotion, the 50-move rule, and threefold repetition.
- **Control Heatmaps** (2.1): toggle "Control heatmap" under the board — squares glow red
  or blue by how heavily each side contests them.
- **Legal Move Highlights** (2.1): click a piece to see dots on every legal destination.
- **The Socratic AI Assistant** (2.2): in Practice mode, three hint tiers build on each
  other exactly as specified — Level 1 names a theme with no squares, Level 2 points at
  a piece and a zone, Level 3 gives the exact move and the tactical reason.
- **Blunder Interception System** (2.2): if your move drops the evaluation by 3+ points
  (300 centipawns), the board pauses with a "Wait…" dialog before you commit to it.

**3. Game Modes**
- **Practice vs. Computer**: pick your color, an opponent strength (search depth), and
  an **Asymmetrical Handicap** (knight/rook/queen odds) — a simplified, transparent take
  on the GDD's auto-balancing handicap matchmaking, since there's no opponent pool here
  to calculate a live 50/50 split against.
- **Local 2-player**: full-rules pass-and-play on one board.
- **Survival Puzzle Rush** (3.2): 3 minutes, 3 lives, a rotating set of tactics (forks,
  back-rank mates, hanging pieces).
- **Guess the Grandmaster** (3.2): replays two well-documented historical games — Morphy's
  1858 "Opera Game" and Anderssen's 1851 "Immortal Game" — auto-playing until a critical
  juncture, where you pick which move was actually played from a shuffled multiple-choice.

**4. Progression**
- A **local practice rating** (simple Elo-style number, stored in your browser only) nudges
  up or down after each Practice-mode game against the computer.

## What's intentionally *not* here

Sections 3.1 and 5 of the GDD describe a live multiplayer service: Glicko-2 ranked
matchmaking and queueing, a WebSocket real-time server, Redis/PostgreSQL+PostGIS/MongoDB
storage tiers, dedicated Stockfish worker clusters, and geographic "Turf War" leaderboards
across real players. None of that can honestly exist in a static set of files that only
runs in one person's browser — it needs real backend infrastructure, a database, and other
people to play against. This build focuses entirely on what a single-player client can
truthfully deliver: the rules engine, the coaching layer, and the learning modes.

The in-browser opponent is a compact minimax search (with alpha-beta pruning and simple
piece-square-table evaluation) rather than an actual Stockfish binary — it plays sensibly
at a club level but isn't a tournament-strength engine.

## Running it as an installable, offline app (PWA)

This build is a full Progressive Web App now:

- **No external calls at all** — the fonts that used to load from Google Fonts are
  bundled locally in `assets/fonts/`, referenced by `fonts.css`.
- **`manifest.json`** — lets browsers offer an "Install app" / "Add to Home Screen"
  prompt, with a generated knight icon (`assets/icons/`).
- **`service-worker.js`** — caches every file on first visit. After that first visit,
  the app works with the network completely off. This was verified with an automated
  browser test: load once, go fully offline, reload, and play a game — confirmed working.

### Hosting it for free so anyone can open it from a browser

Because it's just static files, any free static host works — no server, no database,
no monthly cost:

- **GitHub Pages** — create a public GitHub repo, push these files, turn on Pages in
  the repo's Settings. You get a permanent free URL like
  `https://yourname.github.io/project-grandmaster/`.
- **Netlify Drop** (no account needed) — go to https://app.netlify.com/drop and drag
  the `project-grandmaster` folder in; it gives you a live public URL immediately.
- **Cloudflare Pages / Vercel** — similar free static-hosting options if you prefer them.

Once it's hosted at a real `https://` URL, visitors on **Android and desktop Chrome/Edge
(Windows, macOS, Linux)** get an "Install" button that adds it as a standalone app icon,
fully offline after the first visit. On **iOS/iPadOS Safari**, use Share → "Add to Home
Screen" — Safari doesn't support the same install banner, but the app still runs
standalone and offline once added.

### Going further: native app-store distribution

The browser-install route above already covers "cross-platform, free, works offline."
If you also want it listed in the Play Store, Apple App Store, or Microsoft Store
specifically, each requires wrapping this same code with a tool like
[Capacitor](https://capacitorjs.com/) and a store developer account:

| Store            | One-time/annual dev cost | Extra requirement                     |
|-------------------|--------------------------|----------------------------------------|
| Google Play       | $25 one-time             | Android build via Capacitor            |
| Apple App Store   | $99/year                 | Mac + Xcode, iOS build via Capacitor   |
| Microsoft Store   | Free for individuals     | Windows build (PWA can submit directly)|

None of that is required just to let people play it in a browser — that part is free.



```
project-grandmaster/
├── index.html          Page shell and layout
├── styles.css           All styling (palette, type, board, panels)
├── fonts.css             Self-hosted @font-face declarations (offline-safe)
├── manifest.json         PWA manifest (installable app metadata)
├── service-worker.js     Offline caching for the whole app
├── assets/
│   ├── fonts/            Local woff2 font files
│   └── icons/            App icons (192px, 512px)
├── js/
│   ├── engine.js        Chess rules: moves, check/mate, castling, en passant, SAN
│   ├── ai.js             Evaluation, search, Socratic hints, blunder detection
│   ├── modes.js          Puzzle bank + historical game data
│   ├── board.js          Board rendering & click interaction
│   └── app.js            App controller: wires modes, panels, and the board together
├── TEST_CASES.md         Manual QA checklist
└── README.md
```

Every piece of game logic (`engine.js`, `ai.js`) was verified against a script that
replays both historical games move-by-move and confirms every puzzle's solution is legal
and produces the intended result, before this was handed to you.
