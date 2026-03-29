import { createContext, useCallback, useContext, useState, useRef } from 'react';

/** @typedef {{ id: number, message: string, type?: 'error' | 'success' | 'info' }} Toast */
/** @typedef {{ addToast: (message: string, type?: 'error' | 'success' | 'info') => void, toasts: Toast[] }} ToastContextValue */

const ToastContext = createContext(null);
const TOAST_DURATION = 4000;
const MAX_TOASTS = 3;

/** @returns {ToastContextValue} */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const addToast = useCallback((message, type = 'error') => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  return <ToastContext.Provider value={{ addToast, toasts }}>{children}</ToastContext.Provider>;
}
