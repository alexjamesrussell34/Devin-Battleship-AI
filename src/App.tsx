import { useCallback, useEffect, useReducer, useState } from 'react'
import { BattleshipLogo } from './components/BattleshipLogo'
import { Board } from './components/Board'
import { FleetStatus } from './components/FleetStatus'
import { ShotLog } from './components/ShotLog'
import { canPlace, shipCells } from './engine/board'
import { Coord, FLEET } from './engine/types'
import { Turn, activeSpec, createGame, reducer } from './state/gameState'
import { playSound, setSoundEnabled, unlockAudio } from './sound'

const AI_DELAY_MS = 650
const SINK_FLASH_MS = 2200

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createGame())
  const [hover, setHover] = useState<Coord | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const [sinkFlash, setSinkFlash] = useState<{ id: number; text: string; actor: Turn } | null>(null)

  const spec = activeSpec(state)
  const fleetReady = state.placedIndex >= FLEET.length

  useEffect(() => {
    setSoundEnabled(soundOn)
  }, [soundOn])

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r' && state.phase === 'placement') {
        dispatch({ type: 'rotate' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.phase])

  useEffect(() => {
    if (state.phase !== 'playing' || state.turn !== 'ai') return
    const timer = window.setTimeout(() => dispatch({ type: 'ai-fire' }), AI_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [state.phase, state.turn, state.log.length])

  const latest = state.log[0]
  useEffect(() => {
    if (!latest) return
    playSound(latest.outcome === 'sunk' ? 'sunk' : latest.outcome)
    if (latest.outcome === 'sunk') {
      setSinkFlash({ id: latest.id, text: latest.text, actor: latest.actor })
    }
  }, [latest?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sinkFlash) return
    const timer = window.setTimeout(() => setSinkFlash(null), SINK_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [sinkFlash])

  useEffect(() => {
    if (state.phase === 'game-over') playSound(state.winner === 'player' ? 'win' : 'lose')
  }, [state.phase, state.winner])

  const preview =
    state.phase === 'placement' && spec && hover ? shipCells(hover, spec.length, state.orientation) : []
  const previewValid =
    state.phase === 'placement' && spec && hover
      ? canPlace(state.playerBoard, hover, spec.length, state.orientation)
      : false

  // Touch devices have no hover, so pressing paints the preview before the tap commits.
  const isTouch =
    typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches

  const handlePlace = useCallback(
    (coord: Coord) => {
      playSound('place')
      setHover(null)
      dispatch({ type: 'place', coord })
    },
    [dispatch],
  )

  const handleRotate = useCallback(() => dispatch({ type: 'rotate' }), [dispatch])

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__logo">
          <BattleshipLogo />
          <span>Battleship AI</span>
        </h1>
        <div className="app__header-actions">
          <span className={`turn-indicator turn-indicator--${state.phase === 'playing' ? state.turn : state.phase}`}>
            {state.status}
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              unlockAudio()
              setSoundOn((v) => !v)
            }}
          >
            {soundOn ? 'Sound on' : 'Sound off'}
          </button>
        </div>
      </header>

      {state.phase === 'placement' && (
        <div className="controls">
          <span className="controls__hint">
            {spec ? `Placing ${spec.name} (${spec.length}) — ${state.orientation}` : 'Fleet ready'}
          </span>
          <button type="button" className="btn" onClick={handleRotate}>
            Rotate (R)
          </button>
          <button type="button" className="btn" onClick={() => dispatch({ type: 'randomize' })}>
            Randomize
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: 'undo-placement' })}
            disabled={state.placedIndex === 0}
          >
            Undo
          </button>
          <button type="button" className="btn" onClick={() => dispatch({ type: 'reset-placement' })}>
            Clear
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!fleetReady}
            onClick={() => dispatch({ type: 'start' })}
          >
            Start Game
          </button>
        </div>
      )}

      {state.phase === 'game-over' && (
        <div className="controls">
          <span className="controls__hint">
            {state.winner === 'player' ? 'You win!' : 'The AI wins.'}
          </span>
          <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: 'play-again' })}>
            Play again
          </button>
        </div>
      )}

      <main className="boards">
        {sinkFlash && (
          <div
            key={sinkFlash.id}
            className={`sink-flash sink-flash--${sinkFlash.actor}`}
            role="status"
            aria-live="assertive"
          >
            {sinkFlash.text}
          </div>
        )}
        <Board
          title="Your fleet"
          board={state.playerBoard}
          fogOfWar={false}
          interactive={state.phase === 'placement' && !!spec}
          preview={preview}
          previewValid={previewValid}
          onCellClick={handlePlace}
          onCellHover={isTouch ? undefined : setHover}
          onCellPress={isTouch ? setHover : undefined}
        />
        <Board
          title="Enemy waters"
          board={state.aiBoard}
          fogOfWar={state.phase !== 'game-over'}
          interactive={state.phase === 'playing' && state.turn === 'player'}
          onCellClick={(coord) => dispatch({ type: 'player-fire', coord })}
        />
      </main>

      <aside className="sidebar">
        <div className="fleet-statuses">
          <FleetStatus title="Your ships" board={state.playerBoard} />
          {state.phase !== 'placement' && <FleetStatus title="Enemy ships" board={state.aiBoard} />}
        </div>
        <ShotLog entries={state.log} />
      </aside>
    </div>
  )
}
