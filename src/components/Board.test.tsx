import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { applyShot, createBoard, placeShip } from '../engine/board'
import { Board as BoardModel, Coord, FLEET } from '../engine/types'
import { Board } from './Board'

const carrier = FLEET[0]
const destroyer = FLEET[4]

const withCarrier = (): BoardModel =>
  placeShip(createBoard(), carrier, { row: 0, col: 0 }, 'horizontal') as BoardModel

const sink = (board: BoardModel, cells: Coord[]): BoardModel =>
  cells.reduce((acc, coord) => applyShot(acc, coord).board, board)

describe('Board', () => {
  it('renders a labelled 10x10 grid', () => {
    render(<Board title="Your fleet" board={createBoard()} fogOfWar={false} interactive={false} />)
    expect(screen.getAllByRole('button')).toHaveLength(100)
    expect(screen.getByLabelText('Your fleet A1 water')).toBeInTheDocument()
    expect(screen.getByLabelText('Your fleet J10 water')).toBeInTheDocument()
  })

  it('hides un-hit ships behind fog of war', () => {
    render(<Board title="Enemy waters" board={withCarrier()} fogOfWar interactive={false} />)
    expect(screen.getByLabelText('Enemy waters A1 water')).toBeInTheDocument()
  })

  it('shows own ships and marks hits and misses', () => {
    let board = withCarrier()
    board = applyShot(board, { row: 0, col: 0 }).board
    board = applyShot(board, { row: 5, col: 5 }).board
    render(<Board title="Your fleet" board={board} fogOfWar={false} interactive={false} />)
    expect(screen.getByLabelText('Your fleet A1 hit')).toHaveClass('cell--hit')
    expect(screen.getByLabelText('Your fleet F6 miss')).toHaveClass('cell--miss')
    expect(screen.getByLabelText('Your fleet B1 ship')).toHaveClass('cell--ship')
  })

  it('applies the same preview class to every cell of the ship footprint', () => {
    const preview: Coord[] = [0, 1, 2].map((col) => ({ row: 3, col }))
    const { rerender } = render(
      <Board
        title="Your fleet"
        board={createBoard()}
        fogOfWar={false}
        interactive
        preview={preview}
        previewValid
      />,
    )
    for (const label of ['A4', 'B4', 'C4']) {
      expect(screen.getByLabelText(`Your fleet ${label} water`)).toHaveClass('cell--preview-ok')
    }

    rerender(
      <Board
        title="Your fleet"
        board={createBoard()}
        fogOfWar={false}
        interactive
        preview={preview}
        previewValid={false}
      />,
    )
    for (const label of ['A4', 'B4', 'C4']) {
      expect(screen.getByLabelText(`Your fleet ${label} water`)).toHaveClass('cell--preview-bad')
    }
  })

  it('reports clicks and presses, and disables cells when not interactive', async () => {
    const onCellClick = vi.fn()
    const onCellPress = vi.fn()
    const { rerender } = render(
      <Board
        title="Enemy waters"
        board={createBoard()}
        fogOfWar
        interactive
        onCellClick={onCellClick}
        onCellPress={onCellPress}
      />,
    )
    await userEvent.click(screen.getByLabelText('Enemy waters C3 water'))
    expect(onCellClick).toHaveBeenCalledWith({ row: 2, col: 2 })
    expect(onCellPress).toHaveBeenCalledWith({ row: 2, col: 2 })

    rerender(<Board title="Enemy waters" board={createBoard()} fogOfWar interactive={false} />)
    expect(screen.getByLabelText('Enemy waters C3 water')).toBeDisabled()
  })

  it('draws a wreck silhouette spanning a sunk horizontal ship', () => {
    const sunkBoard = sink(
      withCarrier(),
      Array.from({ length: carrier.length }, (_, col) => ({ row: 0, col })),
    )
    const { container } = render(
      <Board title="Enemy waters" board={sunkBoard} fogOfWar interactive={false} />,
    )
    const wreck = container.querySelector('.ship-wreck') as HTMLElement
    expect(wreck).toBeTruthy()
    expect(wreck.style.gridColumn).toBe('2 / span 5')
    expect(wreck.style.gridRow).toBe('2 / span 1')
    expect(wreck.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 50 20')
    expect(screen.getByLabelText('Enemy waters A1 sunk')).toHaveClass('cell--sunk')
  })

  it('rotates the wreck silhouette for a sunk vertical ship', () => {
    const placed = placeShip(createBoard(), destroyer, { row: 4, col: 6 }, 'vertical') as BoardModel
    const sunkBoard = sink(placed, [
      { row: 4, col: 6 },
      { row: 5, col: 6 },
    ])
    const { container } = render(
      <Board title="Your fleet" board={sunkBoard} fogOfWar={false} interactive={false} />,
    )
    const wreck = container.querySelector('.ship-wreck') as HTMLElement
    expect(wreck.style.gridColumn).toBe('8 / span 1')
    expect(wreck.style.gridRow).toBe('6 / span 2')
    const svg = wreck.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 20 20')
    expect(svg?.querySelector('g')?.getAttribute('transform')).toBe('translate(20 0) rotate(90)')
  })

  it('draws no wreck while a ship is only damaged', () => {
    const damaged = applyShot(withCarrier(), { row: 0, col: 0 }).board
    const { container } = render(
      <Board title="Your fleet" board={damaged} fogOfWar={false} interactive={false} />,
    )
    expect(container.querySelector('.ship-wreck')).toBeNull()
  })
})
