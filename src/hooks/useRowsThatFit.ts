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
}

/** How many rows end inside the list, keeping room for the "+N more" line when some do not. */
function countRowsThatFit(list: HTMLElement, rowCount: number) {
  const listBox = list.getBoundingClientRect();
  // A list that is not laid out (hidden, or no layout at all) shows everything.
  if (!listBox.height) return rowCount;
  const style = getComputedStyle(list);
  const limit =
    listBox.bottom -
    (parseFloat(style.paddingBottom) || 0) -
    (parseFloat(style.borderBottomWidth) || 0);
  const bottoms = Array.from(list.querySelectorAll<HTMLElement>('[data-fit-row]')).map(
    (row) => row.getBoundingClientRect().bottom
  );
  if (bottoms.length === 0 || bottoms[bottoms.length - 1] <= limit) return bottoms.length;

  const more = list.querySelector<HTMLElement>('[data-fit-more]');
  const reserve = more ? more.getBoundingClientRect().bottom - bottoms[bottoms.length - 1] : 0;
  let count = 0;
  while (count < bottoms.length && bottoms[count] + reserve <= limit) count += 1;
  return count;
}

/**
 * Shows only the rows of a list that fit whole. Rows are the elements marked `data-fit-row`,
 * the "+N more" line is marked `data-fit-more` and must be rendered while `measuring`.
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
    setFit({ list, content, rowCount, ...box, count: countRowsThatFit(list, rowCount) });
  }, [measured, list, content, rowCount, box]);

  return {
    listRef: setList,
    visibleRows: measured ? fit.count : rowCount,
    measuring: list !== null && !measured,
  };
}
