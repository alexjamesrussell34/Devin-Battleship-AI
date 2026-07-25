import { Board as BoardModel, BOARD_SIZE, Coord, key } from '../engine/types'
import { hasBeenShot, isShipSunk, shipAt } from '../engine/board'
import { ShipSilhouette } from './ShipIcon'

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
  onCellPress?: (coord: Coord) => void
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
  onCellPress,
}: BoardProps) {
  const previewKeys = new Set(preview.map(key))

  return (
    <section className="board-panel">
      <h2>{title}</h2>
      <div
        className={`grid${interactive ? ' grid--interactive' : ''}`}
        onMouseLeave={() => onCellHover?.(null)}
      >
        <div className="grid__corner" style={{ gridArea: '1 / 1' }} />
        {columns.map((label, col) => (
          <div key={`col-${label}`} className="grid__label" style={{ gridArea: `1 / ${col + 2}` }}>
            {label}
          </div>
        ))}
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <div key={`row-${row}`} className="grid__row" role="row">
            <div className="grid__label" style={{ gridArea: `${row + 2} / 1` }}>
              {row + 1}
            </div>
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
                  style={{ gridArea: `${row + 2} / ${col + 2}` }}
                  disabled={!interactive}
                  aria-label={`${title} ${columns[col]}${row + 1} ${state}`}
                  onClick={() => onCellClick?.(coord)}
                  onPointerDown={() => onCellPress?.(coord)}
                  onMouseEnter={() => onCellHover?.(coord)}
                />
              )
            })}
          </div>
        ))}
        {board.ships.filter(isShipSunk).map((ship) => {
          const top = Math.min(...ship.cells.map((c) => c.row))
          const left = Math.min(...ship.cells.map((c) => c.col))
          const horizontal = ship.orientation === 'horizontal'
          return (
            <div
              key={`wreck-${ship.name}`}
              className="ship-wreck"
              style={{
                // +2: the grid's first row/column holds the A-J / 1-10 labels.
                gridColumn: `${left + 2} / span ${horizontal ? ship.length : 1}`,
                gridRow: `${top + 2} / span ${horizontal ? 1 : ship.length}`,
              }}
            >
              <ShipSilhouette name={ship.name} orientation={ship.orientation} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
