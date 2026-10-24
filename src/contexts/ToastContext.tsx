import { createContext, useCallback, useContext, useMemo, useState, useRef } from 'react';
import type { ReactNode } from 'react';

type ToastType = 'error' | 'success' | 'info';
type Toast = { id: number; message: string; type?: ToastType };
type ToastContextValue = { addToast: (message: string, type?: ToastType) => void; toasts: Toast[] };

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION = 4000;
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

  const addToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const value = useMemo(() => ({ addToast, toasts }), [addToast, toasts]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
