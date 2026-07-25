import { isShipSunk } from '../engine/board'
import { Board } from '../engine/types'
import { ShipIcon } from './ShipIcon'

export function FleetStatus({ title, board }: { title: string; board: Board }) {
  return (
    <div className="fleet-status">
      <h3>{title}</h3>
      <ul>
        {board.ships.map((ship) => (
          <li key={ship.name} className={isShipSunk(ship) ? 'fleet-status__ship--sunk' : ''}>
            <span className="fleet-status__name">{ship.name}</span>
            <ShipIcon name={ship.name} sunk={isShipSunk(ship)} />
            <span className="fleet-status__health">
              {ship.length - ship.hits}/{ship.length}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
