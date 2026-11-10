import { useGlideNumber } from '../../hooks/useGlideNumber';

interface GlideNumberProps {
  /** The number to show. A new value is counted to in at most `duration` ms. */
  value: number | null | undefined;
  /** Turns the (possibly in-between) number into text, e.g. with units-aware rounding. */
  format?: (value: number) => string;
  /** Text shown when `value` is not a finite number. */
  fallback?: string;
  duration?: number;
}

/** A number that glides to new values. Renders text only, so it fits inside any element. */
export default function GlideNumber({
  value,
  format = String,
  fallback = '--',
  duration,
}: GlideNumberProps) {
  const shown = useGlideNumber(value, { duration });
  return typeof shown === 'number' && Number.isFinite(shown) ? format(shown) : fallback;
}
