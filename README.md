# Cherry Djinn

A pixel-art slot-machine roguelike for browser and phone. You rig a djinn's five-reel machine, spend wishes to hold and nudge, and pay a rising tribute or get pulled into the lamp.

No assets and no runtime dependencies: sprites, font, shader background and all audio are generated in code.

## Run

```bash
npm run dev
```

Then open http://localhost:5173. The repo root is also a plain static site (`index.html` + ES modules), so any static host works.

```bash
npm install
npm run build
```

Builds `dist/index.html`, a single self-contained file.

```bash
npm run sim
```

Plays a few hundred runs with a bot and prints how far it gets, for tuning tributes (`node tools/sim.mjs 300 azure smart`).

## How it plays

- **Reels, not a bag.** Each reel is a looping strip showing 3 symbols. Symbols you buy go on the reel and spot you choose, so vertical neighbours are engineered and horizontal ones are luck.
- **Score = coins x Mult.** Every symbol pays coins and may affect the 8 cells it touches. 3+ of one family in a row adds Mult; 3+ identical multiplies it.
- **4 spins, 3 wishes per tribute.** A wish holds reels and respins the rest, or nudges one reel a step.
- **9 tributes in 3 acts.** Every third has a Decree. The starting reels clear Act 1; after that you need a build.
- **Builds.** Most Mult is conditional: enough of one family on the board (fruit, creatures, treasure, garden, magic), long lines, eaters and crackers, short reels, banishing, curses.
- **Bazaar** between rounds: symbols, charms (max 5), banish, move, reroll, and sometimes a cheap cursed relic with a catch.
- **Meta:** four lamps (starting reel sets) and Wrath levels unlock as you play. Runs save automatically.

## Code map

| File | What |
|---|---|
| `src/data.js` | All content as data: symbols, charms, relics, curses, decrees, lamps, tributes |
| `src/game.js` | Rules engine (pure, seeded, JSON-serialisable run state) |
| `src/play.js` | Slot machine screen and scoring animation |
| `src/screens.js` | Title, Bazaar, Bargain, reel editor, end screens, menu, help |
| `src/ui.js` | Input, buttons, cards, info cards, the djinn |
| `src/gfx.js` | Canvas + WebGL background swirl and CRT pass |
| `src/fx.js` | Tweens, springs, particles, floating text |
| `src/audio.js` | Synthesised sound effects and generative music |
| `src/sprites.js`, `src/font.js` | 16x16 sprites and the bitmap font, drawn in code |

Adding a symbol is one line in `src/data.js` plus a 16x16 grid in `src/sprites.js`; most effects (`adj`, `aura`, `amul`, `eat`, `mult`...) are declarative.
