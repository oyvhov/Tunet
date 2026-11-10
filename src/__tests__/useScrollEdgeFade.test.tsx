import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getScrollEdgeFade, useScrollEdgeFade } from '../hooks/useScrollEdgeFade';

describe('getScrollEdgeFade', () => {
  it('fades only the edges that hide content', () => {
    expect(getScrollEdgeFade({ scrollLeft: 0, scrollWidth: 300, clientWidth: 300 })).toBe('none');
    expect(getScrollEdgeFade({ scrollLeft: 0, scrollWidth: 600, clientWidth: 300 })).toBe('end');
    expect(getScrollEdgeFade({ scrollLeft: 120, scrollWidth: 600, clientWidth: 300 })).toBe('both');
    expect(getScrollEdgeFade({ scrollLeft: 300, scrollWidth: 600, clientWidth: 300 })).toBe(
      'start'
    );
  });

  it('treats a sub-pixel remainder as the end', () => {
    expect(getScrollEdgeFade({ scrollLeft: 299.5, scrollWidth: 600, clientWidth: 300 })).toBe(
      'start'
    );
  });
});

function Row({ enabled }: { enabled: boolean }) {
  const { ref, fade } = useScrollEdgeFade<HTMLDivElement>(enabled);
  return <div ref={ref} data-testid="row" data-fade={fade} />;
}

const giveSize = (element: HTMLElement, scrollWidth: number, clientWidth: number) => {
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth });
};

describe('useScrollEdgeFade', () => {
  it('follows the scroll position', () => {
    const { rerender } = render(<Row enabled={false} />);
    const row = screen.getByTestId('row');
    giveSize(row, 800, 360);
    rerender(<Row enabled />);
    expect(row).toHaveAttribute('data-fade', 'end');

    row.scrollLeft = 200;
    fireEvent.scroll(row);
    expect(row).toHaveAttribute('data-fade', 'both');

    row.scrollLeft = 440;
    fireEvent.scroll(row);
    expect(row).toHaveAttribute('data-fade', 'start');
  });

  it('stays off when disabled', () => {
    render(<Row enabled={false} />);
    expect(screen.getByTestId('row')).toHaveAttribute('data-fade', 'none');
  });
});
