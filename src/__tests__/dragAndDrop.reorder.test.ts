import type { DragEvent as ReactDragEvent, TouchEvent as ReactTouchEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDragAndDropHandlers } from '../utils/dragAndDrop';
import type { DragAndDropOptions, TouchPath } from '../utils/dragAndDrop';

const HOME = ['a', 'b', 'c'];

const makeOptions = (overrides: Partial<DragAndDropOptions> = {}): DragAndDropOptions => ({
  editMode: true,
  pagesConfig: { home: [...HOME], other: ['x'] },
  setPagesConfig: vi.fn(),
  persistConfig: vi.fn(),
  activePage: 'home',
  dragSourceRef: { current: null },
  touchTargetRef: { current: null },
  touchSwapCooldownRef: { current: 0 },
  touchPath: null,
  setTouchPath: vi.fn(),
  touchTargetId: null,
  setTouchTargetId: vi.fn(),
  setDraggingId: vi.fn(),
  ignoreTouchRef: { current: false },
  ...overrides,
});

// A column of 100px cards, a at y 0-100, b at 100-200 and c at 200-300.
const renderCards = (ids: string[] = HOME) => {
  document.body.innerHTML = '';
  ids.forEach((id, index) => {
    const card = document.createElement('div');
    card.setAttribute('data-card-id', id);
    card.setAttribute('data-index', String(index));
    card.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 100,
        top: index * 100,
        bottom: (index + 1) * 100,
        width: 100,
        height: 100,
      }) as DOMRect;
    document.body.appendChild(card);
  });
};

const cardAt = (id: string) => document.querySelector(`[data-card-id="${id}"]`);

const dropEvent = (data: unknown) =>
  ({
    stopPropagation: vi.fn(),
    dataTransfer: { getData: () => (data === null ? '' : JSON.stringify(data)) },
  }) as unknown as ReactDragEvent<HTMLElement>;

const touchEvent = (target: Element, x = 10, y = 10, cancelable = true) =>
  ({
    target,
    cancelable,
    preventDefault: vi.fn(),
    touches: [{ clientX: x, clientY: y }],
    changedTouches: [{ clientX: x, clientY: y }],
  }) as unknown as ReactTouchEvent<HTMLElement>;

const handleElement = () => {
  const card = document.createElement('div');
  const handle = document.createElement('button');
  handle.setAttribute('data-drag-handle', '');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  handle.appendChild(icon);
  card.appendChild(handle);
  return { card, handle, icon };
};

beforeEach(() => {
  localStorage.clear();
  renderCards();
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1)
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  document.elementFromPoint = vi.fn(() => null);
  vi.spyOn(Date, 'now').mockReturnValue(1000);
});

afterEach(() => {
  createDragAndDropHandlers(makeOptions()).resetDragState();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('mouse drop', () => {
  it.each([
    [0, 'c', 2, ['b', 'c', 'a']],
    [2, 'a', 0, ['c', 'a', 'b']],
    [0, 'b', 1, ['b', 'a', 'c']],
  ])('moves the card at index %d onto %s', (sourceIndex, targetId, targetIndex, expected) => {
    const options = makeOptions();
    const { getDragProps } = createDragAndDropHandlers(options);
    const event = dropEvent({ index: sourceIndex, cardId: HOME[sourceIndex] });

    getDragProps({ cardId: targetId, index: targetIndex }).onDrop(event);

    expect(options.persistConfig).toHaveBeenCalledWith({ home: expected, other: ['x'] });
    expect(options.setDraggingId).toHaveBeenCalledWith(null);
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('does not mutate the current configuration', () => {
    const options = makeOptions();
    const { getDragProps } = createDragAndDropHandlers(options);

    getDragProps({ cardId: 'c', index: 2 }).onDrop(dropEvent({ index: 0, cardId: 'a' }));

    expect(options.pagesConfig.home).toEqual(HOME);
  });

  it('ignores a drop without drag data', () => {
    const options = makeOptions();
    const { getDragProps } = createDragAndDropHandlers(options);

    getDragProps({ cardId: 'c', index: 2 }).onDrop(dropEvent(null));

    expect(options.persistConfig).not.toHaveBeenCalled();
  });

  it('writes to local storage when no persist function is given', () => {
    const options = makeOptions({ persistConfig: null });
    const { getDragProps } = createDragAndDropHandlers(options);

    getDragProps({ cardId: 'c', index: 2 }).onDrop(dropEvent({ index: 0, cardId: 'a' }));

    const expected = { home: ['b', 'c', 'a'], other: ['x'] };
    expect(options.setPagesConfig).toHaveBeenCalledWith(expected);
    expect(JSON.parse(localStorage.getItem('tunet_pages_config') as string)).toEqual(expected);
  });

  it('puts the card position on the drag payload and marks the card dragging', () => {
    vi.useFakeTimers();
    try {
      const options = makeOptions();
      const { getDragProps } = createDragAndDropHandlers(options);
      const dataTransfer = { setData: vi.fn(), effectAllowed: '' };

      getDragProps({ cardId: 'b', index: 1, colIndex: 2 }).onDragStart({
        dataTransfer,
      } as unknown as ReactDragEvent<HTMLElement>);
      vi.runAllTimers();

      expect(JSON.parse(dataTransfer.setData.mock.calls[0][1])).toEqual({
        index: 1,
        cardId: 'b',
        colIndex: 2,
      });
      expect(dataTransfer.effectAllowed).toBe('move');
      expect(options.setDraggingId).toHaveBeenCalledWith('b');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the dragging card when a mouse drag ends without a drop', () => {
    const options = makeOptions();
    const { getDragProps } = createDragAndDropHandlers(options);

    getDragProps({ cardId: 'a', index: 0 }).onDragEnd();

    expect(options.setDraggingId).toHaveBeenCalledWith(null);
    expect(options.persistConfig).not.toHaveBeenCalled();
  });

  it('allows dropping over a card', () => {
    const options = makeOptions();
    const { getDragProps } = createDragAndDropHandlers(options);
    const event = {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: '' },
    } as unknown as ReactDragEvent<HTMLElement>;

    getDragProps({ cardId: 'a', index: 0 }).onDragOver(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.dataTransfer.dropEffect).toBe('move');
  });
});

describe('starting a touch drag', () => {
  it('starts from the drag handle', () => {
    const options = makeOptions();
    const { getDragProps } = createDragAndDropHandlers(options);
    const { handle } = handleElement();
    const event = touchEvent(handle, 30, 40);

    getDragProps({ cardId: 'b', index: 1, colIndex: 0 }).onTouchStart(event);

    expect(options.dragSourceRef.current).toEqual({ index: 1, cardId: 'b', colIndex: 0 });
    expect(options.setDraggingId).toHaveBeenCalledWith('b');
    expect(options.setTouchPath).toHaveBeenCalledWith({ startX: 30, startY: 40, x: 30, y: 40 });
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('starts from an icon inside the drag handle', () => {
    const options = makeOptions();
    const { getDragProps } = createDragAndDropHandlers(options);

    getDragProps({ cardId: 'a', index: 0 }).onTouchStart(touchEvent(handleElement().icon));

    expect(options.dragSourceRef.current?.cardId).toBe('a');
  });

  it('does not start from the card body, so the page can still scroll', () => {
    const options = makeOptions();
    const { getDragProps } = createDragAndDropHandlers(options);
    const event = touchEvent(handleElement().card);

    getDragProps({ cardId: 'a', index: 0 }).onTouchStart(event);

    expect(options.dragSourceRef.current).toBeNull();
    expect(options.setDraggingId).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('does not start outside edit mode', () => {
    const options = makeOptions({ editMode: false });
    const { getDragProps } = createDragAndDropHandlers(options);

    getDragProps({ cardId: 'a', index: 0 }).onTouchStart(touchEvent(handleElement().handle));

    expect(options.dragSourceRef.current).toBeNull();
  });

  it('does not start while touches are being ignored', () => {
    const options = makeOptions({ ignoreTouchRef: { current: true } });
    const { getDragProps } = createDragAndDropHandlers(options);

    getDragProps({ cardId: 'a', index: 0 }).onTouchStart(touchEvent(handleElement().handle));

    expect(options.dragSourceRef.current).toBeNull();
  });

  it('does not call preventDefault on an event that cannot be cancelled', () => {
    const options = makeOptions();
    const { getDragProps } = createDragAndDropHandlers(options);
    const event = touchEvent(handleElement().handle, 1, 1, false);

    getDragProps({ cardId: 'a', index: 0 }).onTouchStart(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(options.dragSourceRef.current?.cardId).toBe('a');
  });

  it('is not started by a touch move alone', () => {
    const options = makeOptions();
    const { getDragProps } = createDragAndDropHandlers(options);
    const event = touchEvent(handleElement().handle);

    getDragProps({ cardId: 'a', index: 0 }).onTouchMove(event);

    expect(options.setTouchPath).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

describe('moving a touch drag', () => {
  it('previews the swap in state without persisting it', () => {
    const options = makeOptions();
    const handlers = createDragAndDropHandlers(options);
    handlers.startTouchDrag('a', 0, undefined, 10, 10);
    vi.mocked(document.elementFromPoint).mockReturnValue(cardAt('c'));

    handlers.updateTouchDrag(10, 250);

    expect(options.setPagesConfig).toHaveBeenCalledWith({
      home: ['b', 'c', 'a'],
      other: ['x'],
    });
    expect(options.setTouchTargetId).toHaveBeenCalledWith('c');
    expect(options.persistConfig).not.toHaveBeenCalled();
    expect(options.dragSourceRef.current?.index).toBe(2);
  });

  it('waits out the swap cooldown', () => {
    const options = makeOptions();
    const handlers = createDragAndDropHandlers(options);
    handlers.startTouchDrag('a', 0, undefined, 10, 10);
    vi.mocked(document.elementFromPoint).mockReturnValue(cardAt('b'));

    handlers.updateTouchDrag(10, 150);
    handlers.updateTouchDrag(10, 151);

    expect(options.setPagesConfig).toHaveBeenCalledTimes(1);

    vi.mocked(Date.now).mockReturnValue(1151);
    handlers.updateTouchDrag(10, 152);

    expect(options.setPagesConfig).toHaveBeenCalledTimes(2);
  });

  it('does nothing over the dragged card itself', () => {
    const options = makeOptions();
    const handlers = createDragAndDropHandlers(options);
    handlers.startTouchDrag('a', 0, undefined, 10, 10);
    vi.mocked(document.elementFromPoint).mockReturnValue(cardAt('a'));

    handlers.updateTouchDrag(10, 20);

    expect(options.setPagesConfig).not.toHaveBeenCalled();
    expect(options.setTouchTargetId).not.toHaveBeenCalledWith('a');
  });
});

describe('dropping a touch drag', () => {
  it('persists the order when released on another card', () => {
    const options = makeOptions();
    const handlers = createDragAndDropHandlers(options);
    handlers.startTouchDrag('a', 0, undefined, 10, 10);

    handlers.performTouchDrop(10, 250);

    expect(options.persistConfig).toHaveBeenCalledWith({
      home: ['b', 'c', 'a'],
      other: ['x'],
    });
  });

  it('picks the nearest card when released between cards', () => {
    renderCards(['a', 'b']);
    const options = makeOptions({ pagesConfig: { home: ['a', 'b'] } });
    const handlers = createDragAndDropHandlers(options);
    handlers.startTouchDrag('a', 0, undefined, 10, 10);

    handlers.performTouchDrop(150, 150);

    expect(options.persistConfig).toHaveBeenCalledWith({ home: ['b', 'a'] });
  });

  it('leaves the order alone when released on the same card without a swap', () => {
    const options = makeOptions();
    const handlers = createDragAndDropHandlers(options);
    handlers.startTouchDrag('a', 0, undefined, 10, 10);

    handlers.performTouchDrop(10, 50);

    expect(options.persistConfig).not.toHaveBeenCalled();
  });

  // In the app the handlers are rebuilt on every state change, so each step below
  // runs on a new instance sharing only the refs. The finger usually ends on the
  // dragged card, which has just moved under it.
  it('persists a previewed swap across rebuilt handlers when released on the dragged card', () => {
    const shared = makeOptions();
    createDragAndDropHandlers(shared).startTouchDrag('a', 0, undefined, 10, 10);

    const moving = { ...shared, touchPath: { startX: 10, startY: 10, x: 10, y: 10 } as TouchPath };
    vi.mocked(document.elementFromPoint).mockReturnValue(cardAt('b'));
    createDragAndDropHandlers(moving).updateTouchDrag(10, 150);
    const previewed = vi.mocked(shared.setPagesConfig).mock.calls[0][0];

    renderCards(['b', 'a', 'c']);
    const releasing = { ...shared, pagesConfig: previewed };
    createDragAndDropHandlers(releasing).performTouchDrop(10, 150);

    expect(shared.persistConfig).toHaveBeenCalledWith({
      home: ['b', 'a', 'c'],
      other: ['x'],
    });
  });

  it('persists a previewed swap when released away from every card', () => {
    const options = makeOptions();
    const handlers = createDragAndDropHandlers(options);
    handlers.startTouchDrag('a', 0, undefined, 10, 10);
    vi.mocked(document.elementFromPoint).mockReturnValue(cardAt('b'));
    handlers.updateTouchDrag(10, 150);

    handlers.performTouchDrop(5000, 5000);

    expect(options.persistConfig).toHaveBeenCalledWith({
      home: ['b', 'a', 'c'],
      other: ['x'],
    });
  });

  it('ignores a drop when no drag is active', () => {
    const options = makeOptions();

    createDragAndDropHandlers(options).performTouchDrop(10, 250);

    expect(options.persistConfig).not.toHaveBeenCalled();
  });

  it('clears the drag state on touch end', () => {
    const options = makeOptions();
    const handlers = createDragAndDropHandlers(options);
    handlers.startTouchDrag('a', 0, undefined, 10, 10);

    handlers.getDragProps({ cardId: 'a', index: 0 }).onTouchEnd(touchEvent(cardAt('c')!, 10, 250));

    expect(options.persistConfig).toHaveBeenCalledTimes(1);
    expect(options.dragSourceRef.current).toBeNull();
    expect(options.setDraggingId).toHaveBeenLastCalledWith(null);
  });
});

describe('cancelling a touch drag', () => {
  const started = (overrides: Partial<DragAndDropOptions> = {}) => {
    const options = makeOptions({
      dragSourceRef: { current: { index: 0, cardId: 'a' } },
      touchTargetRef: { current: { targetId: 'b', targetIndex: 1 } },
      ...overrides,
    });
    return { options, handlers: createDragAndDropHandlers(options) };
  };
  const expectCleared = (options: DragAndDropOptions) => {
    expect(options.dragSourceRef.current).toBeNull();
    expect(options.touchTargetRef.current).toBeNull();
    expect(options.setDraggingId).toHaveBeenLastCalledWith(null);
    expect(options.setTouchTargetId).toHaveBeenLastCalledWith(null);
    expect(options.setTouchPath).toHaveBeenLastCalledWith(null);
  };

  it('resetDragState clears everything without touching the layout', () => {
    const { options, handlers } = started();

    handlers.resetDragState();

    expectCleared(options);
    expect(options.persistConfig).not.toHaveBeenCalled();
  });

  it('touchcancel settles at the last known position, then clears', () => {
    const { options, handlers } = started({
      touchPath: { startX: 10, startY: 10, x: 10, y: 250 },
    });
    const event = touchEvent(cardAt('a')!);

    handlers.getDragProps({ cardId: 'a', index: 0 }).onTouchCancel(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(options.persistConfig).toHaveBeenCalledWith({
      home: ['b', 'c', 'a'],
      other: ['x'],
    });
    expectCleared(options);
  });

  it('touchcancel without a known position only clears', () => {
    const { options, handlers } = started();

    handlers.getDragProps({ cardId: 'a', index: 0 }).onTouchCancel(touchEvent(cardAt('a')!));

    expect(options.persistConfig).not.toHaveBeenCalled();
    expectCleared(options);
  });

  it('touchcancel is ignored when no drag is active', () => {
    const options = makeOptions();
    const { getDragProps } = createDragAndDropHandlers(options);
    const event = touchEvent(cardAt('a')!);

    getDragProps({ cardId: 'a', index: 0 }).onTouchCancel(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(options.setDraggingId).not.toHaveBeenCalled();
  });

  it('a new drag does not inherit a preview from one that was abandoned', () => {
    const options = makeOptions();
    const handlers = createDragAndDropHandlers(options);
    handlers.startTouchDrag('a', 0, undefined, 10, 10);
    vi.mocked(document.elementFromPoint).mockReturnValue(cardAt('b'));
    handlers.updateTouchDrag(10, 150);
    handlers.resetDragState();

    handlers.startTouchDrag('c', 2, undefined, 10, 250);
    handlers.performTouchDrop(10, 250);

    expect(options.persistConfig).not.toHaveBeenCalled();
  });
});
