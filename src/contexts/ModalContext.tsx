import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useModals } from '../hooks/useModals';
import type { ModalState, UseModalsResult } from '../types/dashboard';

type ModalActions = Omit<UseModalsResult, keyof ModalState>;

interface ModalStore {
  getSnapshot: () => ModalState;
  subscribe: (listener: () => void) => () => boolean;
  actions: ModalActions;
}

const ModalContext = createContext<ModalStore | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  // useModals.js builds its setters dynamically, so JS inference can't see them.
  const modalStore = useModals() as ModalStore;
  return <ModalContext.Provider value={modalStore}>{children}</ModalContext.Provider>;
}

function useModalStore(): ModalStore {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalState must be used within a ModalProvider');
  }
  return context;
}

export function useModalSelector<T>(selector: (state: ModalState) => T): T {
  const modalStore = useModalStore();
  return useSyncExternalStore(
    modalStore.subscribe,
    () => selector(modalStore.getSnapshot()),
    () => selector(modalStore.getSnapshot())
  );
}

export function useModalActions(): ModalActions {
  return useModalStore().actions;
}

export function useModalState(): UseModalsResult {
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
