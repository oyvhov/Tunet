import { Suspense } from 'react';
import { DEFAULT_MODAL_OVERLAY_STYLE } from './modalStyles';

const fallback = (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={DEFAULT_MODAL_OVERLAY_STYLE}
  >
    <div
      aria-hidden="true"
      className="popup-anim flex h-12 w-12 items-center justify-center rounded-full border text-white shadow-2xl"
      style={{
        background: 'rgba(15, 23, 42, 0.88)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
      }}
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white"
      />
    </div>
  </div>
);

/**
 * Shared Suspense wrapper for lazy-loaded modals.
 */
export default function ModalSuspense({ children }) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
