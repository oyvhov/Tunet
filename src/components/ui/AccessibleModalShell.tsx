import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react';
import { normalizeModalOverlayStyle } from './modalStyles';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PRIORITY_FOCUS_SELECTOR =
  '[data-autofocus], [autofocus], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';
const TEXT_ENTRY_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';
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

// Open modals in opening order; only the top one reacts to Escape.
const openModalStack: symbol[] = [];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function hasCoarsePointerOnly(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(any-pointer: fine)').matches
  );
}

interface AccessibleModalShellProps {
  open: boolean;
  // Also runs as the overlay click handler, so it can receive a mouse event.
  onClose?: (event?: unknown) => void;
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
  }, [dismissible]);

  const requestClose = useCallback(() => {
    if (closeTimerRef.current || !dismissibleRef.current) return;
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

    const stackToken = Symbol('modal');
    openModalStack.push(stackToken);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    if (openedNow && panel) {
      const avoidKeyboard = hasCoarsePointerOnly();
      const candidates = Array.from(panel.querySelectorAll(PRIORITY_FOCUS_SELECTOR)).filter(
        (el) => !(avoidKeyboard && el.matches(TEXT_ENTRY_SELECTOR))
      );
      const target = candidates[0] || panel;
      if (target instanceof HTMLElement) target.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!panelRef.current) return;
      if (openModalStack[openModalStack.length - 1] !== stackToken) return;
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
      const index = openModalStack.indexOf(stackToken);
      if (index >= 0) openModalStack.splice(index, 1);
      document.body.style.overflow = prevOverflow;
      const previous = previousActiveRef.current;
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
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
