import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRowsThatFit } from '../hooks/useRowsThatFit';

// Layout in jsdom is empty, so each element reports the box written in its data attributes.
const rect = (top: number, bottom: number) =>
  ({
    top,
    bottom,
    height: bottom - top,
    left: 0,
    right: 100,
    width: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
  this: HTMLElement
) {
  return rect(Number(this.dataset.top || 0), Number(this.dataset.bottom || 0));
});

afterEach(() => {
  document.body.innerHTML = '';
});

interface ListProps {
  /** Bottom edge of the list box; its bottom padding is 20 px. */
  listBottom: number;
  /** Bottom edge of each row, measured from a list top of 0. */
  rowBottoms: number[];
  /** Height the "+N more" line adds below the last rendered row. */
  moreHeight?: number;
}

function List({ listBottom, rowBottoms, moreHeight = 30 }: ListProps) {
  const { listRef, visibleRows, measuring, showMore } = useRowsThatFit(
    rowBottoms.length,
    rowBottoms
  );
  const shown = rowBottoms.slice(0, visibleRows);
  const lastBottom = shown.length ? shown[shown.length - 1] : 0;
  return (
    <div
      ref={listRef}
      data-top="0"
      data-bottom={listBottom}
      style={{ paddingBottom: '20px' }}
      data-testid="list"
    >
      {shown.map((bottom, index) => (
        <div key={index} data-fit-row="" data-top={bottom - 40} data-bottom={bottom}>
          row {index + 1}
        </div>
      ))}
      {showMore && (
        <p data-fit-more="" data-top={lastBottom} data-bottom={lastBottom + moreHeight}>
          {measuring ? 'measuring' : `+${rowBottoms.length - visibleRows}`}
        </p>
      )}
    </div>
  );
}

describe('useRowsThatFit', () => {
  it('shows every row and no "+N" line when all rows fit', () => {
    render(<List listBottom={300} rowBottoms={[60, 120, 180]} />);
    expect(screen.getAllByText(/^row/)).toHaveLength(3);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('hides rows that would end below the list and counts them', () => {
    render(<List listBottom={200} rowBottoms={[60, 120, 180, 240]} />);
    expect(screen.getAllByText(/^row/)).toHaveLength(2);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('lets the "+N" line use the bottom padding of the list', () => {
    // Content ends at 180; row 2 ends at 150 and the line ends at 190, inside the 20 px padding.
    render(<List listBottom={200} rowBottoms={[100, 150, 230]} moreHeight={40} />);
    expect(screen.getAllByText(/^row/)).toHaveLength(2);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('keeps the first row when it fits alone, and drops a "+N" line with no room', () => {
    // The first row ends at 130 of a 134 px content box; the line would end at 161, past 154.
    render(<List listBottom={154} rowBottoms={[130, 230, 330]} moreHeight={31} />);
    expect(screen.getAllByText(/^row/)).toHaveLength(1);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('lets a lone first row use the bottom padding rather than show an empty list', () => {
    // The first row ends at 148: past the 134 px content box, inside the 154 px list.
    render(<List listBottom={154} rowBottoms={[148, 248]} moreHeight={31} />);
    expect(screen.getAllByText(/^row/)).toHaveLength(1);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('shows only the "+N" line when not even the first row fits', () => {
    render(<List listBottom={154} rowBottoms={[180, 280]} moreHeight={31} />);
    expect(screen.queryAllByText(/^row/)).toHaveLength(0);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
