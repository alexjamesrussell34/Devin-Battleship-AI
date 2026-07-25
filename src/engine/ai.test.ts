import { describe, expect, it } from 'vitest'
import { AiState, createAi, isParityCell, nextShot, registerResult } from './ai'
import { applyShot, createBoard, isFleetDestroyed, placeShip, randomFleet } from './board'
import { createRng } from './rng'
import { BOARD_SIZE, Board, Coord, FLEET, key } from './types'

const destroyer = FLEET[4]
const cruiser = FLEET[2]

const fire = (state: AiState, board: Board, coord: Coord) => {
  const { board: nextBoard, result } = applyShot(board, coord)
  return { state: registerResult(state, result), board: nextBoard, result }
}

describe('hunt mode', () => {
  it('only fires on parity cells while hunting', () => {
    let state = createAi()
    let board = randomFleet(createRng(3))
    for (let i = 0; i < 40; i++) {
      const shot = nextShot(state, createRng(i + 1))!
      if (state.mode === 'hunt') expect(isParityCell(shot)).toBe(true)
      const next = fire(state, board, shot)
      state = next.state
      board = next.board
    }
  })

  it('falls back to non-parity cells once the parity set is exhausted', () => {
    let state = createAi()
    const board = createBoard()
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (isParityCell({ row, col })) {
          state = fire(state, board, { row, col }).state
        }
      }
    }
    const shot = nextShot(state, createRng(1))!
    expect(isParityCell(shot)).toBe(false)
  })
})

describe('targeting transitions', () => {
  it('goes hunt -> target on a hit and queues orthogonal neighbours', () => {
    const board = placeShip(createBoard(), cruiser, { row: 5, col: 4 }, 'horizontal')!
    const state = createAi()
    expect(state.mode).toBe('hunt')

    const after = fire(state, board, { row: 5, col: 4 })
    expect(after.state.mode).toBe('target')
    expect(after.state.axis).toBeNull()
    expect(new Set(after.state.targets.map(key))).toEqual(
      new Set(['4,4', '6,4', '5,3', '5,5']),
    )
  })

  it('locks onto an axis after a second hit and extends both ways', () => {
    const board = placeShip(createBoard(), cruiser, { row: 5, col: 4 }, 'horizontal')!
    let s = createAi()
    let b = board
    ;({ state: s, board: b } = fire(s, b, { row: 5, col: 4 }))
    ;({ state: s, board: b } = fire(s, b, { row: 5, col: 5 }))

    expect(s.axis).toBe('horizontal')
    expect(new Set(s.targets.map(key))).toEqual(new Set(['5,3', '5,6']))
    expect(s.targets.every((t) => t.row === 5)).toBe(true)
  })

  it('returns to hunt and clears stale targets when a ship sinks', () => {
    const board = placeShip(createBoard(), destroyer, { row: 0, col: 0 }, 'horizontal')!
    let s = createAi()
    let b = board
    ;({ state: s, board: b } = fire(s, b, { row: 0, col: 0 }))
    expect(s.mode).toBe('target')
    expect(s.targets.length).toBeGreaterThan(0)

    const sinking = fire(s, b, { row: 0, col: 1 })
    expect(sinking.result.sunk).toBe('Destroyer')
    expect(sinking.state.mode).toBe('hunt')
    expect(sinking.state.targets).toEqual([])
    expect(sinking.state.currentHits).toEqual([])
    expect(sinking.state.axis).toBeNull()
  })

  it('keeps hunting a second ship whose targets are unrelated to the sunk one', () => {
    let board = placeShip(createBoard(), destroyer, { row: 0, col: 0 }, 'horizontal')!
    board = placeShip(board, cruiser, { row: 5, col: 5 }, 'vertical')!
    let s = createAi()
    let b = board
    ;({ state: s, board: b } = fire(s, b, { row: 5, col: 5 }))
    ;({ state: s, board: b } = fire(s, b, { row: 0, col: 0 }))
    const sunk = fire(s, b, { row: 0, col: 1 })

    expect(sunk.result.sunk).toBe('Destroyer')
    expect(sunk.state.mode).toBe('target')
    expect(sunk.state.targets.map(key)).toContain('6,5')
  })
})

describe('shot bookkeeping', () => {
  it('never fires at the same cell twice over a full game', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRng(seed)
      let board = randomFleet(createRng(seed + 1000))
      let state = createAi()
      const seen = new Set<string>()

      for (let turn = 0; turn < BOARD_SIZE * BOARD_SIZE; turn++) {
        const shot = nextShot(state, rng)
        expect(shot).not.toBeNull()
        expect(seen.has(key(shot!))).toBe(false)
        seen.add(key(shot!))
        const next = fire(state, board, shot!)
        expect(next.result.outcome).not.toBe('repeat')
        state = next.state
        board = next.board
        if (next.result.fleetDestroyed) break
      }

      expect(isFleetDestroyed(board)).toBe(true)
    }
  })

  it('beats a random baseline on average shots to clear the board', () => {
    const play = (seed: number, useAi: boolean) => {
      const rng = createRng(seed)
      let board = randomFleet(createRng(seed + 500))
      let state = createAi()
      let shots = 0
      for (;;) {
        const coord = useAi
          ? nextShot(state, rng)!
          : (() => {
              let c: Coord
              do {
                c = { row: rng.int(BOARD_SIZE), col: rng.int(BOARD_SIZE) }
              } while (state.shots.has(key(c)))
              return c
            })()
        const next = fire(state, board, coord)
        state = next.state
        board = next.board
        shots++
        if (next.result.fleetDestroyed) return shots
      }
    }

    const seeds = Array.from({ length: 60 }, (_, i) => i)
    const avg = (useAi: boolean) =>
      seeds.reduce((sum, s) => sum + play(s, useAi), 0) / seeds.length

    expect(avg(true)).toBeLessThan(avg(false))
  })
})
