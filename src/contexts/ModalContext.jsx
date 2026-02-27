import { createContext, useContext } from 'react';
import { useModals } from '../hooks/useModals';

const ModalContext = createContext(null);

/** @param {{ children: import('react').ReactNode }} props */
export function ModalProvider({ children }) {
  const modalState = useModals();
  return <ModalContext.Provider value={modalState}>{children}</ModalContext.Provider>;
}

export function useModalState() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalState must be used within a ModalProvider');
  }
  return context;
}
