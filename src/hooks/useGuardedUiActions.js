import { useCallback } from 'react';

/** @param {Record<string, unknown>} deps */
export function useGuardedUiActions(deps) {
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

  const guardedSetShowEditCardModal = (value) => {
    if (value == null || value === false) {
      setShowEditCardModal(value);
      return;
    }
    requestSettingsAccess(() => {
      setShowEditCardModal(value);
    });
  };

  const applySettingsGuardToBooleanSetter = useCallback(
    (show, setter) => {
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
    (nextValue) => {
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
    (show) => {
      applySettingsGuardToBooleanSetter(show, setShowAddCardModal);
    },
    [applySettingsGuardToBooleanSetter, setShowAddCardModal]
  );

  const guardedSetShowConfigModal = useCallback(
    (show) => {
      applySettingsGuardToBooleanSetter(show, setShowConfigModal);
    },
    [applySettingsGuardToBooleanSetter, setShowConfigModal]
  );

  const guardedSetShowThemeSidebar = useCallback(
    (show) => {
      applySettingsGuardToBooleanSetter(show, setShowThemeSidebar);
    },
    [applySettingsGuardToBooleanSetter, setShowThemeSidebar]
  );

  const guardedSetShowLayoutSidebar = useCallback(
    (show) => {
      applySettingsGuardToBooleanSetter(show, setShowLayoutSidebar);
    },
    [applySettingsGuardToBooleanSetter, setShowLayoutSidebar]
  );

  const guardedSetShowHeaderEditModal = useCallback(
    (show) => {
      applySettingsGuardToBooleanSetter(show, setShowHeaderEditModal);
    },
    [applySettingsGuardToBooleanSetter, setShowHeaderEditModal]
  );

  const guardedToggleCardVisibility = (cardId) => {
    requestSettingsAccess(() => {
      toggleCardVisibility(cardId);
    });
  };

  const guardedRemoveCard = (cardId, listName) => {
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
