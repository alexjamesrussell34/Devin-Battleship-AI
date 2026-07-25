import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the logo mark, both boards and the sidebar', () => {
    render(<App />)
    expect(screen.getByRole('img', { name: 'Battleship' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your fleet' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Enemy waters' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your ships' })).toBeInTheDocument()
    expect(screen.getByText('No shots fired yet.')).toBeInTheDocument()
  })

  it('places a ship by clicking and advances the hint', async () => {
    render(<App />)
    expect(screen.getByText(/Placing Carrier \(5\)/)).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Your fleet A1 water'))
    expect(screen.getByText(/Placing Battleship \(4\)/)).toBeInTheDocument()
    expect(screen.getByLabelText('Your fleet A1 ship')).toBeInTheDocument()
  })

  it('rotates placement with the Rotate button', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Rotate (R)' }))
    expect(screen.getByText(/vertical/)).toBeInTheDocument()
  })

  it('previews the ship footprint on hover', async () => {
    render(<App />)
    await userEvent.hover(screen.getByLabelText('Your fleet A1 water'))
    for (const label of ['A1', 'B1', 'C1', 'D1', 'E1']) {
      expect(screen.getByLabelText(`Your fleet ${label} water`)).toHaveClass('cell--preview-ok')
    }
  })

  it('keeps Start Game disabled until the fleet is placed, then starts the game', async () => {
    render(<App />)
    const startButton = screen.getByRole('button', { name: 'Start Game' })
    expect(startButton).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Randomize' }))
    expect(startButton).toBeEnabled()
    await userEvent.click(startButton)
    expect(screen.getByText('Your turn — fire at will.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Randomize' })).not.toBeInTheDocument()
  })

  it('fires at enemy waters and records the shot in the log', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Randomize' }))
    await userEvent.click(screen.getByRole('button', { name: 'Start Game' }))
    await userEvent.click(screen.getByLabelText('Enemy waters E5 water'))
    const log = screen.getByRole('list', { name: 'Shot log' })
    expect(within(log).getByText(/You (hit|missed|sank).*E5/)).toBeInTheDocument()
  })

  it('toggles sound', async () => {
    render(<App />)
    const toggle = screen.getByRole('button', { name: 'Sound on' })
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Sound off' })).toBeInTheDocument()
  })
})
