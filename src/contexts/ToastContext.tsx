import { createContext, useCallback, useContext, useMemo, useState, useRef } from 'react';
import type { ReactNode } from 'react';

type ToastType = 'error' | 'success' | 'info';
type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; type?: ToastType; action?: ToastAction };
type ToastContextValue = {
  addToast: (message: string, type?: ToastType, action?: ToastAction) => void;
  dismissToast: (id: number) => void;
  toasts: Toast[];
};

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION = 4000;
// A toast with a button has to stay long enough to reach it on a wall tablet.
const ACTION_TOAST_DURATION = 8000;
const MAX_TOASTS = 3;

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const useOptionalToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'error', action?: ToastAction) => {
      const id = ++nextId.current;
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, message, type, action }]);
      setTimeout(() => dismissToast(id), action ? ACTION_TOAST_DURATION : TOAST_DURATION);
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({ addToast, dismissToast, toasts }),
    [addToast, dismissToast, toasts]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
