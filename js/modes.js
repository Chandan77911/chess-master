/* ============================================================
   Project Grandmaster — Learning Mode Content
   Survival Puzzle Rush tactics + Guess the Grandmaster replays.
   ============================================================ */

(function () {
// Each puzzle: starting FEN (White or Black to move), the solution move
// in coordinate form, and a short label for the theme (shown after solving).
const PUZZLES = [
  {
    id: 'p1',
    theme: 'Spot the hanging piece',
    fen: '4k3/8/8/8/q7/8/8/3QK3 w - - 0 1',
    solution: { from: 'd1', to: 'a4' },
    explain: 'The black queen on a4 is completely undefended — simply take it.',
  },
  {
    id: 'p2',
    theme: 'Knight fork',
    fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
    solution: { from: 'b5', to: 'c7' },
    explain: 'Nc7+ forks the king on e8 and the rook on a8 — the rook falls next.',
  },
  {
    id: 'p3',
    theme: 'Back-rank mate',
    fen: '6k1/5ppp/8/8/8/8/8/4R2K w - - 0 1',
    solution: { from: 'e1', to: 'e8' },
    explain: "The black king has no escape square — Re8 is checkmate.",
  },
  {
    id: 'p4',
    theme: 'Queen mate on the back rank',
    fen: '7k/6pp/8/8/8/8/8/Q6K w - - 0 1',
    solution: { from: 'a1', to: 'a8' },
    explain: 'Qa8 delivers checkmate along the open 8th rank; the king is boxed in by its own pawns.',
  },
];

// Two celebrated, well-documented historical games (public-domain game
// scores) used for "Guess the Grandmaster". At each pause index the
// platform stops and asks the player to pick the move that was actually
// played. `pauses` are indices into `moves` (0-based, ply count).
const HISTORICAL_GAMES = [
  {
    id: 'opera',
    title: "The Opera Game",
    players: 'Paul Morphy vs. Duke of Brunswick & Count Isouard',
    year: 1858,
    moves: [
      'e4','e5','Nf3','d6','d4','Bg4','dxe5','Bxf3','Qxf3','dxe5',
      'Bc4','Nf6','Qb3','Qe7','Nc3','c6','Bg5','b5','Nxb5','cxb5',
      'Bxb5+','Nbd7','O-O-O','Rd8','Rxd7','Rxd7','Rd1','Qe6','Bxd7+','Nxd7',
      'Qb8+','Nxb8','Rd8#',
    ],
    pauses: [4, 10, 16, 22, 28],
  },
  {
    id: 'immortal',
    title: 'The Immortal Game',
    players: 'Adolf Anderssen vs. Lionel Kieseritzky',
    year: 1851,
    moves: [
      'e4','e5','f4','exf4','Bc4','Qh4+','Kf1','b5','Bxb5','Nf6',
      'Nf3','Qh6','d3','Nh5','Nh4','Qg5','Nf5','c6','g4','Nf6',
      'Rg1','cxb5','h4','Qg6','h5','Qg5','Qf3','Ng8','Bxf4','Qf6',
      'Nc3','Bc5','Nd5','Qxb2','Bd6','Bxg1','e5','Qxa1+','Ke2','Na6',
      'Nxg7+','Kd8','Qf6+','Nxf6','Be7#',
    ],
    pauses: [5, 15, 25, 35],
  },
];

window.LearningContent = { PUZZLES, HISTORICAL_GAMES };
})();
