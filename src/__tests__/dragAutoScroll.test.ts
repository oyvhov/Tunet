import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDragAndDropHandlers, getEdgeScrollDelta } from '../utils/dragAndDrop';
import type { DragAndDropOptions, TouchPath } from '../utils/dragAndDrop';

describe('getEdgeScrollDelta', () => {
  it('does nothing away from the edges', () => {
    expect(getEdgeScrollDelta(400, 800)).toBe(0);
  });

  it('scrolls up near the top and down near the bottom', () => {
    expect(getEdgeScrollDelta(5, 800)).toBeLessThan(0);
    expect(getEdgeScrollDelta(795, 800)).toBeGreaterThan(0);
  });

  it('goes faster the closer the finger is to the edge', () => {
    expect(Math.abs(getEdgeScrollDelta(5, 800))).toBeGreaterThan(
      Math.abs(getEdgeScrollDelta(60, 800))
    );
  });
});

describe('touch drag auto-scroll', () => {
  let frames: FrameRequestCallback[];
  const runFrame = () => frames.shift()?.(0);

  const makeOptions = () =>
    ({
      editMode: true,
      pagesConfig: { home: ['a', 'b'] },
      setPagesConfig: vi.fn(),
      persistConfig: vi.fn(),
      activePage: 'home',
      dragSourceRef: { current: null },
      touchTargetRef: { current: null },
      touchSwapCooldownRef: { current: 0 },
      touchPath: null as TouchPath | null,
      setTouchPath: vi.fn(),
      touchTargetId: null,
      setTouchTargetId: vi.fn(),
      setDraggingId: vi.fn(),
      ignoreTouchRef: { current: false },
    }) as DragAndDropOptions;

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {
      frames = [];
    });
    window.scrollBy = vi.fn();
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    document.elementFromPoint = vi.fn(() => null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps scrolling while the finger rests at the bottom edge', () => {
    const handlers = createDragAndDropHandlers(makeOptions());

    handlers.startTouchDrag('a', 0, undefined, 100, 400);
    handlers.updateTouchDrag(100, 795);
    runFrame();
    runFrame();

    expect(window.scrollBy).toHaveBeenCalledTimes(2);
    expect(vi.mocked(window.scrollBy).mock.calls[0][0]).toBe(0);
    expect(vi.mocked(window.scrollBy).mock.calls[0][1]).toBeGreaterThan(0);
  });

  it('does not scroll in the middle of the screen', () => {
    const handlers = createDragAndDropHandlers(makeOptions());

    handlers.startTouchDrag('a', 0, undefined, 100, 400);
    runFrame();

    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('stops when the drag ends', () => {
    const handlers = createDragAndDropHandlers(makeOptions());

    handlers.startTouchDrag('a', 0, undefined, 100, 400);
    handlers.updateTouchDrag(100, 795);
    handlers.resetDragState();
    runFrame();

    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('keeps the loop going when handlers are recreated during the drag', () => {
    const options = makeOptions();
    const first = createDragAndDropHandlers(options);
    first.startTouchDrag('a', 0, undefined, 100, 400);
    const second = createDragAndDropHandlers(options);

    second.updateTouchDrag(100, 795);
    runFrame();

    expect(window.scrollBy).toHaveBeenCalledTimes(1);
    second.resetDragState();
    expect(frames).toHaveLength(0);
  });

  it('rechecks the card under the finger after scrolling', () => {
    const handlers = createDragAndDropHandlers(makeOptions());

    handlers.startTouchDrag('a', 0, undefined, 100, 400);
    handlers.updateTouchDrag(100, 795);
    vi.mocked(document.elementFromPoint).mockClear();
    runFrame();

    expect(document.elementFromPoint).toHaveBeenCalledWith(100, 795);
  });
});
