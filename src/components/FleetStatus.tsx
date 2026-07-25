import { isShipSunk } from '../engine/board'
import { Board } from '../engine/types'

export function FleetStatus({ title, board }: { title: string; board: Board }) {
  return (
    <div className="fleet-status">
      <h3>{title}</h3>
      <ul>
        {board.ships.map((ship) => (
          <li key={ship.name} className={isShipSunk(ship) ? 'fleet-status__ship--sunk' : ''}>
            <span>{ship.name}</span>
            <span>
              {ship.length - ship.hits}/{ship.length}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
