// Elevation of a front door on graph paper, with the NFC tag at hand height.
// `compact` crops the sheet and enlarges the lettering for phone widths.

export default function DoorDrawing({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={`lp-door-svg${compact ? ' compact' : ''}`}
      viewBox={compact ? '63 27 468 468' : '0 0 540 540'}
      role="img"
      aria-label="Drawing of a front door with an NFC tag on the wall beside it, at hand height."
    >
      {/* title block */}
      <rect className="lp-d-solid" x={378} y={36} width={135} height={81} />
      <path className="lp-d-thin" d="M378 63H513M378 90H513" />
      <text className="lp-d-t lp-d-bold" x={387} y={54}>FRONT DOOR</text>
      <text className="lp-d-t" x={387} y={81}>ELEVATION</text>
      <text className="lp-d-t lp-d-muted" x={387} y={108}>NOT TO SCALE</text>

      {/* door: swing mark, casing, slab, panels, deadbolt, lever */}
      <path className="lp-d-swing" d="M256 104L104 290L256 477" />
      <rect className="lp-d-ln" x={90} y={90} width={180} height={387} />
      <rect className="lp-d-ln" x={104} y={104} width={152} height={373} />
      <rect className="lp-d-thin" x={122} y={126} width={116} height={144} />
      <rect className="lp-d-thin" x={122} y={297} width={116} height={158} />
      <rect className="lp-d-solid" x={233} y={246} width={12} height={12} />
      <rect className="lp-d-solid" x={213} y={290} width={26} height={6} />
      <rect className="lp-d-solid" x={233} y={281} width={12} height={24} />

      {/* floor */}
      <path className="lp-d-ln" d="M27 477H513" />
      <path
        className="lp-d-thin"
        d={Array.from({ length: 27 }, (_, i) => `M${45 + i * 18} 477l-9 9`).join('')}
      />

      {/* the tag, its height, and its label */}
      <rect className="lp-d-solid" x={282} y={279} width={18} height={18} />
      <rect className="lp-d-thin" x={286} y={283} width={10} height={10} />
      <path className="lp-d-thin" d="M300 288H342M333 288V477M327 294l12-12M327 483l12-12" />
      <text className="lp-d-t lp-d-muted lp-d-mid" x={351} y={382} transform="rotate(-90 351 382)">
        HAND HEIGHT
      </text>
      <path className="lp-d-thin" d="M291 279V171H378" />
      <rect className="lp-d-ink" x={288.5} y={276.5} width={5} height={5} />
      <text className="lp-d-t lp-d-bold" x={387} y={175}>NFC TAG</text>
      <text className="lp-d-t lp-d-muted lp-d-plain" x={387} y={193}>tap on the way out</text>
    </svg>
  )
}
