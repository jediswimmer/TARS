"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * True only after the first client commit. Force-graph layouts run a synchronous
 * simulation that must NOT run during SSR (it would hydrate-mismatch), so charts
 * render a skeleton until `useMounted()` flips true.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** SSR-safe layout effect (falls back to useEffect on the server). */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface Size {
  width: number;
  height: number;
}

/**
 * Observe an element's size. Returns a ref to attach and the current {width,
 * height}; charts use the width to lay out responsively without a fixed viewBox.
 */
export function useMeasure<T extends HTMLElement>(): [RefObject<T | null>, Size] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

/** Tracks the `prefers-reduced-motion` media query — charts kill flow animation when true. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
