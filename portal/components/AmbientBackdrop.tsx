/*
 * Ambient orbital-schematic backdrop for the Flight Director's Console.
 *
 * A fixed, non-interactive layer behind all content: a fine blueprint grid
 * across the viewport plus one faint orbital arc set anchored top-right.
 * Pure SVG, zero JS, no animation. Sits at a negative z-index; the page
 * background lives on <html> (see globals.css) so this layer stays visible
 * beneath in-flow content.
 */
export function AmbientBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/*
        Blueprint grid. The spec'd 2-3% opacity is applied to the composite
        grid-on-bg effect: --line is already near --bg (about 1.03:1 in the
        light theme), so the pattern renders at 0.5 layer opacity to stay
        perceptible-but-ambient in both themes instead of vanishing entirely.
      */}
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="tars-blueprint-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 H 0 V 48" fill="none" stroke="var(--line)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tars-blueprint-grid)" opacity="0.5" />
      </svg>
      {/* Orbital arc set — fine concentric ellipses with two orbit nodes, top-right. */}
      <svg
        className="absolute -top-56 -right-64"
        width="1100"
        height="720"
        viewBox="0 0 1100 720"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke="var(--accent)" strokeWidth="1" opacity="0.04" transform="rotate(-18 550 360)">
          <ellipse cx="550" cy="360" rx="520" ry="210" />
          <ellipse cx="550" cy="360" rx="420" ry="168" />
          <ellipse cx="550" cy="360" rx="300" ry="118" />
          <circle cx="1070" cy="360" r="5" fill="var(--accent)" stroke="none" />
          <circle cx="130" cy="360" r="4" fill="var(--accent)" stroke="none" />
        </g>
      </svg>
    </div>
  );
}
