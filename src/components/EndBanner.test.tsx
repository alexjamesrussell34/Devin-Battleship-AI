import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EndBanner } from './EndBanner'

describe('EndBanner', () => {
  it('announces a victory', () => {
    render(<EndBanner winner="player" onPlayAgain={vi.fn()} onDismiss={vi.fn()} />)
    const banner = screen.getByRole('alertdialog', { name: 'You are victorious' })
    expect(banner).toHaveClass('end-banner--win')
    expect(screen.getByText('You are victorious')).toBeInTheDocument()
    expect(screen.getByText('The enemy fleet lies on the seabed.')).toBeInTheDocument()
  })

  it('announces a defeat', () => {
    render(<EndBanner winner="ai" onPlayAgain={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByRole('alertdialog', { name: 'You lost' })).toHaveClass('end-banner--lose')
    expect(screen.getByText('Your fleet has been sent to the depths.')).toBeInTheDocument()
  })

  it('wires up both actions', async () => {
    const onPlayAgain = vi.fn()
    const onDismiss = vi.fn()
    render(<EndBanner winner="player" onPlayAgain={onPlayAgain} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }))
    await userEvent.click(screen.getByRole('button', { name: 'View final board' }))
    expect(onPlayAgain).toHaveBeenCalledOnce()
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
