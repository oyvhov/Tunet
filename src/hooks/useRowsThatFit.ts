import { useLayoutEffect, useState } from 'react';

interface Box {
  width: number;
  height: number;
}

interface Fit extends Box {
  list: HTMLElement;
  content: unknown;
  rowCount: number;
  count: number;
  moreFits: boolean;
}

/** Space the "+N more" line keeps from the bottom edge of the list when it uses the padding. */
const MORE_EDGE_GAP = 8;

/**
 * How many rows end inside the list, keeping room for the "+N more" line when some do not.
 * The line may reach into the list's bottom padding. When it leaves no room for any row, the
 * first row is still shown if it fits on its own (padding included), and the line is dropped.
 */
function countRowsThatFit(list: HTMLElement, rowCount: number) {
  const listBox = list.getBoundingClientRect();
  // A list that is not laid out (hidden, or no layout at all) shows everything.
  if (!listBox.height) return { count: rowCount, moreFits: true };
  const style = getComputedStyle(list);
  const paddingBottom = parseFloat(style.paddingBottom) || 0;
  const edge = listBox.bottom - (parseFloat(style.borderBottomWidth) || 0);
  const limit = edge - paddingBottom;
  const moreLimit = edge - Math.min(paddingBottom, MORE_EDGE_GAP);
  const bottoms = Array.from(list.querySelectorAll<HTMLElement>('[data-fit-row]')).map(
    (row) => row.getBoundingClientRect().bottom
  );
  if (bottoms.length === 0 || bottoms[bottoms.length - 1] <= limit) {
    return { count: bottoms.length, moreFits: true };
  }

  const more = list.querySelector<HTMLElement>('[data-fit-more]');
  const reserve = more ? more.getBoundingClientRect().bottom - bottoms[bottoms.length - 1] : 0;
  let count = 0;
  while (
    count < bottoms.length &&
    bottoms[count] <= limit &&
    bottoms[count] + reserve <= moreLimit
  ) {
    count += 1;
  }
  // Better one row in the padding than an empty list.
  if (count === 0 && bottoms[0] <= edge) return { count: 1, moreFits: false };
  return { count, moreFits: true };
}

/**
 * Shows only the rows of a list that fit whole. Rows are the elements marked `data-fit-row`,
 * the "+N more" line is marked `data-fit-more` and must be rendered while `showMore` is true.
 * Measures again when the list is resized or `content` changes.
 */
export function useRowsThatFit(rowCount: number, content: unknown) {
  const [list, setList] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState<Box>({ width: 0, height: 0 });
  const [fit, setFit] = useState<Fit | null>(null);

  useLayoutEffect(() => {
    if (!list || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[entries.length - 1].contentRect;
      setBox((current) =>
        current.width === width && current.height === height ? current : { width, height }
      );
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [list]);

  const measured =
    fit !== null &&
    fit.list === list &&
    fit.content === content &&
    fit.rowCount === rowCount &&
    fit.width === box.width &&
    fit.height === box.height;

  useLayoutEffect(() => {
    if (measured || !list) return;
    setFit({ list, content, rowCount, ...box, ...countRowsThatFit(list, rowCount) });
  }, [measured, list, content, rowCount, box]);

  const measuring = list !== null && !measured;
  const visibleRows = measured ? fit.count : rowCount;
  return {
    listRef: setList,
    visibleRows,
    measuring,
    /** Whether to render the "+N more" line: always while measuring, then when rows are hidden. */
    showMore: measuring || (measured && visibleRows < rowCount && fit.moreFits),
  };
}
