import { useEffect, useMemo } from 'react';
import { LayoutGrid } from '../icons';
import {
  isCardRemovable as _isCardRemovable,
  isCardHiddenByLogic as _isCardHiddenByLogic,
  isMediaPage as _isMediaPage,
  isSonosPage as _isSonosPage,
  isLightsPage as _isLightsPage,
  isBatteryPage as _isBatteryPage,
  isRoomExplorerPage as _isRoomExplorerPage,
} from '../utils/cardUtils';

/** @param {any} deps */
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
    setActiveMowerId,
    setEditCardSettingsKey,
    entityModalActions,
    mediaModalActions,
    managementModalActions,
    t,
  } = deps;

  const entityActions = entityModalActions || {
    setShowCalendarModal: deps.setShowCalendarModal,
    setShowTodoModal: deps.setShowTodoModal,
    setShowWeatherModal: deps.setShowWeatherModal,
    setShowLightModal: deps.setShowLightModal,
    setShowSensorInfoModal: deps.setShowSensorInfoModal,
    setActiveClimateEntityModal: deps.setActiveClimateEntityModal,
    setShowCostModal: deps.setShowCostModal,
    setShowEnergyModal: deps.setShowEnergyModal,
    setShowVacuumModal: deps.setShowVacuumModal,
    setShowMowerModal: deps.setShowMowerModal,
    setShowFanModal: deps.setShowFanModal,
    setShowAndroidTVModal: deps.setShowAndroidTVModal,
    setActiveCarModal: deps.setActiveCarModal,
    setShowNordpoolModal: deps.setShowNordpoolModal,
    setShowRoomModal: deps.setShowRoomModal,
    setShowCoverModal: deps.setShowCoverModal,
    setShowAlarmModal: deps.setShowAlarmModal,
    setShowCameraModal: deps.setShowCameraModal,
  };
  const mediaActions = mediaModalActions || {
    setActiveMediaModal: deps.setActiveMediaModal,
    setActiveMediaId: deps.setActiveMediaId,
    setActiveMediaGroupKey: deps.setActiveMediaGroupKey,
    setActiveMediaGroupIds: deps.setActiveMediaGroupIds,
    setActiveMediaSessionSensorIds: deps.setActiveMediaSessionSensorIds,
  };
  const settingsActions = managementModalActions || {
    setShowStatusPillsConfig: deps.setShowStatusPillsConfig,
  };

  const {
    setShowCalendarModal,
    setShowTodoModal,
    setShowWeatherModal,
    setShowLightModal,
    setShowSensorInfoModal,
    setActiveClimateEntityModal,
    setShowCostModal,
    setShowEnergyModal,
    setShowVacuumModal,
    setShowMowerModal,
    setShowFanModal,
    setShowAndroidTVModal,
    setActiveCarModal,
    setShowNordpoolModal,
    setShowRoomModal,
    setShowCoverModal,
    setShowAlarmModal,
    setShowCameraModal,
  } = entityActions;

  const {
    setActiveMediaModal,
    setActiveMediaId,
    setActiveMediaGroupKey,
    setActiveMediaGroupIds,
    setActiveMediaSessionSensorIds,
  } = mediaActions;
  const { setShowStatusPillsConfig } = settingsActions;

  const popupModalActions = useMemo(
    () => ({
      closeAllModals,
      setShowLightModal,
      setShowSensorInfoModal,
      setActiveClimateEntityModal,
      setShowCostModal,
      setShowEnergyModal,
      setActiveVacuumId,
      setShowVacuumModal,
      setActiveMowerId,
      setShowMowerModal,
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
    }),
    [
      closeAllModals,
      setShowLightModal,
      setShowSensorInfoModal,
      setActiveClimateEntityModal,
      setShowCostModal,
      setShowEnergyModal,
      setActiveVacuumId,
      setShowVacuumModal,
      setActiveMowerId,
      setShowMowerModal,
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
    ]
  );

  const updateCount = Object.values(entities).filter(
    (e) => e.entity_id.startsWith('update.') && e.state === 'on' && !e.attributes.skipped_version
  ).length;

  const resetToHome = () => {
    const isHome = activePage === 'home';
    const noModals = !hasOpenModal() && !editingPage && !editMode;

    if (!isHome || !noModals) {
      setActivePage('home');
      closeAllModals();
      setActiveVacuumId(null);
      setActiveMowerId?.(null);
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
    home: { label: t('page.home'), icon: LayoutGrid },
  };
  const pages = (pagesConfig.pages || []).map((id) => ({
    id,
    label: pageDefaults[id]?.label || id,
    icon: pageDefaults[id]?.icon || LayoutGrid,
  }));

  const getCardSettingsKey = (cardId, pageId = activePage) => `${pageId}::${cardId}`;

  const cardUtilCtx = { getCardSettingsKey, cardSettings, entities, activePage };
  const isCardRemovable = (cardId, pageId = activePage) =>
    _isCardRemovable(cardId, pageId, cardUtilCtx);
  const isCardHiddenByLogic = (cardId) => _isCardHiddenByLogic(cardId, cardUtilCtx);
  const isMediaPage = (pageId) => _isMediaPage(pageId, pageSettings);
  const isSonosPage = (pageId) => _isSonosPage(pageId, pageSettings);
  const isLightsPage = (pageId) => _isLightsPage(pageId, pageSettings);
  const isBatteryPage = (pageId) => _isBatteryPage(pageId, pageSettings);
  const isRoomExplorerPage = (pageId) => _isRoomExplorerPage(pageId, pageSettings);
  const hasEnabledPopupTriggers = useMemo(
    () =>
      Object.values(cardSettings || {}).some(
        (settings) => settings?.popupTrigger?.enabled === true
      ),
    [cardSettings]
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
    isSonosPage,
    isLightsPage,
    isBatteryPage,
    isRoomExplorerPage,
    hasEnabledPopupTriggers,
  };
}
