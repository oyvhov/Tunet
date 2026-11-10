import { useEffect, useRef } from 'react';

/** Share of a chart that must be on screen before it draws in. */
const REVEAL_RATIO = 0.25;
const SETTLE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const RIPPLE_KEYFRAMES: Keyframe[] = [
  { opacity: 0.6, transform: 'translate(-50%, -50%) scale(1)' },
  { opacity: 0, transform: 'translate(-50%, -50%) scale(2.6)' },
];
const RIPPLE_TIMING: KeyframeAnimationOptions = {
  duration: 600,
  delay: 300,
  easing: SETTLE_EASING,
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

/** True when a one-off chart animation on `element` would be seen and is welcome. */
export function canPlayChartMotion(element: Element | null): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    typeof element.animate === 'function' &&
    !document.hidden &&
    !prefersReducedMotion() &&
    element.closest('[data-in-view]') !== null
  );
}

/**
 * Ref callback for a chart's root element. Marks it `data-seen` once enough of it has been
 * on screen (CSS then draws the chart in) and `data-in-view` while any of it is on screen
 * (idle motion only runs then). Attributes are set directly, so scrolling never re-renders.
 */
export function observeChartReveal(element: Element | null): (() => void) | undefined {
  if (!element) return undefined;
  if (typeof IntersectionObserver === 'undefined') {
    element.setAttribute('data-seen', '');
    element.setAttribute('data-in-view', '');
    return undefined;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (
        entries.some(
          (entry) => entry.isIntersecting && (entry.intersectionRatio ?? 1) >= REVEAL_RATIO
        )
      ) {
        element.setAttribute('data-seen', '');
      }
      element.toggleAttribute('data-in-view', Boolean(entries[entries.length - 1]?.isIntersecting));
    },
    { threshold: [0, REVEAL_RATIO] }
  );
  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * Ref for a ripple ring that plays once whenever `value` changes while the chart is on
 * screen. Uses the Web Animations API, so it needs no re-render and stays on the compositor.
 */
export function useValueRipple<T extends HTMLElement>(value: number | null | undefined) {
  const rippleRef = useRef<T>(null);
  const lastValue = useRef(value);

  useEffect(() => {
    const previous = lastValue.current;
    lastValue.current = value;
    if (Object.is(previous, value) || typeof previous !== 'number') return;
    const ripple = rippleRef.current;
    if (canPlayChartMotion(ripple)) ripple.animate(RIPPLE_KEYFRAMES, RIPPLE_TIMING);
  }, [value]);

  return rippleRef;
}

/** Plays a short settle animation (e.g. a slide) on `element` when motion is welcome. */
export function playChartSettle(element: Element | null, keyframes: Keyframe[]) {
  if (canPlayChartMotion(element)) {
    element.animate(keyframes, { duration: 600, easing: SETTLE_EASING });
  }
}
