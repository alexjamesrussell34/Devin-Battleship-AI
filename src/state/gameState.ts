import { AiState, createAi, nextShot, registerResult } from '../engine/ai'
import { applyShot, createBoard, placeShip, randomFleet, removeShip } from '../engine/board'
import { Rng, createRng } from '../engine/rng'
import {
  Board,
  Coord,
  FLEET,
  Orientation,
  ShipName,
  ShotResult,
  key,
} from '../engine/types'

export type Phase = 'placement' | 'playing' | 'game-over'
export type Turn = 'player' | 'ai'

export interface LogEntry {
  id: number
  actor: Turn
  text: string
  outcome: 'hit' | 'miss' | 'sunk'
}

export interface GameState {
  phase: Phase
  turn: Turn
  playerBoard: Board
  aiBoard: Board
  ai: AiState
  orientation: Orientation
  placedIndex: number
  log: LogEntry[]
  winner: Turn | null
  status: string
  rng: Rng
  nextLogId: number
}

export type Action =
  | { type: 'place'; coord: Coord }
  | { type: 'rotate' }
  | { type: 'randomize' }
  | { type: 'reset-placement' }
  | { type: 'undo-placement' }
  | { type: 'start' }
  | { type: 'player-fire'; coord: Coord }
  | { type: 'ai-fire' }
  | { type: 'play-again' }

export const activeSpec = (state: GameState) =>
  state.placedIndex < FLEET.length ? FLEET[state.placedIndex] : null

export const cellLabel = (c: Coord): string => `${String.fromCharCode(65 + c.col)}${c.row + 1}`

export function createGame(seed: number = Date.now()): GameState {
  const rng = createRng(seed)
  return {
    phase: 'placement',
    turn: 'player',
    playerBoard: createBoard(),
    aiBoard: randomFleet(rng),
    ai: createAi(),
    orientation: 'horizontal',
    placedIndex: 0,
    log: [],
    winner: null,
    status: 'Place your Carrier (5).',
    rng,
    nextLogId: 1,
  }
}

const describe = (actor: Turn, result: ShotResult): string => {
  const who = actor === 'player' ? 'You' : 'Enemy'
  const at = cellLabel(result.coord)
  if (result.sunk) return `${who} sank the ${result.sunk} at ${at}!`
  return result.outcome === 'hit' ? `${who} hit at ${at}.` : `${who} missed at ${at}.`
}

const withLog = (state: GameState, actor: Turn, result: ShotResult): GameState => ({
  ...state,
  log: [
    {
      id: state.nextLogId,
      actor,
      text: describe(actor, result),
      outcome: result.sunk ? 'sunk' : result.outcome === 'hit' ? 'hit' : 'miss',
    },
    ...state.log,
  ],
  nextLogId: state.nextLogId + 1,
})

const placementStatus = (index: number): string => {
  const spec = FLEET[index]
  return spec ? `Place your ${spec.name} (${spec.length}).` : 'Fleet ready — press Start Game.'
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'place': {
      const spec = activeSpec(state)
      if (!spec || state.phase !== 'placement') return state
      const board = placeShip(state.playerBoard, spec, action.coord, state.orientation)
      if (!board) return { ...state, status: `Cannot place the ${spec.name} there.` }
      const placedIndex = state.placedIndex + 1
      return { ...state, playerBoard: board, placedIndex, status: placementStatus(placedIndex) }
    }

    case 'rotate':
      return {
        ...state,
        orientation: state.orientation === 'horizontal' ? 'vertical' : 'horizontal',
      }

    case 'randomize': {
      if (state.phase !== 'placement') return state
      return {
        ...state,
        playerBoard: randomFleet(state.rng, createBoard()),
        placedIndex: FLEET.length,
        status: placementStatus(FLEET.length),
      }
    }

    case 'reset-placement':
      return {
        ...state,
        playerBoard: createBoard(),
        placedIndex: 0,
        status: placementStatus(0),
      }

    case 'undo-placement': {
      if (state.phase !== 'placement' || state.placedIndex === 0) return state
      const placedIndex = state.placedIndex - 1
      const name: ShipName = FLEET[placedIndex].name
      return {
        ...state,
        playerBoard: removeShip(state.playerBoard, name),
        placedIndex,
        status: placementStatus(placedIndex),
      }
    }

    case 'start': {
      if (state.placedIndex < FLEET.length) return state
      return { ...state, phase: 'playing', turn: 'player', status: 'Your turn — fire at will.' }
    }

    case 'player-fire': {
      if (state.phase !== 'playing' || state.turn !== 'player') return state
      const { board, result } = applyShot(state.aiBoard, action.coord)
      if (result.outcome === 'repeat') {
        return { ...state, status: 'You already fired there.' }
      }
      const next = withLog({ ...state, aiBoard: board }, 'player', result)
      if (result.fleetDestroyed) {
        return {
          ...next,
          phase: 'game-over',
          winner: 'player',
          status: 'You destroyed the enemy fleet. Victory!',
        }
      }
      return { ...next, turn: 'ai', status: 'Enemy is taking aim…' }
    }

    case 'ai-fire': {
      if (state.phase !== 'playing' || state.turn !== 'ai') return state
      const coord = nextShot(state.ai, state.rng)
      if (!coord) return { ...state, turn: 'player' }
      const { board, result } = applyShot(state.playerBoard, coord)
      const ai = registerResult(state.ai, result)
      const next = withLog({ ...state, playerBoard: board, ai }, 'ai', result)
      if (result.fleetDestroyed) {
        return {
          ...next,
          phase: 'game-over',
          winner: 'ai',
          status: 'Your fleet has been destroyed. Defeat.',
        }
      }
      return { ...next, turn: 'player', status: 'Your turn — fire at will.' }
    }

    case 'play-again':
      return createGame(Math.floor(state.rng.next() * 2 ** 31))

    default:
      return state
  }
}

export const shotKeys = (board: Board): Set<string> => new Set(board.shots.map(key))
