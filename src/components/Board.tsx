import { Board as BoardModel, BOARD_SIZE, Coord, key } from '../engine/types'
import { hasBeenShot, isShipSunk, shipAt } from '../engine/board'

export type CellState = 'water' | 'ship' | 'hit' | 'miss' | 'sunk'

interface BoardProps {
  title: string
  board: BoardModel
  /** Hide un-hit ships (enemy waters). */
  fogOfWar: boolean
  interactive: boolean
  preview?: Coord[]
  previewValid?: boolean
  onCellClick?: (coord: Coord) => void
  onCellHover?: (coord: Coord | null) => void
}

function cellState(board: BoardModel, coord: Coord, fogOfWar: boolean): CellState {
  const ship = shipAt(board, coord)
  const shot = hasBeenShot(board, coord)
  if (shot && ship) return isShipSunk(ship) ? 'sunk' : 'hit'
  if (shot) return 'miss'
  if (ship && !fogOfWar) return 'ship'
  return 'water'
}

const columns = Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i))

export function Board({
  title,
  board,
  fogOfWar,
  interactive,
  preview = [],
  previewValid = true,
  onCellClick,
  onCellHover,
}: BoardProps) {
  const previewKeys = new Set(preview.map(key))

  return (
    <section className="board-panel">
      <h2>{title}</h2>
      <div
        className={`grid${interactive ? ' grid--interactive' : ''}`}
        onMouseLeave={() => onCellHover?.(null)}
      >
        <div className="grid__corner" />
        {columns.map((label) => (
          <div key={`col-${label}`} className="grid__label">
            {label}
          </div>
        ))}
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <div key={`row-${row}`} className="grid__row" role="row">
            <div className="grid__label">{row + 1}</div>
            {Array.from({ length: BOARD_SIZE }, (_, col) => {
              const coord = { row, col }
              const state = cellState(board, coord, fogOfWar)
              const isPreview = previewKeys.has(key(coord))
              return (
                <button
                  key={key(coord)}
                  type="button"
                  className={`cell cell--${state}${
                    isPreview ? (previewValid ? ' cell--preview-ok' : ' cell--preview-bad') : ''
                  }`}
                  disabled={!interactive}
                  aria-label={`${title} ${columns[col]}${row + 1} ${state}`}
                  onClick={() => onCellClick?.(coord)}
                  onMouseEnter={() => onCellHover?.(coord)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
