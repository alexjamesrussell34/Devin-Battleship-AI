import { LogEntry } from '../state/gameState'

export function ShotLog({ entries }: { entries: LogEntry[] }) {
  return (
    <section className="shot-log">
      <h2>Shot log</h2>
      {entries.length === 0 ? (
        <p className="shot-log__empty">No shots fired yet.</p>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li key={entry.id} className={`shot-log__item shot-log__item--${entry.outcome}`}>
              <span className="shot-log__actor">{entry.actor === 'player' ? 'YOU' : 'AI'}</span>
              {entry.text}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
