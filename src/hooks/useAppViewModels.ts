import { useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { useAppUiStateContext } from '../contexts/AppUiContext';
import type { useConfig } from '../contexts/ConfigContext';
import type { useHomeAssistant } from '../contexts/HomeAssistantContext';
import type { usePages } from '../contexts/PageContext';
import type { ManagementModalActions, MediaModalActions } from '../types/dashboard';
import type { Translate } from '../types/ha';
import type { useAddCard } from './useAddCard';
import type { useCardRendering } from './useCardRendering';
import type { useConnectionSetup } from './useConnectionSetup';
import type { useDashboardEffects } from './useDashboardEffects';
import type { useDashboardStateCoordinator } from './useDashboardStateCoordinator';
import type { useEntityHelpers } from './useEntityHelpers';
import type { usePageManagement } from './usePageManagement';
import type { useResponsiveGrid } from './useResponsiveGrid';

type ConfigValues = ReturnType<typeof useConfig>;
type PageValues = ReturnType<typeof usePages>;
type HomeAssistantValues = ReturnType<typeof useHomeAssistant>;
type AppUiValues = ReturnType<typeof useAppUiStateContext>;
type ConnectionSetup = ReturnType<typeof useConnectionSetup>;
type PageManagement = ReturnType<typeof usePageManagement>;
type AddCard = ReturnType<typeof useAddCard>;
type DashboardEffects = ReturnType<typeof useDashboardEffects>;
type DashboardState = ReturnType<typeof useDashboardStateCoordinator>;
type EntityHelpers = ReturnType<typeof useEntityHelpers>;
type CardRendering = ReturnType<typeof useCardRendering>;
type ResponsiveGrid = ReturnType<typeof useResponsiveGrid>;

export type UseAppViewModelsParams = Pick<
  ConfigValues,
  | 'config'
  | 'setConfig'
  | 'language'
  | 'setLanguage'
  | 'currentTheme'
  | 'setCurrentTheme'
  | 'bgMode'
  | 'setBgMode'
  | 'bgColor'
  | 'setBgColor'
  | 'bgGradient'
  | 'setBgGradient'
  | 'bgImage'
  | 'setBgImage'
  | 'cardTransparency'
  | 'setCardTransparency'
  | 'cardBorderOpacity'
  | 'setCardBorderOpacity'
  | 'cardBgColor'
  | 'setCardBgColor'
  | 'cardMaterial'
  | 'setCardMaterial'
  | 'density'
  | 'setDensity'
  | 'cardScale'
  | 'setCardScale'
  | 'inactivityTimeout'
  | 'setInactivityTimeout'
> &
  Pick<
    PageValues,
    | 'pagesConfig'
    | 'pageSettings'
    | 'savePageSetting'
    | 'gridGapV'
    | 'gridGapH'
    | 'setGridGapH'
    | 'setGridGapV'
    | 'gridColumns'
    | 'setGridColumns'
    | 'dynamicGridColumns'
    | 'setDynamicGridColumns'
    | 'cardBorderRadius'
    | 'setCardBorderRadius'
    | 'sectionSpacing'
    | 'updateSectionSpacing'
    | 'cardsOnlyMode'
    | 'updateCardsOnlyMode'
    | 'headerTitle'
    | 'headerScale'
    | 'headerSettings'
    | 'updateHeaderTitle'
    | 'updateHeaderScale'
    | 'updateHeaderSettings'
    | 'persistPageSettings'
    | 'persistConfig'
    | 'cardSettings'
    | 'hiddenCards'
    | 'saveCardSetting'
    | 'persistCardSettings'
    | 'customNames'
    | 'saveCustomName'
    | 'persistCustomNames'
    | 'customIcons'
    | 'saveCustomIcon'
    | 'persistCustomIcons'
    | 'toggleCardVisibility'
    | 'persistHiddenCards'
    | 'statusPillsConfig'
    | 'saveStatusPillsConfig'
  > &
  Pick<HomeAssistantValues, 'entities' | 'conn' | 'activeUrl' | 'connected' | 'authRef'> &
  Pick<
    ConnectionSetup,
    | 'setConfigTab'
    | 'isOnboardingActive'
    | 'onboardingStep'
    | 'setOnboardingStep'
    | 'onboardingUrlError'
    | 'setOnboardingUrlError'
    | 'onboardingTokenError'
    | 'setOnboardingTokenError'
    | 'testingConnection'
    | 'testConnection'
    | 'connectionTestResult'
    | 'setConnectionTestResult'
    | 'startOAuthLogin'
    | 'handleOAuthLogout'
    | 'canAdvanceOnboarding'
  > &
  Pick<
    PageManagement,
    | 'editingPage'
    | 'setEditingPage'
    | 'newPageLabel'
    | 'setNewPageLabel'
    | 'newPageIcon'
    | 'setNewPageIcon'
    | 'createPage'
    | 'createMediaPage'
    | 'createSonosPage'
    | 'createLightsPage'
    | 'createBatteryPage'
    | 'createRoomExplorerPage'
    | 'deletePage'
    | 'removeCard'
  > &
  Pick<
    AddCard,
    | 'addCardTargetPage'
    | 'addCardType'
    | 'setAddCardType'
    | 'searchTerm'
    | 'setSearchTerm'
    | 'selectedEntities'
    | 'setSelectedEntities'
    | 'selectedWeatherId'
    | 'setSelectedWeatherId'
    | 'selectedTempId'
    | 'setSelectedTempId'
    | 'selectedAndroidTVMediaId'
    | 'setSelectedAndroidTVMediaId'
    | 'selectedAndroidTVRemoteId'
    | 'setSelectedAndroidTVRemoteId'
    | 'selectedAppleTVMediaId'
    | 'setSelectedAppleTVMediaId'
    | 'selectedAppleTVRemoteId'
    | 'setSelectedAppleTVRemoteId'
    | 'selectedCostTodayId'
    | 'setSelectedCostTodayId'
    | 'selectedCostMonthId'
    | 'setSelectedCostMonthId'
    | 'costSelectionTarget'
    | 'setCostSelectionTarget'
    | 'selectedNordpoolId'
    | 'setSelectedNordpoolId'
    | 'nordpoolDecimals'
    | 'setNordpoolDecimals'
    | 'selectedSpacerVariant'
    | 'setSelectedSpacerVariant'
    | 'onAddSelected'
    | 'getAddCardAvailableLabel'
    | 'getAddCardNoneLeftLabel'
  > &
  Pick<DashboardEffects, 'optimisticLightBrightness' | 'setOptimisticLightBrightness'> &
  Pick<
    DashboardState,
    | 'isMediaPage'
    | 'isSonosPage'
    | 'isLightsPage'
    | 'isBatteryPage'
    | 'isRoomExplorerPage'
    | 'getCardSettingsKey'
    | 'isCardHiddenByLogic'
    | 'pageDefaults'
  > &
  Pick<
    EntityHelpers,
    | 'getA'
    | 'getS'
    | 'getEntityImageUrl'
    | 'callService'
    | 'isSonosActive'
    | 'isMediaActive'
    | 'hvacMap'
    | 'fanMap'
    | 'swingMap'
  > &
  Pick<CardRendering, 'renderCard' | 'gridLayout'> &
  Pick<ResponsiveGrid, 'isMobile' | 'gridColCount' | 'isCompactCards'> &
  Pick<MediaModalActions, 'setActiveMediaId'> &
  Pick<ManagementModalActions, 'setShowAddCardModal' | 'setShowConfigModal'> &
  // Passed by App alongside the values above but not read here.
  Partial<
    Pick<
      AppUiValues,
      | 'activeVacuumId'
      | 'setActiveVacuumId'
      | 'activeMowerId'
      | 'setActiveMowerId'
      | 'showThemeSidebar'
      | 'setShowThemeSidebar'
      | 'showLayoutSidebar'
      | 'setShowLayoutSidebar'
      | 'editCardSettingsKey'
      | 'setEditCardSettingsKey'
    > &
      Pick<ConnectionSetup, 'configTab'>
  > & {
    activePage: string;
    editMode: boolean;
    activeMediaId: string | null;
    effectiveGridColumns: number;
    showOnboarding: boolean;
    setShowOnboarding: Dispatch<SetStateAction<boolean>>;
    t: Translate;
  };

export function useAppViewModels(params: UseAppViewModelsParams) {
  const {
    activePage,
    pagesConfig,
    pageSettings,
    editMode,
    isMediaPage,
    isSonosPage,
    isLightsPage,
    isBatteryPage,
    isRoomExplorerPage,
    entities,
    conn,
    isSonosActive,
    activeMediaId,
    setActiveMediaId,
    getA,
    getS,
    getEntityImageUrl,
    callService,
    savePageSetting,
    gridLayout,
    isMobile,
    gridGapV,
    gridGapH,
    gridColCount,
    isCompactCards,
    cardSettings,
    getCardSettingsKey,
    hiddenCards,
    isCardHiddenByLogic,
    renderCard,
    setShowAddCardModal,
    setConfigTab,
    setShowConfigModal,
    activeUrl,
    connected,
    authRef,
    config,
    setConfig,
    t,
    language,
    setLanguage,
    currentTheme,
    setCurrentTheme,
    bgMode,
    setBgMode,
    bgColor,
    setBgColor,
    bgGradient,
    setBgGradient,
    bgImage,
    setBgImage,
    cardTransparency,
    setCardTransparency,
    cardBorderOpacity,
    setCardBorderOpacity,
    cardBgColor,
    setCardBgColor,
    cardMaterial,
    setCardMaterial,
    density,
    setDensity,
    cardScale,
    setCardScale,
    inactivityTimeout,
    setInactivityTimeout,
    setGridGapH,
    setGridGapV,
    gridColumns,
    setGridColumns,
    dynamicGridColumns,
    setDynamicGridColumns,
    effectiveGridColumns,
    cardBorderRadius,
    setCardBorderRadius,
    sectionSpacing,
    updateSectionSpacing,
    cardsOnlyMode,
    updateCardsOnlyMode,
    headerTitle,
    headerScale,
    headerSettings,
    updateHeaderTitle,
    updateHeaderScale,
    updateHeaderSettings,
    showOnboarding,
    setShowOnboarding,
    isOnboardingActive,
    onboardingStep,
    setOnboardingStep,
    onboardingUrlError,
    setOnboardingUrlError,
    onboardingTokenError,
    setOnboardingTokenError,
    testingConnection,
    testConnection,
    connectionTestResult,
    setConnectionTestResult,
    startOAuthLogin,
    handleOAuthLogout,
    canAdvanceOnboarding,
    pageDefaults,
    editingPage,
    setEditingPage,
    newPageLabel,
    setNewPageLabel,
    newPageIcon,
    setNewPageIcon,
    createPage,
    createMediaPage,
    createSonosPage,
    createLightsPage,
    createBatteryPage,
    createRoomExplorerPage,
    deletePage,
    removeCard,
    persistPageSettings,
    persistConfig,
    optimisticLightBrightness,
    setOptimisticLightBrightness,
    hvacMap,
    fanMap,
    swingMap,
    isMediaActive,
    addCardTargetPage,
    addCardType,
    setAddCardType,
    searchTerm,
    setSearchTerm,
    selectedEntities,
    setSelectedEntities,
    selectedWeatherId,
    setSelectedWeatherId,
    selectedTempId,
    setSelectedTempId,
    selectedAndroidTVMediaId,
    setSelectedAndroidTVMediaId,
    selectedAndroidTVRemoteId,
    setSelectedAndroidTVRemoteId,
    selectedAppleTVMediaId,
    setSelectedAppleTVMediaId,
    selectedAppleTVRemoteId,
    setSelectedAppleTVRemoteId,
    selectedCostTodayId,
    setSelectedCostTodayId,
    selectedCostMonthId,
    setSelectedCostMonthId,
    costSelectionTarget,
    setCostSelectionTarget,
    selectedNordpoolId,
    setSelectedNordpoolId,
    nordpoolDecimals,
    setNordpoolDecimals,
    selectedSpacerVariant,
    setSelectedSpacerVariant,
    onAddSelected,
    getAddCardAvailableLabel,
    getAddCardNoneLeftLabel,
    saveCardSetting,
    persistCardSettings,
    customNames,
    saveCustomName,
    persistCustomNames,
    customIcons,
    saveCustomIcon,
    persistCustomIcons,
    toggleCardVisibility,
    persistHiddenCards,
    statusPillsConfig,
    saveStatusPillsConfig,
  } = params;

  const dashboardGridPage = useMemo(
    () => ({
      activePage,
      pagesConfig,
      pageSettings,
      editMode,
      isMediaPage,
      isSonosPage,
      isLightsPage,
      isBatteryPage,
      isRoomExplorerPage,
    }),
    [
      activePage,
      pagesConfig,
      pageSettings,
      editMode,
      isMediaPage,
      isSonosPage,
      isLightsPage,
      isBatteryPage,
      isRoomExplorerPage,
    ]
  );

  const dashboardGridMedia = useMemo(
    () => ({
      entities,
      conn,
      isSonosActive,
      activeMediaId,
      setActiveMediaId,
      getA,
      getEntityImageUrl,
      callService,
      savePageSetting,
    }),
    [
      entities,
      conn,
      isSonosActive,
      activeMediaId,
      setActiveMediaId,
      getA,
      getEntityImageUrl,
      callService,
      savePageSetting,
    ]
  );

  const dashboardGridGrid = useMemo(
    () => ({
      gridLayout,
      isMobile,
      gridGapV,
      gridGapH,
      gridColCount,
      isCompactCards,
      cardScale,
    }),
    [gridLayout, isMobile, gridGapV, gridGapH, gridColCount, isCompactCards, cardScale]
  );

  const dashboardGridCards = useMemo(
    () => ({
      cardSettings,
      getCardSettingsKey,
      hiddenCards,
      isCardHiddenByLogic,
      renderCard,
    }),
    [cardSettings, getCardSettingsKey, hiddenCards, isCardHiddenByLogic, renderCard]
  );

  const dashboardGridActions = useMemo(
    () => ({
      setShowAddCardModal,
      setConfigTab,
      setShowConfigModal,
    }),
    [setShowAddCardModal, setConfigTab, setShowConfigModal]
  );

  const modalManagerCore = useMemo(
    () => ({
      entities,
      conn,
      activeUrl,
      connected,
      authRef,
      config,
      setConfig,
      t,
      language,
      setLanguage,
    }),
    [entities, conn, activeUrl, connected, authRef, config, setConfig, t, language, setLanguage]
  );

  const modalManagerAppearance = useMemo(
    () => ({
      currentTheme,
      setCurrentTheme,
      bgMode,
      setBgMode,
      bgColor,
      setBgColor,
      bgGradient,
      setBgGradient,
      bgImage,
      setBgImage,
      cardTransparency,
      setCardTransparency,
      cardBorderOpacity,
      setCardBorderOpacity,
      cardBgColor,
      setCardBgColor,
      cardMaterial,
      setCardMaterial,
      density,
      setDensity,
      cardScale,
      setCardScale,
      inactivityTimeout,
      setInactivityTimeout,
    }),
    [
      currentTheme,
      setCurrentTheme,
      bgMode,
      setBgMode,
      bgColor,
      setBgColor,
      bgGradient,
      setBgGradient,
      bgImage,
      setBgImage,
      cardTransparency,
      setCardTransparency,
      cardBorderOpacity,
      setCardBorderOpacity,
      cardBgColor,
      setCardBgColor,
      cardMaterial,
      setCardMaterial,
      density,
      setDensity,
      cardScale,
      setCardScale,
      inactivityTimeout,
      setInactivityTimeout,
    ]
  );

  const modalManagerLayout = useMemo(
    () => ({
      gridGapH,
      setGridGapH,
      gridGapV,
      setGridGapV,
      gridColumns,
      setGridColumns,
      dynamicGridColumns,
      setDynamicGridColumns,
      effectiveGridColumns,
      cardBorderRadius,
      setCardBorderRadius,
      sectionSpacing,
      updateSectionSpacing,
      cardsOnlyMode,
      updateCardsOnlyMode,
      headerTitle,
      headerScale,
      headerSettings,
      updateHeaderTitle,
      updateHeaderScale,
      updateHeaderSettings,
    }),
    [
      gridGapH,
      setGridGapH,
      gridGapV,
      setGridGapV,
      gridColumns,
      setGridColumns,
      dynamicGridColumns,
      setDynamicGridColumns,
      effectiveGridColumns,
      cardBorderRadius,
      setCardBorderRadius,
      sectionSpacing,
      updateSectionSpacing,
      cardsOnlyMode,
      updateCardsOnlyMode,
      headerTitle,
      headerScale,
      headerSettings,
      updateHeaderTitle,
      updateHeaderScale,
      updateHeaderSettings,
    ]
  );

  const modalManagerOnboarding = useMemo(
    () => ({
      showOnboarding,
      setShowOnboarding,
      isOnboardingActive,
      onboardingStep,
      setOnboardingStep,
      onboardingUrlError,
      setOnboardingUrlError,
      onboardingTokenError,
      setOnboardingTokenError,
      testingConnection,
      testConnection,
      connectionTestResult,
      setConnectionTestResult,
      startOAuthLogin,
      handleOAuthLogout,
      canAdvanceOnboarding,
    }),
    [
      showOnboarding,
      setShowOnboarding,
      isOnboardingActive,
      onboardingStep,
      setOnboardingStep,
      onboardingUrlError,
      setOnboardingUrlError,
      onboardingTokenError,
      setOnboardingTokenError,
      testingConnection,
      testConnection,
      connectionTestResult,
      setConnectionTestResult,
      startOAuthLogin,
      handleOAuthLogout,
      canAdvanceOnboarding,
    ]
  );

  const modalManagerPageManagement = useMemo(
    () => ({
      pageDefaults,
      editingPage,
      setEditingPage,
      newPageLabel,
      setNewPageLabel,
      newPageIcon,
      setNewPageIcon,
      createPage,
      createMediaPage,
      createSonosPage,
      createLightsPage,
      createBatteryPage,
      createRoomExplorerPage,
      deletePage,
      removeCard,
      pageSettings,
      savePageSetting,
      persistPageSettings,
      pagesConfig,
      persistConfig,
      activePage,
    }),
    [
      pageDefaults,
      editingPage,
      setEditingPage,
      newPageLabel,
      setNewPageLabel,
      newPageIcon,
      setNewPageIcon,
      createPage,
      createMediaPage,
      createSonosPage,
      createLightsPage,
      createBatteryPage,
      createRoomExplorerPage,
      deletePage,
      removeCard,
      pageSettings,
      savePageSetting,
      persistPageSettings,
      pagesConfig,
      persistConfig,
      activePage,
    ]
  );

  const modalManagerEntityHelpers = useMemo(
    () => ({
      callService,
      getEntityImageUrl,
      getA,
      getS,
      optimisticLightBrightness,
      setOptimisticLightBrightness,
      hvacMap,
      fanMap,
      swingMap,
      isSonosActive,
      isMediaActive,
    }),
    [
      callService,
      getEntityImageUrl,
      getA,
      getS,
      optimisticLightBrightness,
      setOptimisticLightBrightness,
      hvacMap,
      fanMap,
      swingMap,
      isSonosActive,
      isMediaActive,
    ]
  );

  const modalManagerAddCard = useMemo(
    () => ({
      addCardTargetPage,
      addCardType,
      setAddCardType,
      searchTerm,
      setSearchTerm,
      selectedEntities,
      setSelectedEntities,
      selectedWeatherId,
      setSelectedWeatherId,
      selectedTempId,
      setSelectedTempId,
      selectedAndroidTVMediaId,
      setSelectedAndroidTVMediaId,
      selectedAndroidTVRemoteId,
      setSelectedAndroidTVRemoteId,
      selectedAppleTVMediaId,
      setSelectedAppleTVMediaId,
      selectedAppleTVRemoteId,
      setSelectedAppleTVRemoteId,
      selectedCostTodayId,
      setSelectedCostTodayId,
      selectedCostMonthId,
      setSelectedCostMonthId,
      costSelectionTarget,
      setCostSelectionTarget,
      selectedNordpoolId,
      setSelectedNordpoolId,
      nordpoolDecimals,
      setNordpoolDecimals,
      selectedSpacerVariant,
      setSelectedSpacerVariant,
      onAddSelected,
      getAddCardAvailableLabel,
      getAddCardNoneLeftLabel,
    }),
    [
      addCardTargetPage,
      addCardType,
      setAddCardType,
      searchTerm,
      setSearchTerm,
      selectedEntities,
      setSelectedEntities,
      selectedWeatherId,
      setSelectedWeatherId,
      selectedTempId,
      setSelectedTempId,
      selectedAndroidTVMediaId,
      setSelectedAndroidTVMediaId,
      selectedAndroidTVRemoteId,
      setSelectedAndroidTVRemoteId,
      selectedAppleTVMediaId,
      setSelectedAppleTVMediaId,
      selectedAppleTVRemoteId,
      setSelectedAppleTVRemoteId,
      selectedCostTodayId,
      setSelectedCostTodayId,
      selectedCostMonthId,
      setSelectedCostMonthId,
      costSelectionTarget,
      setCostSelectionTarget,
      selectedNordpoolId,
      setSelectedNordpoolId,
      nordpoolDecimals,
      setNordpoolDecimals,
      selectedSpacerVariant,
      setSelectedSpacerVariant,
      onAddSelected,
      getAddCardAvailableLabel,
      getAddCardNoneLeftLabel,
    ]
  );

  const modalManagerCardConfig = useMemo(
    () => ({
      cardSettings,
      saveCardSetting,
      persistCardSettings,
      customNames,
      saveCustomName,
      persistCustomNames,
      customIcons,
      saveCustomIcon,
      persistCustomIcons,
      hiddenCards,
      toggleCardVisibility,
      persistHiddenCards,
      getCardSettingsKey,
      statusPillsConfig,
      saveStatusPillsConfig,
    }),
    [
      cardSettings,
      saveCardSetting,
      persistCardSettings,
      customNames,
      saveCustomName,
      persistCustomNames,
      customIcons,
      saveCustomIcon,
      persistCustomIcons,
      hiddenCards,
      toggleCardVisibility,
      persistHiddenCards,
      getCardSettingsKey,
      statusPillsConfig,
      saveStatusPillsConfig,
    ]
  );

  return {
    dashboardGridPage,
    dashboardGridMedia,
    dashboardGridGrid,
    dashboardGridCards,
    dashboardGridActions,
    modalManagerCore,
    modalManagerAppearance,
    modalManagerLayout,
    modalManagerOnboarding,
    modalManagerPageManagement,
    modalManagerEntityHelpers,
    modalManagerAddCard,
    modalManagerCardConfig,
  };
}
