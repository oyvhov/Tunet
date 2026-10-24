import type {
  CSSProperties,
  Dispatch,
  DragEvent as ReactDragEvent,
  SetStateAction,
  TouchEvent as ReactTouchEvent,
} from 'react';

export type PagesConfig = Record<string, string[] | undefined>;

export interface DragSource {
  index: number;
  cardId: string;
  colIndex?: number;
}

export interface TouchTarget {
  targetId: string;
  targetIndex: number;
  targetColIndex?: number;
}

export interface TouchPath {
  startX: number;
  startY: number;
  x: number;
  y: number;
}

type MutableRef<T> = { current: T };

export interface DragAndDropOptions {
  editMode: boolean;
  pagesConfig: PagesConfig;
  setPagesConfig: (config: PagesConfig) => void;
  persistConfig?: ((config: PagesConfig) => void) | null;
  activePage: string;
  dragSourceRef: MutableRef<DragSource | null>;
  touchTargetRef: MutableRef<TouchTarget | null>;
  touchSwapCooldownRef: MutableRef<number>;
  touchPath: TouchPath | null;
  setTouchPath: Dispatch<SetStateAction<TouchPath | null>>;
  touchTargetId: string | null;
  setTouchTargetId: (id: string | null) => void;
  setDraggingId: (id: string | null) => void;
  ignoreTouchRef: MutableRef<boolean>;
}

export const safeVibrate = (ms: VibratePattern) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (
        typeof navigator.userActivation !== 'undefined' &&
        !navigator.userActivation.hasBeenActive
      ) {
        return; // Avoid "Blocked call to navigator.vibrate" warning
      }
      navigator.vibrate(ms);
    }
  } catch (_e) {
    // Ignore blocked vibration calls
  }
};

export const createDragAndDropHandlers = ({
  editMode,
  pagesConfig,
  setPagesConfig,
  persistConfig,
  activePage,
  dragSourceRef,
  touchTargetRef,
  touchSwapCooldownRef,
  touchPath,
  setTouchPath,
  touchTargetId,
  setTouchTargetId,
  setDraggingId,
  ignoreTouchRef,
}: DragAndDropOptions) => {
  const pendingTouchConfigRef: MutableRef<PagesConfig | null> = { current: null };
  const touchWorkingConfigRef: MutableRef<PagesConfig | null> = { current: null };

  const saveConfig = (newConfig: PagesConfig) => {
    if (typeof persistConfig === 'function') {
      persistConfig(newConfig);
      return;
    }
    setPagesConfig(newConfig);
    try {
      localStorage.setItem('tunet_pages_config', JSON.stringify(newConfig));
    } catch (error) {
      console.error('Failed to save pages config to localStorage:', error);
    }
  };

  const resetDragState = () => {
    setDraggingId(null);
    dragSourceRef.current = null;
    touchTargetRef.current = null;
    pendingTouchConfigRef.current = null;
    touchWorkingConfigRef.current = null;
    setTouchTargetId(null);
    setTouchPath(null);
  };

  const startTouchDrag = (
    cardId: string,
    index: number,
    colIndex: number | undefined,
    x: number,
    y: number
  ) => {
    if (!editMode) return;
    safeVibrate(50);
    dragSourceRef.current = { index, cardId, colIndex };
    touchTargetRef.current = null;
    pendingTouchConfigRef.current = null;
    touchWorkingConfigRef.current = {
      ...pagesConfig,
      [activePage]: [...(pagesConfig[activePage] || [])],
    };
    setTouchPath({ startX: x, startY: y, x, y });
    setTouchTargetId(null);
    setDraggingId(cardId);
  };

  const moveCard = ({ source, targetIndex }: { source: DragSource; targetIndex: number }) => {
    const baseConfig = touchWorkingConfigRef.current || pagesConfig;
    const newConfig: PagesConfig = { ...baseConfig };
    const currentList = [...(newConfig[activePage] || [])];
    const [movedItem] = currentList.splice(source.index, 1);
    currentList.splice(targetIndex, 0, movedItem);
    newConfig[activePage] = currentList;
    source.index = targetIndex;
    touchWorkingConfigRef.current = newConfig;

    return { newConfig, source };
  };

  const updateTouchDrag = (x: number, y: number) => {
    if (!editMode || !dragSourceRef.current) return;
    setTouchPath((prev) => (prev ? { ...prev, x, y } : { startX: x, startY: y, x, y }));
    const el = document.elementFromPoint(x, y);
    const cardEl = el?.closest?.('[data-card-id]');

    if (!cardEl) return;

    const targetId = cardEl.getAttribute('data-card-id');
    // A missing attribute yields parseInt(null) === NaN, same as before typing.
    const targetIndex = parseInt(cardEl.getAttribute('data-index') as string);
    const targetColIndexStr = cardEl.getAttribute('data-col-index');
    const targetColIndex = targetColIndexStr ? parseInt(targetColIndexStr) : undefined;

    if (!targetId || targetId === dragSourceRef.current.cardId) return;

    touchTargetRef.current = { targetId, targetIndex, targetColIndex };
    setTouchTargetId(targetId);

    const now = Date.now();
    if (now - touchSwapCooldownRef.current <= 150) return;
    touchSwapCooldownRef.current = now;

    const { newConfig, source } = moveCard({
      source: dragSourceRef.current,
      targetIndex,
    });

    dragSourceRef.current = source;
    pendingTouchConfigRef.current = newConfig;
    setPagesConfig(newConfig);
    safeVibrate(10);
  };

  const performTouchDrop = (x: number, y: number) => {
    if (!dragSourceRef.current) return;

    const cards = Array.from(document.querySelectorAll('[data-card-id]'));
    let cardElement = cards.find((card) => {
      const rect = card.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });

    if (!cardElement) {
      let minDist = Infinity;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < 220 && dist < minDist) {
          minDist = dist;
          cardElement = card;
        }
      });
    }

    if (!cardElement && touchTargetRef.current) {
      cardElement = cards.find(
        // Checked non-null by the enclosing if; find() runs synchronously.
        (card) => card.getAttribute('data-card-id') === touchTargetRef.current!.targetId
      );
    }

    if (!cardElement) {
      if (pendingTouchConfigRef.current) {
        saveConfig(pendingTouchConfigRef.current);
      }
      return;
    }

    const targetId = cardElement.getAttribute('data-card-id');
    // A missing attribute yields parseInt(null) === NaN, same as before typing.
    const targetIndex = parseInt(cardElement.getAttribute('data-index') as string);
    const targetColIndexStr = cardElement.getAttribute('data-col-index');
    const _targetColIndex = targetColIndexStr ? parseInt(targetColIndexStr) : undefined;

    if (!targetId || targetId === dragSourceRef.current.cardId) {
      if (pendingTouchConfigRef.current) {
        saveConfig(pendingTouchConfigRef.current);
      }
      return;
    }

    const { newConfig } = moveCard({
      source: dragSourceRef.current,
      targetIndex,
    });

    saveConfig(newConfig);
    pendingTouchConfigRef.current = null;
    touchWorkingConfigRef.current = null;
    safeVibrate(20);
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLElement>) => {
    if (!editMode || !dragSourceRef.current) return;
    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    performTouchDrop(x, y);
    resetDragState();
  };

  const handleTouchCancel = (e: ReactTouchEvent<HTMLElement>) => {
    if (!editMode || !dragSourceRef.current) return;
    if (e.cancelable) e.preventDefault();
    const x = touchPath?.x;
    const y = touchPath?.y;
    if (typeof x === 'number' && typeof y === 'number') {
      performTouchDrop(x, y);
    }
    resetDragState();
  };

  const getDragProps = ({
    cardId,
    index,
    colIndex,
  }: {
    cardId: string;
    index: number;
    colIndex?: number;
  }) => ({
    draggable: editMode,
    onDragStart: (e: ReactDragEvent<HTMLElement>) => {
      e.dataTransfer.setData('dragData', JSON.stringify({ index, cardId, colIndex }));
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => setDraggingId(cardId), 0);
    },
    onDragEnd: () => setDraggingId(null),
    onDragOver: (e: ReactDragEvent<HTMLElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    onDrop: (e: ReactDragEvent<HTMLElement>) => {
      e.stopPropagation();
      const rawData = e.dataTransfer.getData('dragData');
      if (!rawData) return;
      const source: DragSource = JSON.parse(rawData);

      const newConfig: PagesConfig = { ...pagesConfig };
      const currentList = [...(newConfig[activePage] || [])];
      const movedItem = currentList.splice(source.index, 1)[0];
      currentList.splice(index, 0, movedItem);
      newConfig[activePage] = currentList;

      saveConfig(newConfig);
      setDraggingId(null);
    },
    onTouchStart: (e: ReactTouchEvent<HTMLElement>) => {
      if (ignoreTouchRef.current) return;
      if (!editMode) return;
      // Touch targets inside a card are always elements.
      if (!(e.target as Element).closest('[data-drag-handle]')) return;
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      startTouchDrag(cardId, index, colIndex, touch.clientX, touch.clientY);
    },
    onTouchMove: (e: ReactTouchEvent<HTMLElement>) => {
      if (ignoreTouchRef.current) return;
      if (!editMode || !dragSourceRef.current) return;
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      updateTouchDrag(touch.clientX, touch.clientY);
    },
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    'data-card-id': cardId,
    'data-index': index,
    'data-col-index': colIndex,
  });

  const getCardStyle = ({
    cardId,
    isHidden,
    isDragging,
  }: {
    cardId: string;
    isHidden: boolean;
    isDragging: boolean;
  }) => {
    const isTouchTarget = !!touchTargetId && touchTargetId === cardId;

    const style: CSSProperties = {
      backgroundColor: isDragging ? 'rgba(30, 58, 138, 0.6)' : 'var(--card-bg)',
      borderColor: isDragging
        ? 'rgba(96, 165, 250, 1)'
        : editMode
          ? 'rgba(59, 130, 246, 0.2)'
          : 'var(--card-border)',
      backdropFilter: 'blur(16px)',
      borderStyle: 'solid',
      borderWidth: editMode ? '2px' : '1px',
      borderRadius: 'var(--card-border-radius, 16px)',
      opacity: isHidden && editMode ? 0.4 : 1,
      filter: isHidden && editMode ? 'grayscale(100%)' : 'none',
      transform: isDragging ? 'scale(1.08)' : 'none',
      animation: 'none',
      boxShadow: isDragging
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        : isTouchTarget
          ? '0 0 0 2px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.35)'
          : editMode
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            : 'none',
      zIndex: isDragging ? 50 : 1,
      pointerEvents: isDragging ? 'none' : 'auto',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    return style;
  };

  return {
    getDragProps,
    getCardStyle,
    isTouchTarget: (cardId: string) => !!touchTargetId && touchTargetId === cardId,
    startTouchDrag,
    updateTouchDrag,
    performTouchDrop,
    resetDragState,
  };
};
