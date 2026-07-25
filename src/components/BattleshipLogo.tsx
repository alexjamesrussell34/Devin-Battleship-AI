/** Header mark: a battleship on the waterline. */
export function BattleshipLogo() {
  return (
    <svg className="logo-ship" viewBox="0 0 96 48" role="img" aria-label="Battleship" focusable="false">
      <path className="logo-ship__hull" d="M8 30h74l-9 11H18z" />
      <rect className="logo-ship__deck" x="12" y="26" width="68" height="4" rx="2" />
      <path className="logo-ship__gun" d="M20 20h9l2 6H19z" />
      <path className="logo-ship__gun" d="M62 20h9l2 6H61z" />
      <rect className="logo-ship__tower" x="38" y="10" width="14" height="16" rx="2" />
      <rect className="logo-ship__tower" x="53" y="17" width="5" height="9" rx="1" />
      <path className="logo-ship__mast" d="M44.2 2h1.8v9h-1.8z" />
      <path className="logo-ship__mast" d="M38 5h14v1.6H38z" />
      <path className="logo-ship__wave" d="M2 44c6 0 6-3 12-3s6 3 12 3 6-3 12-3 6 3 12 3 6-3 12-3 6 3 12 3 6-3 12-3v4H2z" />
    </svg>
  )
}
