import { useEffect, useId, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { normalizeModalOverlayStyle } from './modalStyles';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PRIORITY_FOCUS_SELECTOR =
  '[data-autofocus], [autofocus], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';

interface AccessibleModalShellProps {
  open: boolean;
  // Also runs as the overlay click handler, so it can receive a mouse event.
  onClose?: (event?: unknown) => void;
  titleId?: string;
  describedBy?: string;
  overlayClassName?: string;
  overlayStyle?: CSSProperties | null;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  children: (titleId: string) => ReactNode;
}

/**
 * Shared accessible modal shell with dialog semantics and focus management.
 * Keep visual styling in each modal by passing overlay/panel classes and styles.
 */
export default function AccessibleModalShell({
  open,
  onClose,
  titleId,
  describedBy,
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

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return undefined;
    }

    const openedNow = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (openedNow) {
      previousActiveRef.current = document.activeElement;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    if (openedNow && panel) {
      const focusables = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      const priorityTarget = panel.querySelector(PRIORITY_FOCUS_SELECTOR);
      const nonCloseTarget = focusables.find((el) => !el.classList.contains('modal-close'));
      const target = priorityTarget || nonCloseTarget || focusables[0] || panel;
      if (target instanceof HTMLElement) target.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!panelRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
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

      if (event.shiftKey && active === first) {
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
      document.body.style.overflow = prevOverflow;
      const previous = previousActiveRef.current;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  if (!open) return null;

  const resolvedOverlayStyle = normalizeModalOverlayStyle(overlayStyle);

  return (
    <div className={overlayClassName} style={resolvedOverlayStyle} onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        aria-describedby={describedBy}
        className={panelClassName}
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {children(resolvedTitleId)}
      </div>
    </div>
  );
}
