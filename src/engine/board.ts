import {
  BOARD_SIZE,
  Board,
  Coord,
  FLEET,
  FLEET_CELLS,
  Orientation,
  Ship,
  ShipSpec,
  ShotResult,
  inBounds,
  key,
  sameCoord,
} from './types'
import { Rng } from './rng'

export const createBoard = (): Board => ({ ships: [], shots: [] })

/** Cells a ship would occupy if anchored at `start`. May include out-of-bounds cells. */
export function shipCells(start: Coord, length: number, orientation: Orientation): Coord[] {
  const cells: Coord[] = []
  for (let i = 0; i < length; i++) {
    cells.push(
      orientation === 'horizontal'
        ? { row: start.row, col: start.col + i }
        : { row: start.row + i, col: start.col },
    )
  }
  return cells
}

export function canPlace(
  board: Board,
  start: Coord,
  length: number,
  orientation: Orientation,
): boolean {
  const cells = shipCells(start, length, orientation)
  if (!cells.every(inBounds)) return false
  const occupied = new Set(board.ships.flatMap((s) => s.cells).map(key))
  return cells.every((c) => !occupied.has(key(c)))
}

/** Returns a new board with the ship placed, or null if the placement is invalid. */
export function placeShip(
  board: Board,
  spec: ShipSpec,
  start: Coord,
  orientation: Orientation,
): Board | null {
  if (board.ships.some((s) => s.name === spec.name)) return null
  if (!canPlace(board, start, spec.length, orientation)) return null
  const ship: Ship = {
    name: spec.name,
    length: spec.length,
    orientation,
    cells: shipCells(start, spec.length, orientation),
    hits: 0,
  }
  return { ...board, ships: [...board.ships, ship] }
}

export function removeShip(board: Board, name: Ship['name']): Board {
  return { ...board, ships: board.ships.filter((s) => s.name !== name) }
}

/** Places the full standard fleet at random, never overlapping or out of bounds. */
export function randomFleet(rng: Rng, board: Board = createBoard()): Board {
  let result = board
  for (const spec of FLEET) {
    if (result.ships.some((s) => s.name === spec.name)) continue
    let placed: Board | null = null
    // Bounded retries; the fallback scan below guarantees a valid placement.
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const orientation: Orientation = rng.next() < 0.5 ? 'horizontal' : 'vertical'
      const start = { row: rng.int(BOARD_SIZE), col: rng.int(BOARD_SIZE) }
      placed = placeShip(result, spec, start, orientation)
    }
    if (!placed) {
      outer: for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          for (const orientation of ['horizontal', 'vertical'] as const) {
            const candidate = placeShip(result, spec, { row, col }, orientation)
            if (candidate) {
              placed = candidate
              break outer
            }
          }
        }
      }
    }
    if (!placed) throw new Error(`Unable to place ${spec.name}`)
    result = placed
  }
  return result
}

export const isShipSunk = (ship: Ship): boolean => ship.hits >= ship.length

export const shipAt = (board: Board, coord: Coord): Ship | undefined =>
  board.ships.find((s) => s.cells.some((c) => sameCoord(c, coord)))

export const hasBeenShot = (board: Board, coord: Coord): boolean =>
  board.shots.some((s) => sameCoord(s, coord))

export const remainingHealth = (board: Board): number =>
  board.ships.reduce((sum, s) => sum + (s.length - s.hits), 0)

export const isFleetDestroyed = (board: Board): boolean =>
  board.ships.length > 0 &&
  board.ships.every(isShipSunk) &&
  board.ships.reduce((n, s) => n + s.length, 0) === FLEET_CELLS

/** Resolves a shot against `board`. Repeat shots are rejected and change nothing. */
export function applyShot(board: Board, coord: Coord): { board: Board; result: ShotResult } {
  if (!inBounds(coord) || hasBeenShot(board, coord)) {
    return {
      board,
      result: { coord, outcome: 'repeat', sunk: null, sunkCells: [], fleetDestroyed: false },
    }
  }

  const target = shipAt(board, coord)
  const shots = [...board.shots, coord]

  if (!target) {
    const next = { ...board, shots }
    return {
      board: next,
      result: { coord, outcome: 'miss', sunk: null, sunkCells: [], fleetDestroyed: false },
    }
  }

  const ships = board.ships.map((s) => (s.name === target.name ? { ...s, hits: s.hits + 1 } : s))
  const next: Board = { ships, shots }
  const updated = ships.find((s) => s.name === target.name)!
  const sunk = isShipSunk(updated)

  return {
    board: next,
    result: {
      coord,
      outcome: 'hit',
      sunk: sunk ? updated.name : null,
      sunkCells: sunk ? updated.cells : [],
      fleetDestroyed: isFleetDestroyed(next),
    },
  }
}
