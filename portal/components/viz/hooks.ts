"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

export interface Size {
  width: number;
  height: number;
}

/**
 * Observe an element's size. Returns a callback ref to attach and the current
 * {width, height}. A callback ref (not a RefObject) so the observer re-attaches
 * whenever the element remounts — e.g. after ChartFrame's table toggle swaps the
 * chart out and back in; an effect with empty deps would keep watching the
 * detached element and the chart would stay stuck on its skeleton.
 */
export function useMeasure<T extends HTMLElement>(): [(el: T | null) => void, Size] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    observer.observe(el);
    observerRef.current = observer;
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
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
