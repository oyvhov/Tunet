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
import { getCardSettingsKey as buildCardSettingsKey } from '../utils/cardSettingsKey';
import type { IconComponent } from '../icons/iconMap';
import type {
  EntityMap,
  EntityModalActions,
  ManagementModalActions,
  MediaModalActions,
  PageSettingsMap,
  PagesConfig,
} from '../types/dashboard';
import type { HassEntities, Translate } from '../types/ha';
import type { PopupCardSettingsMap } from './usePopupTriggers';

type CoordinatorEntityActions = Pick<
  EntityModalActions,
  | 'setShowCalendarModal'
  | 'setShowTodoModal'
  | 'setShowWeatherModal'
  | 'setShowLightModal'
  | 'setShowSensorInfoModal'
  | 'setActiveClimateEntityModal'
  | 'setShowCostModal'
  | 'setShowVacuumModal'
  | 'setShowMowerModal'
  | 'setShowFanModal'
  | 'setShowAndroidTVModal'
  | 'setShowAppleTVModal'
  | 'setActiveCarModal'
  | 'setShowNordpoolModal'
  | 'setShowRoomModal'
  | 'setShowCoverModal'
  | 'setShowAlarmModal'
  | 'setShowCameraModal'
>;

type CoordinatorManagementActions = Pick<ManagementModalActions, 'setShowStatusPillsConfig'>;

// Grouped action objects are preferred; legacy callers pass the setters individually.
export interface DashboardStateCoordinatorDeps
  extends
    Partial<CoordinatorEntityActions>,
    Partial<MediaModalActions>,
    Partial<CoordinatorManagementActions> {
  entities: EntityMap;
  pagesConfig: PagesConfig;
  pageSettings: PageSettingsMap;
  activePage: string;
  setActivePage: (pageId: string) => void;
  cardSettings: PopupCardSettingsMap;
  hasOpenModal: () => boolean;
  closeAllModals: () => void;
  editingPage: string | null;
  setEditingPage: (value: string | null) => void;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  setActiveVacuumId: (id: string | null) => void;
  setActiveMowerId?: (id: string | null) => void;
  setEditCardSettingsKey: (key: string | null) => void;
  entityModalActions?: CoordinatorEntityActions | null;
  mediaModalActions?: MediaModalActions | null;
  managementModalActions?: CoordinatorManagementActions | null;
  t: Translate;
}

export function useDashboardStateCoordinator(deps: DashboardStateCoordinatorDeps) {
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

  // Without the grouped objects, legacy callers must supply every setter listed here.
  const entityActions =
    entityModalActions ||
    ({
      setShowCalendarModal: deps.setShowCalendarModal,
      setShowTodoModal: deps.setShowTodoModal,
      setShowWeatherModal: deps.setShowWeatherModal,
      setShowLightModal: deps.setShowLightModal,
      setShowSensorInfoModal: deps.setShowSensorInfoModal,
      setActiveClimateEntityModal: deps.setActiveClimateEntityModal,
      setShowCostModal: deps.setShowCostModal,
      setShowVacuumModal: deps.setShowVacuumModal,
      setShowMowerModal: deps.setShowMowerModal,
      setShowFanModal: deps.setShowFanModal,
      setShowAndroidTVModal: deps.setShowAndroidTVModal,
      setShowAppleTVModal: deps.setShowAppleTVModal,
      setActiveCarModal: deps.setActiveCarModal,
      setShowNordpoolModal: deps.setShowNordpoolModal,
      setShowRoomModal: deps.setShowRoomModal,
      setShowCoverModal: deps.setShowCoverModal,
      setShowAlarmModal: deps.setShowAlarmModal,
      setShowCameraModal: deps.setShowCameraModal,
    } as CoordinatorEntityActions);
  const mediaActions =
    mediaModalActions ||
    ({
      setActiveMediaModal: deps.setActiveMediaModal,
      setActiveMediaId: deps.setActiveMediaId,
      setActiveMediaGroupKey: deps.setActiveMediaGroupKey,
      setActiveMediaGroupIds: deps.setActiveMediaGroupIds,
      setActiveMediaSessionSensorIds: deps.setActiveMediaSessionSensorIds,
    } as MediaModalActions);
  const settingsActions =
    managementModalActions ||
    ({
      setShowStatusPillsConfig: deps.setShowStatusPillsConfig,
    } as CoordinatorManagementActions);

  const {
    setShowCalendarModal,
    setShowTodoModal,
    setShowWeatherModal,
    setShowLightModal,
    setShowSensorInfoModal,
    setActiveClimateEntityModal,
    setShowCostModal,
    setShowVacuumModal,
    setShowMowerModal,
    setShowFanModal,
    setShowAndroidTVModal,
    setShowAppleTVModal,
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
      setActiveVacuumId,
      setShowVacuumModal,
      setActiveMowerId,
      setShowMowerModal,
      setShowFanModal,
      setShowAndroidTVModal,
      setShowAppleTVModal,
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
      setActiveVacuumId,
      setShowVacuumModal,
      setActiveMowerId,
      setShowMowerModal,
      setShowFanModal,
      setShowAndroidTVModal,
      setShowAppleTVModal,
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

  // EntityMap holds HA state objects, which always carry entity_id and attributes.
  const updateCount = Object.values(entities as HassEntities).filter(
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

  const pageDefaults: Record<string, { label: string; icon: IconComponent }> = {
    home: { label: t('page.home'), icon: LayoutGrid },
  };
  const pages = (pagesConfig.pages || []).map((id) => ({
    id,
    label: pageDefaults[id]?.label || id,
    icon: pageDefaults[id]?.icon || LayoutGrid,
  }));

  const getCardSettingsKey = (cardId: string, pageId: string = activePage) =>
    buildCardSettingsKey(cardId, pageId);

  // EntityMap holds HA state objects; the card utils take the full HassEntity shape.
  const cardUtilCtx = {
    getCardSettingsKey,
    cardSettings,
    entities: entities as HassEntities,
    activePage,
  };
  const isCardRemovable = (cardId: string, pageId: string = activePage) =>
    _isCardRemovable(cardId, pageId, cardUtilCtx);
  const isCardHiddenByLogic = (cardId: string) => _isCardHiddenByLogic(cardId, cardUtilCtx);
  const isMediaPage = (pageId: string) => _isMediaPage(pageId, pageSettings);
  const isSonosPage = (pageId: string) => _isSonosPage(pageId, pageSettings);
  const isLightsPage = (pageId: string) => _isLightsPage(pageId, pageSettings);
  const isBatteryPage = (pageId: string) => _isBatteryPage(pageId, pageSettings);
  const isRoomExplorerPage = (pageId: string) => _isRoomExplorerPage(pageId, pageSettings);
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
