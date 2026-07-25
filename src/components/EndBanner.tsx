import { Turn } from '../state/gameState'

interface EndBannerProps {
  winner: Turn | null
  onPlayAgain: () => void
  onDismiss: () => void
}

export function EndBanner({ winner, onPlayAgain, onDismiss }: EndBannerProps) {
  const won = winner === 'player'
  const title = won ? 'You are victorious' : 'You lost'
  return (
    <div
      className={`end-banner end-banner--${won ? 'win' : 'lose'}`}
      role="alertdialog"
      aria-label={title}
    >
      <div className="end-banner__inner">
        <p className="end-banner__title">{title}</p>
        <p className="end-banner__subtitle">
          {won ? 'The enemy fleet lies on the seabed.' : 'Your fleet has been sent to the depths.'}
        </p>
        <div className="end-banner__actions">
          <button type="button" className="btn btn--primary" onClick={onPlayAgain}>
            Play again
          </button>
          <button type="button" className="btn btn--ghost" onClick={onDismiss}>
            View final board
          </button>
        </div>
      </div>
    </div>
  )
}
