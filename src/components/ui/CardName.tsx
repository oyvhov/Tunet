import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * One rule for card names everywhere: wrap only between words, shrink a little when a
 * single word is too wide, and end the word that still does not fit with an ellipsis.
 */
type Fit = '0' | '1' | '2' | 'clip';

const NEXT_FIT: Record<Fit, Fit> = { '0': '1', '1': '2', '2': 'clip', clip: 'clip' };
/** Each step scales the name's own font size (an `em` would scale the parent's instead). */
const FONT_SCALE: Record<Fit, number> = { '0': 1, '1': 0.92, '2': 0.85, clip: 0.85 };

interface CardNameProps {
  children: string;
  className?: string;
  lines?: 1 | 2;
  as?: 'p' | 'span' | 'div' | 'h3';
  style?: CSSProperties;
}

function CardName({ children, className = '', lines = 2, as: Tag = 'p', style }: CardNameProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<{
    text: string;
    fit: Fit;
    pass: number;
    baseSize: number | null;
  }>({
    text: children,
    fit: '0',
    pass: 0,
    baseSize: null,
  });
  const fit: Fit = state.text === children ? state.fit : '0';

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || fit === 'clip') return;
    if (el.scrollWidth > el.clientWidth + 1) {
      // Before the first step the element still has its own size, so read it there.
      const ownSize = fit === '0' ? parseFloat(getComputedStyle(el).fontSize) : null;
      setState((prev) => ({
        text: children,
        fit: NEXT_FIT[fit],
        pass: prev.pass,
        baseSize: ownSize ?? prev.baseSize,
      }));
    }
  }, [children, fit, state.pass]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      setState((prev) => ({ ...prev, fit: '0', pass: prev.pass + 1 }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const baseSize = state.text === children ? state.baseSize : null;
  const shrunkSize =
    fit !== '0' && baseSize ? `${Math.round(baseSize * FONT_SCALE[fit] * 100) / 100}px` : undefined;

  // A two-line name that still overflows keeps its lines; only the word that is too long ends
  // in an ellipsis.
  const wrapClass =
    lines === 1
      ? 'block truncate'
      : `[overflow-wrap:normal] [word-break:normal] line-clamp-2 ${fit === 'clip' ? 'text-ellipsis' : ''}`;

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      data-fit={fit}
      title={children}
      className={`${wrapClass} min-w-0 ${className}`}
      style={{ ...style, fontSize: shrunkSize ?? style?.fontSize }}
    >
      {children}
    </Tag>
  );
}

export default memo(CardName);
