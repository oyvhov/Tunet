import { useEffect, useRef, useState } from 'react';

const DEFAULT_GLIDE_MS = 200;
const MAX_PRECISION = 4;

export interface GlideNumberOptions {
  /** Milliseconds the count takes. Defaults to 200. */
  duration?: number;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const decimalsOf = (value: number) =>
  Math.min((String(value).split('.')[1] || '').length, MAX_PRECISION);

const canGlide = () => {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return false;
  }
  if (typeof document !== 'undefined' && document.hidden) return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
};

/**
 * Follows `value`, counting smoothly from the previous number to a new one.
 * The first value shows at once; reduced motion, hidden pages and non-numbers jump straight
 * to the new value. In-between values keep the precision of the numbers being counted
 * between, so a value with one decimal never flickers through extra digits.
 */
export function useGlideNumber(
  value: number | null | undefined,
  { duration = DEFAULT_GLIDE_MS }: GlideNumberOptions = {}
): number | null | undefined {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const willGlide =
    !Object.is(shown, value) &&
    isFiniteNumber(shown) &&
    isFiniteNumber(value) &&
    duration > 0 &&
    canGlide();

  useEffect(() => {
    const from = shownRef.current;
    if (Object.is(from, value)) return undefined;
    const show = (next: number | null | undefined) => {
      shownRef.current = next;
      setShown(next);
    };
    if (!isFiniteNumber(from) || !isFiniteNumber(value) || duration <= 0 || !canGlide()) {
      show(value);
      return undefined;
    }

    const factor = 10 ** Math.max(decimalsOf(from), decimalsOf(value));
    let start: number | null = null;
    let frame = 0;
    const step = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / duration);
      if (progress >= 1) {
        show(value);
        return;
      }
      const eased = 1 - (1 - progress) ** 3;
      show(Math.round((from + (value - from) * eased) * factor) / factor);
      frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [value, duration]);

  return willGlide ? shown : value;
}
