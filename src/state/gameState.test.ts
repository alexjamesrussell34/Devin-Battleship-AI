import { describe, expect, it } from 'vitest'
import { isShipSunk } from '../engine/board'
import { Coord, FLEET, FLEET_CELLS } from '../engine/types'
import { GameState, activeSpec, createGame, reducer } from './gameState'

const start = (seed = 7): GameState => reducer(reducer(createGame(seed), { type: 'randomize' }), { type: 'start' })

const fireEvery = (state: GameState, actor: 'player' | 'ai'): GameState => {
  let next = state
  for (let row = 0; row < 10 && next.phase === 'playing'; row++) {
    for (let col = 0; col < 10 && next.phase === 'playing'; col++) {
      const coord: Coord = { row, col }
      next = actor === 'player' ? reducer(next, { type: 'player-fire', coord }) : reducer(next, { type: 'ai-fire' })
      // Give the same side the turn back so one fleet can be played to destruction.
      if (next.phase === 'playing') next = { ...next, turn: actor }
    }
  }
  return next
}

describe('placement phase', () => {
  it('advances through the fleet as ships are placed', () => {
    let state = createGame(1)
    expect(activeSpec(state)?.name).toBe('Carrier')
    state = reducer(state, { type: 'place', coord: { row: 0, col: 0 } })
    expect(activeSpec(state)?.name).toBe('Battleship')
    expect(state.status).toBe('Place your Battleship (4).')
  })

  it('rejects an out-of-bounds placement without consuming the ship', () => {
    const state = reducer(createGame(1), { type: 'place', coord: { row: 0, col: 8 } })
    expect(state.placedIndex).toBe(0)
    expect(state.status).toBe('Cannot place the Carrier there.')
  })

  it('rejects an overlapping placement', () => {
    let state = reducer(createGame(1), { type: 'place', coord: { row: 0, col: 0 } })
    state = reducer(state, { type: 'place', coord: { row: 0, col: 2 } })
    expect(state.placedIndex).toBe(1)
    expect(state.status).toBe('Cannot place the Battleship there.')
  })

  it('rotates the orientation', () => {
    const state = reducer(createGame(1), { type: 'rotate' })
    expect(state.orientation).toBe('vertical')
    expect(reducer(state, { type: 'rotate' }).orientation).toBe('horizontal')
  })

  it('randomize places a full legal fleet and undo/clear reverse placement', () => {
    const randomized = reducer(createGame(3), { type: 'randomize' })
    expect(randomized.playerBoard.ships).toHaveLength(FLEET.length)
    expect(randomized.playerBoard.ships.reduce((n, s) => n + s.length, 0)).toBe(FLEET_CELLS)

    const undone = reducer(reducer(createGame(3), { type: 'place', coord: { row: 0, col: 0 } }), {
      type: 'undo-placement',
    })
    expect(undone.placedIndex).toBe(0)
    expect(undone.playerBoard.ships).toHaveLength(0)

    const cleared = reducer(randomized, { type: 'reset-placement' })
    expect(cleared.playerBoard.ships).toHaveLength(0)
  })

  it('refuses to start until the whole fleet is placed', () => {
    expect(reducer(createGame(1), { type: 'start' }).phase).toBe('placement')
    expect(start().phase).toBe('playing')
  })
})

describe('playing phase', () => {
  it('logs hits and misses and hands the turn to the AI', () => {
    const state = reducer(start(), { type: 'player-fire', coord: { row: 0, col: 0 } })
    expect(state.turn).toBe('ai')
    expect(state.log[0].text).toMatch(/^You (hit|missed|sank)/)
  })

  it('rejects a repeat shot and keeps the turn', () => {
    const first = reducer(start(), { type: 'player-fire', coord: { row: 0, col: 0 } })
    const replay = reducer({ ...first, turn: 'player' }, { type: 'player-fire', coord: { row: 0, col: 0 } })
    expect(replay.status).toBe('You already fired there.')
    expect(replay.log).toHaveLength(first.log.length)
  })

  it('ignores player fire while it is the AI turn', () => {
    const afterShot = reducer(start(), { type: 'player-fire', coord: { row: 0, col: 0 } })
    expect(reducer(afterShot, { type: 'player-fire', coord: { row: 5, col: 5 } })).toBe(afterShot)
  })

  it('announces a sink in the status and log', () => {
    const finished = fireEvery(start(11), 'player')
    const sinkEntry = finished.log.find((e) => e.outcome === 'sunk')
    expect(sinkEntry?.text).toMatch(/You sank the \w+ at [A-J]\d+!/)
  })

  it('never re-fires on the same cell when the AI plays out a full game', () => {
    const finished = fireEvery(start(5), 'ai')
    const keys = finished.playerBoard.shots.map((c) => `${c.row},${c.col}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('game over', () => {
  it('ends with the player winning once the enemy fleet is destroyed', () => {
    const finished = fireEvery(start(11), 'player')
    expect(finished.phase).toBe('game-over')
    expect(finished.winner).toBe('player')
    expect(finished.aiBoard.ships.every(isShipSunk)).toBe(true)
    expect(finished.status).toBe('You destroyed the enemy fleet. Victory!')
  })

  it('ends with the AI winning once the player fleet is destroyed', () => {
    const finished = fireEvery(start(5), 'ai')
    expect(finished.phase).toBe('game-over')
    expect(finished.winner).toBe('ai')
    expect(finished.playerBoard.ships.every(isShipSunk)).toBe(true)
  })

  it('play-again returns to a clean placement phase', () => {
    const reset = reducer(fireEvery(start(11), 'player'), { type: 'play-again' })
    expect(reset.phase).toBe('placement')
    expect(reset.placedIndex).toBe(0)
    expect(reset.log).toHaveLength(0)
    expect(reset.winner).toBeNull()
  })
})
