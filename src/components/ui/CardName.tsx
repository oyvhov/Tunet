import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * One rule for card names everywhere: wrap only between words, shrink a little when a
 * single word is too wide, and end the word that still does not fit with an ellipsis.
 */
type Fit = '0' | '1' | '2' | 'clip';

const NEXT_FIT: Record<Fit, Fit> = { '0': '1', '1': '2', '2': 'clip', clip: 'clip' };
const FONT_SCALE: Record<Fit, string | undefined> = {
  '0': undefined,
  '1': '0.92em',
  '2': '0.85em',
  clip: '0.85em',
};

interface CardNameProps {
  children: string;
  className?: string;
  lines?: 1 | 2;
  as?: 'p' | 'span' | 'div' | 'h3';
  style?: CSSProperties;
}

function CardName({ children, className = '', lines = 2, as: Tag = 'p', style }: CardNameProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<{ text: string; fit: Fit; pass: number }>({
    text: children,
    fit: '0',
    pass: 0,
  });
  const fit: Fit = state.text === children ? state.fit : '0';

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || fit === 'clip') return;
    if (el.scrollWidth > el.clientWidth + 1) {
      setState((prev) => ({ text: children, fit: NEXT_FIT[fit], pass: prev.pass }));
    }
  }, [children, fit, state.pass]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      setState((prev) => ({ text: prev.text, fit: '0', pass: prev.pass + 1 }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      style={{ ...style, fontSize: FONT_SCALE[fit] ?? style?.fontSize }}
    >
      {children}
    </Tag>
  );
}

export default memo(CardName);
