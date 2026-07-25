import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { applyShot, createBoard, placeShip } from '../engine/board'
import { Board as BoardModel, FLEET } from '../engine/types'
import { FleetStatus } from './FleetStatus'

const destroyer = FLEET[4]

const board = (): BoardModel =>
  placeShip(createBoard(), destroyer, { row: 0, col: 0 }, 'horizontal') as BoardModel

describe('FleetStatus', () => {
  it('lists each ship with a silhouette and its remaining health', () => {
    render(<FleetStatus title="Your ships" board={board()} />)
    expect(screen.getByRole('img', { name: 'Destroyer silhouette' })).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('marks a sunk ship on both the row and its silhouette', () => {
    let model = board()
    model = applyShot(model, { row: 0, col: 0 }).board
    model = applyShot(model, { row: 0, col: 1 }).board
    const { container } = render(<FleetStatus title="Your ships" board={model} />)
    expect(container.querySelector('li')).toHaveClass('fleet-status__ship--sunk')
    expect(screen.getByRole('img', { name: 'Destroyer silhouette' })).toHaveClass('ship-icon--sunk')
    expect(screen.getByText('0/2')).toBeInTheDocument()
  })
})
