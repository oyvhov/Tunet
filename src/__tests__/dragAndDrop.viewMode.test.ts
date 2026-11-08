import type { DragEvent as ReactDragEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createDragAndDropHandlers } from '../utils/dragAndDrop';
import type { DragAndDropOptions } from '../utils/dragAndDrop';

const options = (overrides: Partial<DragAndDropOptions> = {}): DragAndDropOptions => ({
  editMode: false,
  pagesConfig: { home: ['a', 'b', 'c'] },
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

const viewModeStyle = {
  backgroundColor: 'var(--card-bg)',
  borderColor: 'var(--card-border)',
  backdropFilter: 'blur(16px)',
  borderStyle: 'solid',
  borderWidth: '1px',
  borderRadius: 'var(--card-border-radius, 16px)',
  opacity: 1,
  filter: 'none',
  transform: 'none',
  animation: 'none',
  boxShadow: 'none',
  zIndex: 1,
  pointerEvents: 'auto',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

describe('drag and drop in view mode', () => {
  it('returns the same props object for a card', () => {
    const { getDragProps } = createDragAndDropHandlers(options());

    expect(getDragProps({ cardId: 'a', index: 0 })).toBe(getDragProps({ cardId: 'a', index: 0 }));
  });

  it('gives each card its own props', () => {
    const { getDragProps } = createDragAndDropHandlers(options());
    const props = getDragProps({ cardId: 'b', index: 1 });

    expect(props).not.toBe(getDragProps({ cardId: 'a', index: 0 }));
    expect(props['data-card-id']).toBe('b');
    expect(props.draggable).toBe(false);
  });

  it('refreshes the props when a card moves', () => {
    const { getDragProps } = createDragAndDropHandlers(options());
    const first = getDragProps({ cardId: 'a', index: 0 });

    const moved = getDragProps({ cardId: 'a', index: 2 });
    const otherColumn = getDragProps({ cardId: 'a', index: 2, colIndex: 1 });

    expect(moved).not.toBe(first);
    expect(moved['data-index']).toBe(2);
    expect(otherColumn['data-col-index']).toBe(1);
  });

  it('drops against the page configuration it was created with', () => {
    const persistConfig = vi.fn();
    const { getDragProps } = createDragAndDropHandlers(options({ persistConfig }));
    const event = {
      stopPropagation: vi.fn(),
      dataTransfer: { getData: () => JSON.stringify({ index: 0, cardId: 'a' }) },
    } as unknown as ReactDragEvent<HTMLElement>;

    getDragProps({ cardId: 'c', index: 2 }).onDrop(event);

    expect(persistConfig).toHaveBeenCalledWith({ home: ['b', 'c', 'a'] });
  });

  it('shares one frozen style between cards and handler instances', () => {
    const first = createDragAndDropHandlers(options()).getCardStyle({
      cardId: 'a',
      isHidden: false,
      isDragging: false,
    });
    const second = createDragAndDropHandlers(options()).getCardStyle({
      cardId: 'b',
      isHidden: true,
      isDragging: false,
    });

    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first).toEqual(viewModeStyle);
  });

  it('still styles a card that is being dragged', () => {
    const { getCardStyle } = createDragAndDropHandlers(options());

    const style = getCardStyle({ cardId: 'a', isHidden: false, isDragging: true });

    expect(style.transform).toBe('scale(1.08)');
    expect(style.zIndex).toBe(50);
  });

  it('still highlights a touch target', () => {
    const { getCardStyle } = createDragAndDropHandlers(options({ touchTargetId: 'a' }));

    const style = getCardStyle({ cardId: 'a', isHidden: false, isDragging: false });

    expect(style.boxShadow).toContain('rgba(59, 130, 246, 0.6)');
  });
});

describe('drag and drop in edit mode', () => {
  it('builds fresh props for each call', () => {
    const { getDragProps } = createDragAndDropHandlers(options({ editMode: true }));
    const position = { cardId: 'a', index: 0 };

    expect(getDragProps(position)).not.toBe(getDragProps(position));
    expect(getDragProps(position).draggable).toBe(true);
  });

  it('keeps the edit-mode card style', () => {
    const { getCardStyle } = createDragAndDropHandlers(options({ editMode: true }));
    const args = { cardId: 'a', isHidden: true, isDragging: false };

    const style = getCardStyle(args);

    expect(style).not.toBe(getCardStyle(args));
    expect(Object.isFrozen(style)).toBe(false);
    expect(style).toMatchObject({
      borderColor: 'rgba(59, 130, 246, 0.2)',
      borderWidth: '2px',
      opacity: 0.4,
      filter: 'grayscale(100%)',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    });
  });
});
