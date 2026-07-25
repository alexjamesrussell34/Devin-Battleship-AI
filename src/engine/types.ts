export const BOARD_SIZE = 10

export type ShipName = 'Carrier' | 'Battleship' | 'Cruiser' | 'Submarine' | 'Destroyer'

export interface ShipSpec {
  name: ShipName
  length: number
}

export const FLEET: readonly ShipSpec[] = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
]

export const FLEET_CELLS = FLEET.reduce((sum, s) => sum + s.length, 0)

export type Orientation = 'horizontal' | 'vertical'

export interface Coord {
  row: number
  col: number
}

export interface Ship {
  name: ShipName
  length: number
  orientation: Orientation
  cells: Coord[]
  hits: number
}

export interface Board {
  ships: Ship[]
  shots: Coord[]
}

export type ShotOutcome = 'hit' | 'miss' | 'repeat'

export interface ShotResult {
  coord: Coord
  outcome: ShotOutcome
  sunk: ShipName | null
  /** Cells of the ship that was sunk by this shot, if any. */
  sunkCells: Coord[]
  fleetDestroyed: boolean
}

export const key = (c: Coord): string => `${c.row},${c.col}`

export const inBounds = (c: Coord): boolean =>
  c.row >= 0 && c.row < BOARD_SIZE && c.col >= 0 && c.col < BOARD_SIZE

export const sameCoord = (a: Coord, b: Coord): boolean => a.row === b.row && a.col === b.col
