import { describe, expect, it } from 'vitest'
import {
  applyShot,
  canPlace,
  createBoard,
  isFleetDestroyed,
  placeShip,
  randomFleet,
  shipCells,
} from './board'
import { createRng } from './rng'
import { BOARD_SIZE, FLEET, FLEET_CELLS, key } from './types'

const carrier = FLEET[0]
const destroyer = FLEET[4]

describe('placement validation', () => {
  it('rejects placements that run off the board', () => {
    const board = createBoard()
    expect(canPlace(board, { row: 0, col: 6 }, carrier.length, 'horizontal')).toBe(false)
    expect(canPlace(board, { row: 6, col: 0 }, carrier.length, 'vertical')).toBe(false)
    expect(canPlace(board, { row: 0, col: 5 }, carrier.length, 'horizontal')).toBe(true)
    expect(placeShip(board, carrier, { row: 9, col: 9 }, 'horizontal')).toBeNull()
  })

  it('rejects overlapping placements', () => {
    const board = placeShip(createBoard(), carrier, { row: 3, col: 2 }, 'horizontal')!
    expect(canPlace(board, { row: 3, col: 5 }, destroyer.length, 'horizontal')).toBe(false)
    expect(canPlace(board, { row: 2, col: 4 }, destroyer.length, 'vertical')).toBe(false)
    expect(canPlace(board, { row: 5, col: 2 }, destroyer.length, 'horizontal')).toBe(true)
    expect(placeShip(board, destroyer, { row: 3, col: 6 }, 'horizontal')).toBeNull()
  })

  it('refuses to place the same ship twice', () => {
    const board = placeShip(createBoard(), carrier, { row: 0, col: 0 }, 'horizontal')!
    expect(placeShip(board, carrier, { row: 5, col: 0 }, 'horizontal')).toBeNull()
  })

  it('lays out cells contiguously in the chosen orientation', () => {
    expect(shipCells({ row: 2, col: 3 }, 3, 'horizontal')).toEqual([
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 2, col: 5 },
    ])
    expect(shipCells({ row: 2, col: 3 }, 2, 'vertical')).toEqual([
      { row: 2, col: 3 },
      { row: 3, col: 3 },
    ])
  })

  it('random fleets are always valid across many seeds', () => {
    for (let seed = 0; seed < 500; seed++) {
      const board = randomFleet(createRng(seed))
      expect(board.ships).toHaveLength(FLEET.length)
      const cells = board.ships.flatMap((s) => s.cells)
      expect(cells).toHaveLength(FLEET_CELLS)
      expect(new Set(cells.map(key)).size).toBe(FLEET_CELLS)
      for (const c of cells) {
        expect(c.row).toBeGreaterThanOrEqual(0)
        expect(c.col).toBeGreaterThanOrEqual(0)
        expect(c.row).toBeLessThan(BOARD_SIZE)
        expect(c.col).toBeLessThan(BOARD_SIZE)
      }
    }
  })
})

describe('shot resolution', () => {
  const board = placeShip(createBoard(), destroyer, { row: 4, col: 4 }, 'horizontal')!

  it('reports hits, misses and sinks', () => {
    const miss = applyShot(board, { row: 0, col: 0 })
    expect(miss.result.outcome).toBe('miss')

    const hit = applyShot(board, { row: 4, col: 4 })
    expect(hit.result.outcome).toBe('hit')
    expect(hit.result.sunk).toBeNull()

    const sunk = applyShot(hit.board, { row: 4, col: 5 })
    expect(sunk.result.sunk).toBe('Destroyer')
    expect(sunk.result.sunkCells).toHaveLength(2)
  })

  it('deduplicates shots and leaves the board untouched', () => {
    const first = applyShot(board, { row: 4, col: 4 })
    const repeat = applyShot(first.board, { row: 4, col: 4 })
    expect(repeat.result.outcome).toBe('repeat')
    expect(repeat.board).toBe(first.board)
    expect(repeat.board.shots).toHaveLength(1)
    expect(repeat.board.ships[0].hits).toBe(1)
  })

  it('rejects out-of-bounds shots', () => {
    expect(applyShot(board, { row: -1, col: 0 }).result.outcome).toBe('repeat')
    expect(applyShot(board, { row: 0, col: BOARD_SIZE }).result.outcome).toBe('repeat')
  })
})

describe('win detection', () => {
  it('is only reported once every cell of a full fleet is hit', () => {
    let board = randomFleet(createRng(7))
    const cells = board.ships.flatMap((s) => s.cells)
    expect(isFleetDestroyed(board)).toBe(false)

    cells.forEach((cell, index) => {
      const { board: next, result } = applyShot(board, cell)
      board = next
      expect(result.outcome).toBe('hit')
      expect(result.fleetDestroyed).toBe(index === cells.length - 1)
    })

    expect(isFleetDestroyed(board)).toBe(true)
  })

  it('does not report a win for a partial fleet wiped out', () => {
    let board = placeShip(createBoard(), destroyer, { row: 0, col: 0 }, 'horizontal')!
    board = applyShot(board, { row: 0, col: 0 }).board
    const last = applyShot(board, { row: 0, col: 1 })
    expect(last.result.sunk).toBe('Destroyer')
    expect(last.result.fleetDestroyed).toBe(false)
  })
})
