import React, { useEffect, useRef, useState } from 'react';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {(e?: any) => void} props.onClose
 * @param {string} props.title
 * @param {React.ReactNode} props.children
 * @param {string} [props.testId]
 * @param {React.ReactNode} [props.navigation]
 * @param {string} [props.closeLabel]
 */
export default function SidebarContainer({
  open,
  onClose,
  title,
  children,
  testId,
  navigation,
  closeLabel = 'Done',
}) {
  const panelRef = useRef(null);
  const [isColorPickerActive, setIsColorPickerActive] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !panelRef.current) return;

    const panel = panelRef.current;

    const updateColorPickerState = () => {
      const active = document.activeElement;
      const isColorInputActive =
        active instanceof window.HTMLInputElement &&
        active.type === 'color' &&
        panel.contains(active);
      setIsColorPickerActive(isColorInputActive);
    };

    const handleFocusIn = () => updateColorPickerState();
    const handleFocusOut = () => {
      setTimeout(updateColorPickerState, 0);
    };

    panel.addEventListener('focusin', handleFocusIn);
    panel.addEventListener('focusout', handleFocusOut);

    return () => {
      panel.removeEventListener('focusin', handleFocusIn);
      panel.removeEventListener('focusout', handleFocusOut);
      setIsColorPickerActive(false);
    };
  }, [open]);

  const handleBackdropClick = () => {
    if (isColorPickerActive) return;
    onClose();
  };

  // Move focus into the panel when it opens and trap Tab inside it, so the
  // keyboard user cannot wander into the dashboard behind the sidebar.
  useEffect(() => {
    if (!open) return undefined;

    const panel = panelRef.current;
    if (!panel) return undefined;

    const previouslyFocused = document.activeElement;
    const focusables = () =>
      Array.from(
        panel.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (el) =>
          el.getAttribute('tabindex') !== '-1' &&
          !el.closest('[inert]') &&
          (el.getClientRects().length > 0 || el === document.activeElement)
      );

    const first = focusables()[0];
    first?.focus();

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    panel.addEventListener('keydown', handleKeyDown);
    return () => {
      panel.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus?.();
    };
  }, [open]);

  // Prevent scroll on body when open - DISABLED for better live preview
  /* 
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  */

  return (
    <>
      {/* Backdrop - Removed blur and reduced opacity so changes can be seen clearly */}
      <div
        className={`tunet-sidebar-backdrop fixed inset-0 z-[100] ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{
          opacity: open ? 0.62 : 0,
        }}
        onClick={handleBackdropClick}
      />

      {/* Sidebar Panel */}
      <div
        ref={panelRef}
        data-testid={testId}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        inert={!open}
        className={`tunet-sidebar popup-anim fixed inset-y-0 right-0 z-[101] w-full max-w-[420px] border-l ${
          open ? 'visible' : 'invisible'
        }`}
        style={{ animation: 'none' }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="tunet-sidebar__header flex flex-none items-center justify-between border-b px-6">
            <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              data-testid="sidebar-done"
              aria-label={closeLabel}
              className="tunet-sidebar__done px-3 text-sm font-medium transition-colors"
            >
              {closeLabel}
            </button>
          </div>

          {navigation}

          {/* Content - Scrollable */}
          <div className="tunet-sidebar__content custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
