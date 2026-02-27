import { useEffect, useMemo } from 'react';
import { LayoutGrid } from '../icons';
import { isCardRemovable as _isCardRemovable, isCardHiddenByLogic as _isCardHiddenByLogic, isMediaPage as _isMediaPage } from '../utils/cardUtils';

/** @param {Record<string, unknown>} deps */
export function useDashboardStateCoordinator(deps) {
  const {
    entities,
    pagesConfig,
    pageSettings,
    activePage,
    setActivePage,
    cardSettings,
    hasOpenModal,
    closeAllModals,
    editingPage,
    setEditingPage,
    editMode,
    setEditMode,
    setActiveVacuumId,
    setEditCardSettingsKey,
    setShowStatusPillsConfig,
    setShowCalendarModal,
    setShowTodoModal,
    setShowWeatherModal,
    setShowLightModal,
    setShowSensorInfoModal,
    setActiveClimateEntityModal,
    setShowCostModal,
    setShowVacuumModal,
    setShowFanModal,
    setShowAndroidTVModal,
    setActiveCarModal,
    setShowNordpoolModal,
    setShowRoomModal,
    setShowCoverModal,
    setShowAlarmModal,
    setShowCameraModal,
    setActiveMediaModal,
    setActiveMediaId,
    setActiveMediaGroupKey,
    setActiveMediaGroupIds,
    setActiveMediaSessionSensorIds,
    t,
  } = deps;

  const popupModalActions = useMemo(() => ({
    closeAllModals,
    setShowLightModal,
    setShowSensorInfoModal,
    setActiveClimateEntityModal,
    setShowCostModal,
    setActiveVacuumId,
    setShowVacuumModal,
    setShowFanModal,
    setShowAndroidTVModal,
    setActiveCarModal,
    setShowWeatherModal,
    setShowNordpoolModal,
    setShowCalendarModal,
    setShowTodoModal,
    setShowRoomModal,
    setShowCoverModal,
    setShowAlarmModal,
    setShowCameraModal,
    setActiveMediaModal,
    setActiveMediaId,
    setActiveMediaGroupKey,
    setActiveMediaGroupIds,
    setActiveMediaSessionSensorIds,
  }), [
    closeAllModals,
    setShowLightModal,
    setShowSensorInfoModal,
    setActiveClimateEntityModal,
    setShowCostModal,
    setActiveVacuumId,
    setShowVacuumModal,
    setShowFanModal,
    setShowAndroidTVModal,
    setActiveCarModal,
    setShowWeatherModal,
    setShowNordpoolModal,
    setShowCalendarModal,
    setShowTodoModal,
    setShowRoomModal,
    setShowCoverModal,
    setShowAlarmModal,
    setShowCameraModal,
    setActiveMediaModal,
    setActiveMediaId,
    setActiveMediaGroupKey,
    setActiveMediaGroupIds,
    setActiveMediaSessionSensorIds,
  ]);

  const updateCount = Object.values(entities).filter((e) => e.entity_id.startsWith('update.') && e.state === 'on' && !e.attributes.skipped_version).length;

  const resetToHome = () => {
    const isHome = activePage === 'home';
    const noModals = !hasOpenModal() && !editingPage && !editMode;

    if (!isHome || !noModals) {
      setActivePage('home');
      closeAllModals();
      setActiveVacuumId(null);
      setEditCardSettingsKey(null);
      setEditingPage(null);
      setEditMode(false);
      setShowStatusPillsConfig(false);
      setShowCalendarModal(false);
      setShowTodoModal(null);
      setShowWeatherModal(null);
    }
  };

  useEffect(() => {
    const pages = pagesConfig.pages || [];
    if (activePage !== 'home' && !pages.includes(activePage)) {
      setActivePage('home');
    }
  }, [pagesConfig.pages]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageDefaults = {
    home: { label: t('page.home'), icon: LayoutGrid }
  };
  const pages = (pagesConfig.pages || []).map((id) => ({
    id,
    label: pageDefaults[id]?.label || id,
    icon: pageDefaults[id]?.icon || LayoutGrid,
  }));

  const getCardSettingsKey = (cardId, pageId = activePage) => `${pageId}::${cardId}`;

  const cardUtilCtx = { getCardSettingsKey, cardSettings, entities, activePage };
  const isCardRemovable = (cardId, pageId = activePage) => _isCardRemovable(cardId, pageId, cardUtilCtx);
  const isCardHiddenByLogic = (cardId) => _isCardHiddenByLogic(cardId, cardUtilCtx);
  const isMediaPage = (pageId) => _isMediaPage(pageId, pageSettings);
  const hasEnabledPopupTriggers = useMemo(
    () => Object.values(cardSettings || {}).some((settings) => settings?.popupTrigger?.enabled === true),
    [cardSettings],
  );

  return {
    popupModalActions,
    updateCount,
    resetToHome,
    pageDefaults,
    pages,
    getCardSettingsKey,
    isCardRemovable,
    isCardHiddenByLogic,
    isMediaPage,
    hasEnabledPopupTriggers,
  };
}
