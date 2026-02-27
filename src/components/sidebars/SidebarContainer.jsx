import React, { useEffect, useRef, useState } from 'react';
import { X } from '../../icons';

export default function SidebarContainer({ open, onClose, title, children, icon: Icon }) {
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
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{
          backgroundColor: 'var(--modal-backdrop, rgba(0, 0, 0, 0.45))',
          opacity: open ? 0.5 : 0,
        }}
        onClick={handleBackdropClick}
      />

      {/* Sidebar Panel */}
      <div
        ref={panelRef}
        className={`popup-anim cubic-bezier(0.34, 1.56, 0.64, 1) fixed inset-y-0 right-0 z-[101] w-full max-w-[360px] transform border-l shadow-2xl backdrop-blur-xl transition-transform duration-500 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--modal-surface, var(--glass-bg))',
          borderColor: 'var(--modal-border, var(--glass-border))',
          borderLeftWidth: 'var(--modal-border-width, 1px)',
        }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-6 py-5"
            style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 45%, transparent)' }}
          >
            <div className="flex items-center gap-3">
              {Icon && (
                <div
                  className="rounded-xl p-2"
                  style={{ backgroundColor: 'var(--glass-bg-hover)', color: 'var(--text-primary)' }}
                >
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <h2
                className="text-lg font-bold tracking-wide"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="modal-close transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </>
  );
}
