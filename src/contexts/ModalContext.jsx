import { createContext, useContext, useSyncExternalStore } from 'react';
import { useModals } from '../hooks/useModals';

const ModalContext = createContext(null);

/** @param {{ children: import('react').ReactNode }} props */
export function ModalProvider({ children }) {
  const modalStore = useModals();
  return <ModalContext.Provider value={modalStore}>{children}</ModalContext.Provider>;
}

function useModalStore() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalState must be used within a ModalProvider');
  }
  return context;
}

export function useModalSelector(selector) {
  const modalStore = useModalStore();
  return useSyncExternalStore(
    modalStore.subscribe,
    () => selector(modalStore.getSnapshot()),
    () => selector(modalStore.getSnapshot())
  );
}

export function useModalActions() {
  return useModalStore().actions;
}

export function useModalState() {
  const modalStore = useModalStore();
  const state = useSyncExternalStore(
    modalStore.subscribe,
    modalStore.getSnapshot,
    modalStore.getSnapshot
  );
  return {
    ...state,
    ...modalStore.actions,
  };
}
