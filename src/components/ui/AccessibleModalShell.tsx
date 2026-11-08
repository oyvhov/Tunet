import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react';
import { opensTouchKeyboard } from '../../utils/touchScreen';
import { normalizeModalOverlayStyle } from './modalStyles';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PRIORITY_FOCUS_SELECTOR =
  '[data-autofocus], [autofocus], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';
const CLOSE_ANIMATION_MS = 160;

export type ModalSize = 's' | 'm' | 'l' | 'xl';

interface ModalShellContextValue {
  titleId: string;
  requestClose: () => void;
}

const ModalShellContext = createContext<ModalShellContextValue | null>(null);

/** Access the surrounding modal shell (title id and animated close), if any. */
export function useModalShell(): ModalShellContextValue | null {
  return useContext(ModalShellContext);
}

interface OpenModal {
  requestClose: () => void;
  isDismissible: () => boolean;
}

// Open modals in opening order; only the top one reacts to Escape and Back.
const openModalStack: OpenModal[] = [];

// Every open dismissible modal owns one history entry. The entries copy the current URL and
// router state, so they are interchangeable and only their number matters.
let modalHistoryEntries = 0;
let modalHistorySyncQueued = false;
let listeningForBack = false;
// Our own history.go() on its way, with the top entry as it was when the call was made.
let pendingHistoryStep: { href: string; state: unknown } | null = null;

function syncModalHistory() {
  // Pushing during a traversal races it, so this runs again when its popstate arrives.
  if (pendingHistoryStep) return;
  const wanted = openModalStack.filter((modal) => modal.isDismissible()).length;
  for (let entry = modalHistoryEntries; entry < wanted; entry += 1) {
    window.history.pushState(window.history.state, '');
  }
  if (wanted < modalHistoryEntries) {
    pendingHistoryStep = { href: window.location.href, state: window.history.state };
    window.history.go(wanted - modalHistoryEntries);
  }
  modalHistoryEntries = wanted;
}

function handleModalPopState(event: PopStateEvent) {
  if (pendingHistoryStep) {
    // Removing our own entries is no navigation, so the router must not see it. If the page
    // changed while a modal was open, only the top entry got the new URL: carry it over.
    event.stopImmediatePropagation();
    const { href, state } = pendingHistoryStep;
    pendingHistoryStep = null;
    if (window.location.href !== href) window.history.replaceState(state, '', href);
    syncModalHistory();
    return;
  }
  if (modalHistoryEntries === 0) return;

  modalHistoryEntries -= 1;
  const top = openModalStack[openModalStack.length - 1];
  if (top?.isDismissible()) top.requestClose();
  else syncModalHistory();
}

/** Runs after the current commit, so popups swapped in one update can share an entry. */
function queueModalHistorySync() {
  if (!listeningForBack) {
    // Capture: at the window this runs before the router's own listener.
    window.addEventListener('popstate', handleModalPopState, true);
    listeningForBack = true;
  }
  if (modalHistorySyncQueued) return;
  modalHistorySyncQueued = true;
  queueMicrotask(() => {
    modalHistorySyncQueued = false;
    syncModalHistory();
  });
}

let lockedBodyStyles: { overflow: string; paddingRight: string } | null = null;

function lockPageScroll() {
  if (lockedBodyStyles) return;
  const { body, documentElement: root } = document;
  lockedBodyStyles = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  // Hiding the scrollbar would widen the page; padding keeps the dashboard still.
  const scrollbarWidth = root.clientWidth > 0 ? window.innerWidth - root.clientWidth : 0;
  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
}

function unlockPageScroll() {
  if (!lockedBodyStyles) return;
  document.body.style.overflow = lockedBodyStyles.overflow;
  document.body.style.paddingRight = lockedBodyStyles.paddingRight;
  lockedBodyStyles = null;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

interface AccessibleModalShellProps {
  open: boolean;
  // Also runs as the overlay click handler, so it can receive a mouse event.
  onClose?: (event?: unknown) => void;
  /** Runs first on Escape, the backdrop and the X; resolve false to keep the popup open. */
  beforeClose?: () => boolean | Promise<boolean>;
  titleId?: string;
  describedBy?: string;
  /** Use the shared popup layout. Without it the overlay/panel classes are used as given. */
  size?: ModalSize;
  placement?: 'center' | 'top';
  /** Stack above another open popup (e.g. a PIN prompt over the alarm popup). */
  nested?: boolean;
  /** No motion and no blur: a solid panel for heavy editors that must stay smooth on tablets. */
  still?: boolean;
  /** False while the popup must stay open (e.g. onboarding): Escape and the backdrop do nothing. */
  dismissible?: boolean;
  overlayClassName?: string;
  overlayStyle?: CSSProperties | null;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  children: (titleId: string) => ReactNode;
}

/**
 * Shared accessible modal shell with dialog semantics, focus management and the
 * popup system's layout (pass `size`). Closing through Escape, the backdrop or
 * `useModalShell().requestClose` plays the exit animation before `onClose` runs.
 */
export default function AccessibleModalShell({
  open,
  onClose,
  beforeClose,
  titleId,
  describedBy,
  size,
  placement = 'center',
  nested = false,
  still = false,
  dismissible = true,
  overlayClassName,
  overlayStyle,
  panelClassName,
  panelStyle,
  children,
}: AccessibleModalShellProps) {
  const fallbackTitleId = useId().replace(/:/g, '');
  const resolvedTitleId = titleId || `modal-title-${fallbackTitleId}`;
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<Element | null>(null);
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const pointerStartedOnOverlayRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    dismissibleRef.current = dismissible;
    queueModalHistorySync();
  }, [dismissible]);

  const beforeCloseRef = useRef(beforeClose);
  useEffect(() => {
    beforeCloseRef.current = beforeClose;
  }, [beforeClose]);

  const requestClose = useCallback(async () => {
    if (closeTimerRef.current || !dismissibleRef.current) return;
    if (beforeCloseRef.current && !(await beforeCloseRef.current())) return;
    if (still || prefersReducedMotion()) {
      onCloseRef.current?.();
      return;
    }
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setClosing(false);
      onCloseRef.current?.();
    }, CLOSE_ANIMATION_MS);
  }, [still]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setClosing(false);
      return undefined;
    }

    const openedNow = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (openedNow) {
      previousActiveRef.current = document.activeElement;
    }

    const openModal: OpenModal = {
      requestClose,
      isDismissible: () => dismissibleRef.current,
    };
    openModalStack.push(openModal);
    queueModalHistorySync();

    lockPageScroll();

    const panel = panelRef.current;
    if (openedNow && panel) {
      const target =
        Array.from(panel.querySelectorAll(PRIORITY_FOCUS_SELECTOR)).find(
          (el) => !opensTouchKeyboard(el)
        ) || panel;
      if (target instanceof HTMLElement) target.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!panelRef.current) return;
      if (openModalStack[openModalStack.length - 1] !== openModal) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
      if (!focusables.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        if (last instanceof HTMLElement) last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        if (first instanceof HTMLElement) first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = openModalStack.indexOf(openModal);
      if (index >= 0) openModalStack.splice(index, 1);
      queueModalHistorySync();
      if (openModalStack.length === 0) unlockPageScroll();
      const previous = previousActiveRef.current;
      if (previous instanceof HTMLElement && !opensTouchKeyboard(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [open, requestClose]);

  if (!open) return null;

  const resolvedOverlayStyle = size
    ? {
        backgroundColor: 'var(--modal-scrim)',
        ...(still
          ? {}
          : {
              backdropFilter: 'blur(var(--modal-blur))',
              WebkitBackdropFilter: 'blur(var(--modal-blur))',
            }),
        ...(overlayStyle || {}),
      }
    : normalizeModalOverlayStyle(overlayStyle);

  const resolvedOverlayClassName = size
    ? [
        'modal-overlay',
        placement === 'top' ? 'modal-overlay--top' : '',
        nested ? 'modal-overlay--nested' : '',
        overlayClassName || '',
      ]
        .filter(Boolean)
        .join(' ')
    : overlayClassName;

  const resolvedPanelClassName = size
    ? [
        'modal-panel',
        `modal-panel--${size}`,
        'popup-anim',
        still ? 'modal-panel--still' : '',
        panelClassName || '',
      ]
        .filter(Boolean)
        .join(' ')
    : panelClassName;

  // Close on a backdrop click only when the press also started on the backdrop,
  // so dragging a slider out of the panel never closes the popup.
  const handleOverlayPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartedOnOverlayRef.current = event.target === event.currentTarget;
  };
  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    const startedOnOverlay = pointerStartedOnOverlayRef.current;
    pointerStartedOnOverlayRef.current = false;
    if (event.target !== event.currentTarget) return;
    if (!startedOnOverlay && event.detail !== 0) return;
    requestClose();
  };

  const tree = (
    <ModalShellContext.Provider value={{ titleId: resolvedTitleId, requestClose }}>
      <div
        className={resolvedOverlayClassName}
        style={resolvedOverlayStyle}
        data-modal-state={still ? 'still' : closing ? 'closing' : 'open'}
        onPointerDown={handleOverlayPointerDown}
        onClick={handleOverlayClick}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={resolvedTitleId}
          aria-describedby={describedBy}
          className={resolvedPanelClassName}
          style={panelStyle}
          onClick={(event) => event.stopPropagation()}
          tabIndex={-1}
        >
          {children(resolvedTitleId)}
        </div>
      </div>
    </ModalShellContext.Provider>
  );

  // A nested popup is usually rendered inside its parent's animated panel, which
  // would confine and clip a fixed overlay, so it goes straight to <body>.
  return nested && typeof document !== 'undefined' ? createPortal(tree, document.body) : tree;
}
