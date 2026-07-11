import type { ReactNode } from "react";

/**
 * A lightweight positioned tooltip. Charts render it inside their measured
 * container and drive `x`/`y` from pointer or focus position. Pointer-events are
 * disabled so it never steals hover from the marks underneath.
 */
export function Tooltip({
  x,
  y,
  visible,
  children,
}: {
  x: number;
  y: number;
  visible: boolean;
  children: ReactNode;
}) {
  if (!visible) return null;
  return (
    <div
      role="presentation"
      className="card pointer-events-none absolute z-10 max-w-[260px] rounded-lg px-3 py-2 text-xs leading-relaxed"
      style={{ left: x, top: y, transform: "translate(12px, -50%)" }}
    >
      {children}
    </div>
  );
}
