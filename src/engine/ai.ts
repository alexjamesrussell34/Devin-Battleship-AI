import { BOARD_SIZE, Coord, ShotResult, inBounds, key, sameCoord } from './types'
import { Rng } from './rng'

export type AiMode = 'hunt' | 'target'
export type Axis = 'horizontal' | 'vertical' | null

export interface AiState {
  mode: AiMode
  /** Candidate cells to try while in target mode, most promising last (stack). */
  targets: Coord[]
  /** Hits on the ship currently being pursued. */
  currentHits: Coord[]
  axis: Axis
  /** Every cell already fired at, as "row,col". */
  shots: Set<string>
}

export const createAi = (): AiState => ({
  mode: 'hunt',
  targets: [],
  currentHits: [],
  axis: null,
  shots: new Set(),
})

export const isParityCell = (c: Coord): boolean => (c.row + c.col) % 2 === 0

export const neighbors = (c: Coord): Coord[] =>
  [
    { row: c.row - 1, col: c.col },
    { row: c.row + 1, col: c.col },
    { row: c.row, col: c.col - 1 },
    { row: c.row, col: c.col + 1 },
  ].filter(inBounds)

const unshot = (state: AiState, c: Coord): boolean => !state.shots.has(key(c))

function huntCandidates(state: AiState): Coord[] {
  const all: Coord[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const c = { row, col }
      if (unshot(state, c)) all.push(c)
    }
  }
  const parity = all.filter(isParityCell)
  return parity.length > 0 ? parity : all
}

/**
 * Chooses the next cell to fire at. Never returns a previously shot cell.
 * Returns null only when the whole board has been fired at.
 */
export function nextShot(state: AiState, rng: Rng): Coord | null {
  const targets = [...state.targets]
  while (targets.length > 0) {
    const candidate = targets.pop()!
    if (unshot(state, candidate)) return candidate
  }
  const candidates = huntCandidates(state)
  if (candidates.length === 0) return null
  return rng.pick(candidates)
}

const axisOf = (hits: Coord[]): Axis => {
  if (hits.length < 2) return null
  return hits.every((h) => h.row === hits[0].row) ? 'horizontal' : 'vertical'
}

/** Endpoints extending the established line of hits in both directions. */
function axisEnds(hits: Coord[], axis: Exclude<Axis, null>): Coord[] {
  const sorted = [...hits].sort((a, b) =>
    axis === 'horizontal' ? a.col - b.col : a.row - b.row,
  )
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  return axis === 'horizontal'
    ? [
        { row: first.row, col: first.col - 1 },
        { row: last.row, col: last.col + 1 },
      ].filter(inBounds)
    : [
        { row: first.row - 1, col: first.col },
        { row: last.row + 1, col: last.col },
      ].filter(inBounds)
}

/**
 * Folds a shot result into the AI state: parity hunting until a hit, then
 * neighbour targeting, then axis-locked extension, then back to hunt on a sink.
 */
export function registerResult(state: AiState, result: ShotResult): AiState {
  if (result.outcome === 'repeat') return state

  const shots = new Set(state.shots)
  shots.add(key(result.coord))

  if (result.outcome === 'miss') {
    const targets = state.targets.filter((t) => !shots.has(key(t)))
    return {
      ...state,
      shots,
      targets,
      mode: targets.length > 0 ? 'target' : state.currentHits.length > 0 ? 'target' : 'hunt',
    }
  }

  if (result.sunk) {
    // Drop stale targets that were queued for the ship that just sank.
    const sunkKeys = new Set(result.sunkCells.map(key))
    const adjacentToSunk = new Set(
      result.sunkCells.flatMap((c) => neighbors(c)).map(key),
    )
    const targets = state.targets.filter(
      (t) => !shots.has(key(t)) && !sunkKeys.has(key(t)) && !adjacentToSunk.has(key(t)),
    )
    return {
      mode: targets.length > 0 ? 'target' : 'hunt',
      targets,
      currentHits: [],
      axis: null,
      shots,
    }
  }

  const currentHits = [...state.currentHits, result.coord]
  const axis = axisOf(currentHits)
  const existing = state.targets.filter((t) => !shots.has(key(t)))

  let targets: Coord[]
  if (axis) {
    // Orientation known: only extend along the axis, in both directions.
    targets = axisEnds(currentHits, axis).filter((c) => !shots.has(key(c)))
  } else {
    const fresh = neighbors(result.coord).filter(
      (c) => !shots.has(key(c)) && !existing.some((t) => sameCoord(t, c)),
    )
    targets = [...existing, ...fresh]
  }

  return { mode: 'target', targets, currentHits, axis, shots }
}
