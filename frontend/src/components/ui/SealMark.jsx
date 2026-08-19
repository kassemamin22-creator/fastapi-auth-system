// The signature mark: a brass ring of tick marks — like a combination-lock
// dial — turning slowly around a fixed inner vault glyph. Mechanism and
// stillness in one mark. Used small as the nav logo, large in the hero,
// and later reused as a "verified/admin" badge in the dashboard.
export default function SealMark({ size = 40, spinning = true, className = "" }) {
  const ticks = Array.from({ length: 24 });

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Vaultkeep seal"
    >
      <g
        className={spinning ? "animate-slow-spin" : ""}
        style={{ transformOrigin: "50% 50%", transformBox: "fill-box" }}
      >
        {ticks.map((_, i) => (
          <rect
            key={i}
            x="49"
            y="4"
            width="2"
            height="8"
            rx="1"
            fill="var(--color-brass)"
            transform={`rotate(${(i / ticks.length) * 360} 50 50)`}
          />
        ))}
        <circle
          cx="50"
          cy="50"
          r="34"
          fill="none"
          stroke="var(--color-brass)"
          strokeWidth="2"
        />
      </g>
      <circle cx="50" cy="50" r="27" fill="var(--color-ink)" />
      <path
        d="M50 32 L64 40 V56 C64 66 58 72 50 76 C42 72 36 66 36 56 V40 Z"
        fill="none"
        stroke="var(--color-mist)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="52" r="4" fill="var(--color-brass)" />
    </svg>
  );
}
