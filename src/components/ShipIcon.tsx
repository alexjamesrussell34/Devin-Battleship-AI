import { Orientation, ShipName } from '../engine/types'

/** Simple side-on silhouettes, drawn on a 0..N*10 x 0..20 grid (N = ship length). */
const SHAPES: Record<ShipName, { width: number; body: JSX.Element }> = {
  Carrier: {
    width: 50,
    body: (
      <>
        <path d="M2 12h46l-5 5H7z" />
        <rect x="4" y="9" width="42" height="3" rx="1" />
        <rect x="30" y="3" width="5" height="6" rx="1" />
        <rect x="36" y="5" width="2" height="4" />
        <rect x="10" y="6" width="12" height="1.6" rx="0.8" />
      </>
    ),
  },
  Battleship: {
    width: 40,
    body: (
      <>
        <path d="M2 12h36l-4 5H6z" />
        <rect x="16" y="4" width="7" height="8" rx="1" />
        <rect x="19" y="1" width="1.6" height="4" />
        <path d="M7 9h5l1 3H6z" />
        <path d="M27 9h5l1 3h-7z" />
      </>
    ),
  },
  Cruiser: {
    width: 30,
    body: (
      <>
        <path d="M2 12h26l-4 5H5z" />
        <rect x="12" y="5" width="6" height="7" rx="1" />
        <rect x="19" y="7" width="3" height="5" rx="1" />
        <path d="M6 9h4l1 3H6z" />
      </>
    ),
  },
  Submarine: {
    width: 30,
    body: (
      <>
        <rect x="2" y="10" width="26" height="6" rx="3" />
        <path d="M13 5h5l1 5h-7z" />
        <rect x="15" y="2" width="1.4" height="3" />
      </>
    ),
  },
  Destroyer: {
    width: 20,
    body: (
      <>
        <path d="M2 12h16l-3 5H4z" />
        <rect x="8" y="6" width="4" height="6" rx="1" />
        <path d="M4 9h3l0.6 3H4z" />
      </>
    ),
  },
}

export function ShipIcon({ name, sunk = false }: { name: ShipName; sunk?: boolean }) {
  const { width, body } = SHAPES[name]
  return (
    <svg
      className={`ship-icon${sunk ? ' ship-icon--sunk' : ''}`}
      viewBox={`0 0 ${width} 20`}
      style={{ width: `${width / 1.5}px` }}
      role="img"
      aria-label={`${name} silhouette`}
      focusable="false"
    >
      {body}
    </svg>
  )
}

/** Wreck silhouette stretched across the cells a sunk ship occupies. */
export function ShipSilhouette({
  name,
  orientation,
}: {
  name: ShipName
  orientation: Orientation
}) {
  const { width, body } = SHAPES[name]
  const vertical = orientation === 'vertical'
  return (
    <svg
      className="ship-wreck__svg"
      viewBox={vertical ? `0 0 20 ${width}` : `0 0 ${width} 20`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={vertical ? 'translate(20 0) rotate(90)' : undefined}>{body}</g>
    </svg>
  )
}
