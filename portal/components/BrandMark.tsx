/*
 * TARS orbital brand mark: a core dot, one elliptical orbit ring, and two
 * orbit nodes. Strokes and fills use currentColor so the mark themes with
 * its surrounding text color. Server-component-safe (no hooks, no client).
 */
export function BrandMark({ size = 24, withWordmark = false }: { size?: number; withWordmark?: boolean }) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...(withWordmark ? { "aria-hidden": true } : { role: "img", "aria-label": "TARS" })}
    >
      <g transform="rotate(-30 16 16)">
        <ellipse cx="16" cy="16" rx="13" ry="7" stroke="currentColor" strokeWidth="2" />
        <circle cx="29" cy="16" r="2.25" fill="currentColor" />
        <circle cx="6.05" cy="11.5" r="1.75" fill="currentColor" />
      </g>
      <circle cx="16" cy="16" r="3.75" fill="currentColor" />
    </svg>
  );

  if (!withWordmark) return mark;

  return (
    <span className="inline-flex items-center gap-2">
      {mark}
      <span
        className="font-semibold"
        style={{ fontFamily: "var(--font-mono)", fontSize: size * 0.625, letterSpacing: "0.08em", lineHeight: 1 }}
      >
        TARS
      </span>
    </span>
  );
}
