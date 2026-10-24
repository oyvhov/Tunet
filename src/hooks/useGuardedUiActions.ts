import { useCallback } from 'react';

type BooleanSetter = (value: boolean) => void;

interface UseGuardedUiActionsDeps {
  requestSettingsAccess: (onSuccess: () => void) => void;
  editMode: boolean;
  setEditMode: BooleanSetter;
  setShowAddCardModal: BooleanSetter;
  setShowConfigModal: BooleanSetter;
  setShowThemeSidebar: BooleanSetter;
  setShowLayoutSidebar: BooleanSetter;
  setShowHeaderEditModal: BooleanSetter;
  // Closing values (null/false) are forwarded to the setter unchanged.
  setShowEditCardModal: (value: string | null | false) => void;
  toggleCardVisibility: (cardId: string) => void;
  removeCard: (cardId: string, listName?: string) => void;
}

export function useGuardedUiActions(deps: UseGuardedUiActionsDeps) {
  const {
    requestSettingsAccess,
    editMode,
    setEditMode,
    setShowAddCardModal,
    setShowConfigModal,
    setShowThemeSidebar,
    setShowLayoutSidebar,
    setShowHeaderEditModal,
    setShowEditCardModal,
    toggleCardVisibility,
    removeCard,
  } = deps;

  const guardedSetShowEditCardModal = (value: string | null | false) => {
    if (value == null || value === false) {
      setShowEditCardModal(value);
      return;
    }
    requestSettingsAccess(() => {
      setShowEditCardModal(value);
    });
  };

  const applySettingsGuardToBooleanSetter = useCallback(
    (show: boolean, setter: BooleanSetter) => {
      if (!show) {
        setter(false);
        return;
      }
      requestSettingsAccess(() => {
        setter(true);
      });
    },
    [requestSettingsAccess]
  );

  const guardedSetEditMode = useCallback(
    (nextValue: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof nextValue === 'function' ? nextValue(editMode) : nextValue;
      if (!resolved) {
        setEditMode(false);
        return;
      }
      requestSettingsAccess(() => {
        setEditMode(true);
      });
    },
    [editMode, requestSettingsAccess, setEditMode]
  );

  const guardedSetShowAddCardModal = useCallback(
    (show: boolean) => {
      applySettingsGuardToBooleanSetter(show, setShowAddCardModal);
    },
    [applySettingsGuardToBooleanSetter, setShowAddCardModal]
  );

  const guardedSetShowConfigModal = useCallback(
    (show: boolean) => {
      applySettingsGuardToBooleanSetter(show, setShowConfigModal);
    },
    [applySettingsGuardToBooleanSetter, setShowConfigModal]
  );

  const guardedSetShowThemeSidebar = useCallback(
    (show: boolean) => {
      applySettingsGuardToBooleanSetter(show, setShowThemeSidebar);
    },
    [applySettingsGuardToBooleanSetter, setShowThemeSidebar]
  );

  const guardedSetShowLayoutSidebar = useCallback(
    (show: boolean) => {
      applySettingsGuardToBooleanSetter(show, setShowLayoutSidebar);
    },
    [applySettingsGuardToBooleanSetter, setShowLayoutSidebar]
  );

  const guardedSetShowHeaderEditModal = useCallback(
    (show: boolean) => {
      applySettingsGuardToBooleanSetter(show, setShowHeaderEditModal);
    },
    [applySettingsGuardToBooleanSetter, setShowHeaderEditModal]
  );

  const guardedToggleCardVisibility = (cardId: string) => {
    requestSettingsAccess(() => {
      toggleCardVisibility(cardId);
    });
  };

  const guardedRemoveCard = (cardId: string, listName?: string) => {
    requestSettingsAccess(() => {
      removeCard(cardId, listName);
    });
  };

  return {
    guardedSetShowEditCardModal,
    guardedSetEditMode,
    guardedSetShowAddCardModal,
    guardedSetShowConfigModal,
    guardedSetShowThemeSidebar,
    guardedSetShowLayoutSidebar,
    guardedSetShowHeaderEditModal,
    guardedToggleCardVisibility,
    guardedRemoveCard,
  };
}
