"use client";

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";

interface VizTooltipProps {
  /** Chart-local X (relative to container) */
  x: number;
  /** Chart-local Y (relative to container) */
  y: number;
  children: ReactNode;
  visible: boolean;
  /** Chart stage — tooltip is positioned and clamped inside this box. */
  containerRef: RefObject<HTMLElement | null>;
}

/**
 * Floating tooltip anchored in chart-local coordinates and clamped so it
 * never crosses the stage boundary (avoids overflow clipping).
 */
export function VizTooltip({ x, y, children, visible, containerRef }: VizTooltipProps) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!visible) {
      setPos(null);
      return;
    }
    const container = containerRef.current;
    const tip = tipRef.current;
    if (!container || !tip) return;

    const pad = 10;
    const gap = 14;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const tipW = Math.min(tip.offsetWidth || 260, cw - pad * 2);
    const tipH = tip.offsetHeight || 120;

    let left = x + gap;
    if (left + tipW > cw - pad) left = x - tipW - gap;

    let top = y + gap;
    if (top + tipH > ch - pad) top = y - tipH - gap;

    left = Math.max(pad, Math.min(left, cw - tipW - pad));
    top = Math.max(pad, Math.min(top, Math.max(pad, ch - tipH - pad)));

    setPos({ left, top });
  }, [visible, x, y, containerRef]);

  if (!visible) return null;

  return (
    <div
      ref={tipRef}
      role="tooltip"
      className="pointer-events-none absolute z-20 max-w-[260px] rounded-[10px] border border-(--line) bg-(--panel-elevated) px-3 py-2 text-[13px] text-(--ink) shadow-(--shadow)"
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {children}
    </div>
  );
}
