# Battleship AI

Classic 10×10 Battleship against a hunt/target AI opponent. React + TypeScript + Vite, no backend.

## Play

```bash
npm install
npm run dev
```

Scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`.

## Rules

- 10×10 grid, standard fleet: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2) — 17 cells.
- Place ships manually (click to anchor, `R` or the Rotate button to flip orientation) or hit **Randomize**.
- Turn-based: you fire at enemy waters, then the AI fires at your fleet. Hits, misses and sinkings are announced in the status bar and shot log.
- First fleet to lose all 17 cells loses. Phases: `placement → playing → game-over`.

## AI opponent

`src/engine/ai.ts` is a pure state machine driven by `nextShot(state, rng)` and `registerResult(state, result)`:

- **Hunt** — random shots restricted to the checkerboard parity set `(row + col) % 2 === 0`, which cannot miss a ship of length ≥ 2. Falls back to any unshot cell once parity is exhausted.
- **Target** — a hit pushes the four orthogonal neighbours onto a target stack. A second collinear hit locks the axis, after which only the two cells extending the line are queued.
- **Sunk** — targets belonging to (or adjacent to) the sunk ship are dropped; the AI returns to hunt mode unless targets for another ship remain.
- A `shots` set is consulted before every shot, so a cell is never fired at twice.

## Layout

```
src/
  engine/    board model, placement validation, shot resolution, win detection, AI, seedable RNG
  state/     game reducer (placement → playing → game-over)
  components/ Board, ShotLog, FleetStatus
  sound.ts   WebAudio blips for hit / miss / sunk / win / lose
```

## Tests

`npm test` runs the Vitest suite over the pure engine: placement validation (bounds and overlap, 500 random fleets), shot deduplication, targeting transitions (hunt → target → axis lock → sunk → hunt), win detection, and a seeded simulation asserting the AI never repeats a shot and beats a random baseline.
