# Project Grandmaster ♞

A chess web app that's more than just a board — it plays full standard chess rules,
shows you who controls which squares, and coaches you through tactics with a 3-tier hint
system instead of just handing you the answer. Built to run entirely in the browser,
fully offline, installable like an app, no account or server required.

**[Play it live →](#)** *(add your hosted URL here once it's deployed)*

## Features

- **Full rules chess engine** — legal moves, check/checkmate/stalemate, castling
  (both sides), en passant, pawn promotion, the 50-move rule, and threefold repetition.
- **Control heatmap** — toggle it on to see which squares each side actually contests,
  not just where the pieces are.
- **Legal move highlights** — click a piece and see every square it can legally go.
- **Socratic hint system** — three tiers of help in Practice mode: a general concept
  first, then a hint about which piece/zone to look at, then the exact move if you're
  still stuck.
- **Blunder interception** — if you're about to drop 3+ points of material, the game
  pauses and asks if you're sure before committing to the move.
- **Practice vs. computer** — pick your color, the opponent's strength, and even
  material handicaps (knight/rook/queen odds).
- **Local 2-player** — pass-and-play on one device.
- **Survival Puzzle Rush** — 3 minutes, 3 lives, solve as many tactics as you can.
- **Guess the Grandmaster** — watch Morphy's "Opera Game" and Anderssen's "Immortal
  Game" play out move by move, and try to guess what was actually played at key
  moments.
- **Local practice rating** — a simple rating that moves up or down as you play,
  saved in your browser.

## Running it

No install, no build step — it's just static files.

1. Clone or download this repo.
2. Open `index.html` in any modern browser.

That's it.

If your browser is picky about running certain features from a `file://` path, spin up
a quick local server instead:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Installable & offline (PWA)

This is a full Progressive Web App:

- Every asset — fonts included — is bundled locally. No external network calls at all.
- A service worker caches the whole app on first visit, so it keeps working with no
  internet connection after that.
- On Android and desktop Chrome/Edge (Windows, macOS, Linux), you'll see an
  "Install app" option that adds it as a standalone icon.
- On iOS/iPadOS Safari, use Share → "Add to Home Screen" for the same result.

## Hosting it yourself

Since it's 100% static files, any free static host works:

- **GitHub Pages** — turn on Pages in this repo's Settings, pointed at the `main`
  branch, and you'll get a free public URL.
- **Netlify Drop** — drag the folder onto https://app.netlify.com/drop for an instant
  public URL, no account needed.
- **Cloudflare Pages / Vercel** — also free, similar setup.

## Taking it further: native app stores

The browser-install route above already gets you a free, cross-platform, offline app.
If you want it in an actual app store too, you'd wrap this same code with something
like [Capacitor](https://capacitorjs.com/):

| Store            | Dev account cost      | Notes                                  |
|-------------------|------------------------|------------------------------------------|
| Google Play       | $25 one-time           | Build the Android package with Capacitor |
| Apple App Store   | $99/year               | Needs a Mac + Xcode                      |
| Microsoft Store   | Free for individuals   | PWAs can often be submitted directly     |

## Project structure

```
project-grandmaster/
├── index.html          Page shell and layout
├── styles.css           Styling — palette, type, board, panels
├── fonts.css             Self-hosted @font-face declarations
├── manifest.json         PWA manifest
├── service-worker.js     Offline caching
├── assets/
│   ├── fonts/            Local font files
│   └── icons/            App icons
├── js/
│   ├── engine.js         Chess rules engine
│   ├── ai.js              Evaluation, search, hints, blunder detection
│   ├── modes.js           Puzzle bank + historical game data
│   ├── board.js           Board rendering & interaction
│   └── app.js             App controller
├── TEST_CASES.md         Manual QA checklist
└── README.md
```

## What's not here

There's no live multiplayer, ranked matchmaking, or global leaderboards — that would
need real backend infrastructure (a server, a database, other people online at the
same time), which is a different kind of project from a static, offline-first client.
The computer opponent is a compact minimax engine with alpha-beta pruning, not a
tournament-strength engine like Stockfish — it plays solidly but isn't unbeatable.

## License

*(Add your preferred license here — MIT is a common, permissive default if you're not
sure which to pick.)*
