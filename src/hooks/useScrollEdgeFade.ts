import { useEffect, useRef, useState } from 'react';

/** Which ends of a horizontal scroller still have content beyond the visible part. */
export type ScrollEdgeFade = 'none' | 'start' | 'end' | 'both';

export function getScrollEdgeFade({
  scrollLeft,
  scrollWidth,
  clientWidth,
}: Pick<HTMLElement, 'scrollLeft' | 'scrollWidth' | 'clientWidth'>): ScrollEdgeFade {
  // A pixel of slack: zoom and fractional widths rarely land exactly on the end.
  const before = scrollLeft > 1;
  const after = scrollLeft + clientWidth < scrollWidth - 1;
  if (before && after) return 'both';
  if (before) return 'start';
  return after ? 'end' : 'none';
}

/**
 * Tracks a horizontal scroller so the edge with more content can fade out
 * (see `.scroll-edge-fade` in dashboard.css). Off when `enabled` is false.
 */
export function useScrollEdgeFade<T extends HTMLElement = HTMLDivElement>(enabled: boolean) {
  const ref = useRef<T | null>(null);
  const [fade, setFade] = useState<ScrollEdgeFade>('none');

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) {
      setFade('none');
      return undefined;
    }
    const update = () => setFade(getScrollEdgeFade(element));
    update();
    element.addEventListener('scroll', update, { passive: true });
    // The row's own size and its pills' sizes both change what is hidden.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (observer) {
      observer.observe(element);
      for (const child of Array.from(element.children)) observer.observe(child);
    }
    return () => {
      element.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [enabled]);

  return { ref, fade };
}
