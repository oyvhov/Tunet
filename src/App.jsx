import { useState, useMemo, useCallback } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { en, nb, nn, sv, de, DEFAULT_LANGUAGE, normalizeLanguage } from './i18n';
import { LayoutGrid } from './icons';

import { DashboardLayout } from './layouts';

import { PersonStatus } from './components';

import {
  HomeAssistantProvider,
  ModalProvider,
  useConfig,
  useHomeAssistant,
  useModalState,
  usePages,
} from './contexts';

import {
  useSmartTheme,
  useTempHistory,
  useWeatherForecast,
  useAddCard,
  useConnectionSetup,
  useResponsiveGrid,
  useEntityHelpers,
  usePageManagement,
  useDashboardEffects,
  usePageRouting,
  useCardRendering,
  useAppComposition,
  useAppUiState,
  useSettingsAccessControl,
  usePopupTriggers,
  useDashboardStateCoordinator,
  useGuardedUiActions,
} from './hooks';

import './styles/dashboard.css';
import { hasOAuthTokens } from './services/oauthStorage';

/** @typedef {import('./types/dashboard').AppContentProps} AppContentProps */

/** @param {AppContentProps} props */
export function AppContent({ showOnboarding, setShowOnboarding }) {
  const {
    currentTheme,
    setCurrentTheme,
    language,
    setLanguage,
    inactivityTimeout,
    setInactivityTimeout,
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
    appFont,
    settingsLockEnabled,
    settingsLockSessionUnlocked,
    unlockSettingsLock,
    config,
    setConfig,
  } = useConfig();

  const {
    pagesConfig,
    setPagesConfig,
    persistConfig,
    cardSettings,
    saveCardSetting,
    customNames,
    saveCustomName,
    customIcons,
    saveCustomIcon,
    hiddenCards,
    toggleCardVisibility,
    pageSettings,
    persistPageSettings,
    persistCustomNames,
    persistCustomIcons,
    persistHiddenCards,
    savePageSetting,
    gridColumns,
    setGridColumns,
    dynamicGridColumns,
    setDynamicGridColumns,
    gridGapH,
    setGridGapH,
    gridGapV,
    setGridGapV,
    cardBorderRadius,
    setCardBorderRadius,
    headerScale,
    updateHeaderScale,
    headerTitle,
    updateHeaderTitle,
    headerSettings,
    updateHeaderSettings,
    sectionSpacing,
    updateSectionSpacing,
    persistCardSettings,
    statusPillsConfig,
    saveStatusPillsConfig,
  } = usePages();

  const {
    entities,
    entitiesLoaded,
    connected,
    haUnavailableVisible,
    oauthExpired,
    conn,
    activeUrl,
    authRef,
  } = useHomeAssistant();
  const translations = useMemo(() => ({ en, nb, nn, sv, de }), []);
  const appFontFamilyMap = useMemo(
    () => ({
      sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
      Inter: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      Roboto: 'Roboto, "Helvetica Neue", Arial, sans-serif',
      Lato: 'Lato, "Helvetica Neue", Arial, sans-serif',
      Montserrat: 'Montserrat, "Helvetica Neue", Arial, sans-serif',
      'Open Sans': '"Open Sans", "Helvetica Neue", Arial, sans-serif',
      Raleway: 'Raleway, "Helvetica Neue", Arial, sans-serif',
    }),
    []
  );
  const resolvedAppFontFamily = appFontFamilyMap[appFont] || appFontFamilyMap.sans;
  const t = useCallback(
    (key) => {
      const selectedLanguage = normalizeLanguage(language);
      const value = translations[selectedLanguage]?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key];
      if (value !== undefined) return value;
      return key;
    },
    [language, translations]
  );
  const resolvedHeaderTitle = headerTitle || t('page.home');

  // Modal state management
  const modals = useModalState();
  const {
    setShowNordpoolModal,
    setShowCostModal,
    setActiveClimateEntityModal,
    setShowLightModal,
    setActiveCarModal,
    setShowPersonModal,
    setShowAndroidTVModal,
    setShowVacuumModal,
    setShowFanModal,
    setShowSensorInfoModal,
    setShowCalendarModal,
    setShowTodoModal,
    setShowRoomModal,
    setShowCoverModal,
    setShowCameraModal,
    setShowWeatherModal,
    setShowAlarmModal,
    setShowAlarmActionModal,
    activeMediaModal,
    setActiveMediaModal,
    setActiveMediaGroupKey,
    setActiveMediaGroupIds,
    setActiveMediaSessionSensorIds,
    activeMediaId,
    setActiveMediaId,
    showAddCardModal,
    setShowAddCardModal,
    showConfigModal,
    setShowConfigModal,
    showAddPageModal,
    setShowAddPageModal,
    setShowHeaderEditModal,
    setShowEditCardModal,
    setShowStatusPillsConfig,
    hasOpenModal,
    closeAllModals,
  } = modals;

  const {
    activeVacuumId,
    setActiveVacuumId,
    showThemeSidebar,
    setShowThemeSidebar,
    showLayoutSidebar,
    setShowLayoutSidebar,
    editCardSettingsKey,
    setEditCardSettingsKey,
    editMode,
    setEditMode,
  } = useAppUiState();

  const { activePage, setActivePage } = usePageRouting();

  const [tempHistoryById, _setTempHistoryById] = useTempHistory(conn, cardSettings);
  const [forecastsById, _setForecastsById] = useWeatherForecast(conn, cardSettings);

  const {
    showPinLockModal,
    pinLockError,
    requestSettingsAccess,
    handlePinSubmit,
    closePinLockModal,
  } = useSettingsAccessControl({
    settingsLockEnabled,
    settingsLockSessionUnlocked,
    unlockSettingsLock,
    t,
  });

  // ── Responsive grid ────────────────────────────────────────────────────
  // Use page-specific gridColumns if set, otherwise fall back to global
  const pageGridColumns = pageSettings[activePage]?.gridColumns;
  const effectiveGridColumns = Number.isFinite(pageGridColumns) ? pageGridColumns : gridColumns;
  const { gridColCount, isCompactCards, isMobile } = useResponsiveGrid(
    effectiveGridColumns,
    dynamicGridColumns
  );

  // ── Connection / onboarding hook ───────────────────────────────────────
  const {
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
    configTab,
    setConfigTab,
    startOAuthLogin,
    handleOAuthLogout,
    canAdvanceOnboarding,
    isOnboardingActive,
  } = useConnectionSetup({
    config,
    setConfig,
    connected,
    showOnboarding,
    setShowOnboarding,
    showConfigModal,
    setShowConfigModal,
    t,
  });

  // ── Page management ────────────────────────────────────────────────────
  const {
    newPageLabel,
    setNewPageLabel,
    newPageIcon,
    setNewPageIcon,
    editingPage,
    setEditingPage,
    createPage,
    createMediaPage,
    deletePage,
    removeCard,
  } = usePageManagement({
    pagesConfig,
    persistConfig,
    pageSettings,
    persistPageSettings,
    savePageSetting,
    pageDefaults: { home: { label: t('page.home'), icon: LayoutGrid } },
    activePage,
    setActivePage,
    showAddPageModal,
    setShowAddPageModal,
    showAddCardModal,
    setShowAddCardModal,
    t,
  });

  const {
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
  } = useDashboardStateCoordinator({
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
  });

  // ── Dashboard-level side-effects (timers, title, haptics, idle) ────────
  const { now, mediaTick, optimisticLightBrightness, setOptimisticLightBrightness } =
    useDashboardEffects({
      resolvedHeaderTitle,
      inactivityTimeout,
      resetToHome,
      activeMediaModal,
      entities,
    });

  // Smart Theme Logic — only active when bgMode is 'theme'
  useSmartTheme({ currentTheme, bgMode, entities, now });

  // ── Entity accessor helpers ────────────────────────────────────────────
  const {
    getS,
    getA,
    getEntityImageUrl,
    callService,
    isSonosActive,
    isMediaActive,
    hvacMap,
    fanMap,
    swingMap,
  } = useEntityHelpers({ entities, conn, activeUrl, language, now, t });

  const personStatus = (id) => (
    <PersonStatus
      key={id}
      id={id}
      entities={entities}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      cardSettings={cardSettings}
      getCardSettingsKey={getCardSettingsKey}
      getEntityImageUrl={getEntityImageUrl}
      getS={getS}
      onOpenPerson={(pid) => setShowPersonModal(pid)}
      onEditCard={(eid, sk) => {
        requestSettingsAccess(() => {
          setShowEditCardModal(eid);
          setEditCardSettingsKey(sk);
        });
      }}
      onRemoveCard={(cardId, listName) => {
        requestSettingsAccess(() => {
          removeCard(cardId, listName);
        });
      }}
      t={t}
    />
  );

  usePopupTriggers({
    entities,
    entitiesLoaded,
    pagesConfig,
    activePage,
    cardSettings,
    getCardSettingsKey,
    editMode,
    modalActions: popupModalActions,
    enabled: hasEnabledPopupTriggers,
  });

  // ── Add-card dialog hook ───────────────────────────────────────────────
  const {
    addCardTargetPage,
    setAddCardTargetPage,
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
  } = useAddCard({
    showAddCardModal,
    activePage,
    isMediaPage,
    pagesConfig,
    persistConfig,
    cardSettings,
    persistCardSettings,
    getCardSettingsKey,
    saveCardSetting,
    setShowAddCardModal,
    setShowEditCardModal,
    setEditCardSettingsKey,
    t,
  });

  const {
    guardedSetShowEditCardModal,
    guardedSetEditMode,
    guardedSetShowAddCardModal,
    guardedSetShowConfigModal,
    guardedSetShowThemeSidebar,
    guardedSetShowLayoutSidebar,
    guardedSetShowHeaderEditModal,
    guardedToggleCardVisibility,
    guardedRemoveCard,
  } = useGuardedUiActions({
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
  });

  const { renderCard, gridLayout, draggingId, touchPath } = useCardRendering({
    editMode,
    pagesConfig,
    setPagesConfig,
    persistConfig,
    activePage,
    setActivePage,
    hiddenCards,
    isCardHiddenByLogic,
    gridColCount,
    gridGapV,
    cardSettings,
    getCardSettingsKey,
    entities,
    entitiesLoaded,
    conn,
    customNames,
    customIcons,
    getA,
    getS,
    getEntityImageUrl,
    callService,
    isMediaActive,
    saveCardSetting,
    language,
    isMobile,
    t,
    optimisticLightBrightness,
    setOptimisticLightBrightness,
    tempHistoryById,
    forecastsById,
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
    setShowAlarmActionModal,
    setShowEditCardModal: guardedSetShowEditCardModal,
    setEditCardSettingsKey,
    setShowCameraModal,
    setActiveMediaId,
    setActiveMediaGroupKey,
    setActiveMediaGroupIds,
    setActiveMediaModal,
    toggleCardVisibility: guardedToggleCardVisibility,
    removeCard: guardedRemoveCard,
    isCardRemovable,
  });

  const {
    dashboardGridPage,
    dashboardGridMedia,
    dashboardGridGrid,
    dashboardGridCards,
    dashboardGridActions,
    modalManagerCore,
    modalManagerState,
    modalManagerAppearance,
    modalManagerLayout,
    modalManagerOnboarding,
    modalManagerPageManagement,
    modalManagerEntityHelpers,
    modalManagerAddCard,
    modalManagerCardConfig,
  } = useAppComposition({
    activePage,
    pagesConfig,
    pageSettings,
    editMode,
    isMediaPage,
    entities,
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
    conn,
    activeUrl,
    connected,
    authRef,
    config,
    setConfig,
    t,
    language,
    setLanguage,
    modals,
    activeVacuumId,
    setActiveVacuumId,
    showThemeSidebar,
    setShowThemeSidebar,
    showLayoutSidebar,
    setShowLayoutSidebar,
    editCardSettingsKey,
    setEditCardSettingsKey,
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
    deletePage,
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
    configTab,
  });

  return (
    <DashboardLayout
      resolvedAppFontFamily={resolvedAppFontFamily}
      bgMode={bgMode}
      editMode={editMode}
      draggingId={draggingId}
      touchPath={touchPath}
      isMobile={isMobile}
      gridColCount={gridColCount}
      dynamicGridColumns={dynamicGridColumns}
      isCompactCards={isCompactCards}
      now={now}
      resolvedHeaderTitle={resolvedHeaderTitle}
      headerScale={headerScale}
      headerSettings={headerSettings}
      setShowHeaderEditModal={setShowHeaderEditModal}
      t={t}
      language={language}
      sectionSpacing={sectionSpacing}
      pagesConfig={pagesConfig}
      personStatus={personStatus}
      requestSettingsAccess={requestSettingsAccess}
      setAddCardTargetPage={setAddCardTargetPage}
      setShowAddCardModal={setShowAddCardModal}
      entities={entities}
      setActiveMediaId={setActiveMediaId}
      setActiveMediaGroupKey={setActiveMediaGroupKey}
      setActiveMediaGroupIds={setActiveMediaGroupIds}
      setActiveMediaSessionSensorIds={setActiveMediaSessionSensorIds}
      setActiveMediaModal={setActiveMediaModal}
      setShowAlarmModal={setShowAlarmModal}
      setShowConfigModal={setShowConfigModal}
      setConfigTab={setConfigTab}
      setShowStatusPillsConfig={setShowStatusPillsConfig}
      isSonosActive={isSonosActive}
      isMediaActive={isMediaActive}
      getA={getA}
      getEntityImageUrl={getEntityImageUrl}
      statusPillsConfig={statusPillsConfig}
      haUnavailableVisible={haUnavailableVisible}
      oauthExpired={oauthExpired}
      pages={pages}
      persistConfig={persistConfig}
      pageSettings={pageSettings}
      activePage={activePage}
      setActivePage={setActivePage}
      setEditingPage={setEditingPage}
      setShowAddPageModal={setShowAddPageModal}
      guardedSetEditMode={guardedSetEditMode}
      guardedSetShowAddCardModal={guardedSetShowAddCardModal}
      guardedSetShowConfigModal={guardedSetShowConfigModal}
      guardedSetShowThemeSidebar={guardedSetShowThemeSidebar}
      guardedSetShowLayoutSidebar={guardedSetShowLayoutSidebar}
      guardedSetShowHeaderEditModal={guardedSetShowHeaderEditModal}
      connected={connected}
      updateCount={updateCount}
      dashboardGridPage={dashboardGridPage}
      dashboardGridMedia={dashboardGridMedia}
      dashboardGridGrid={dashboardGridGrid}
      dashboardGridCards={dashboardGridCards}
      dashboardGridActions={dashboardGridActions}
      modalManagerCore={modalManagerCore}
      modalManagerState={modalManagerState}
      modalManagerAppearance={modalManagerAppearance}
      modalManagerLayout={modalManagerLayout}
      modalManagerOnboarding={modalManagerOnboarding}
      modalManagerPageManagement={modalManagerPageManagement}
      modalManagerEntityHelpers={modalManagerEntityHelpers}
      modalManagerAddCard={modalManagerAddCard}
      modalManagerCardConfig={modalManagerCardConfig}
      mediaTick={mediaTick}
      showPinLockModal={showPinLockModal}
      closePinLockModal={closePinLockModal}
      handlePinSubmit={handlePinSubmit}
      pinLockError={pinLockError}
    />
  );
}

export default function App() {
  const { config } = useConfig();
  const [initialPage] = useState(() => {
    try {
      return localStorage.getItem('tunet_active_page') || 'home';
    } catch {
      return 'home';
    }
  });
  // Detect if we're returning from an OAuth2 redirect
  const isOAuthCallback =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('auth_callback');
  const hasAuth =
    config.token || (config.authMethod === 'oauth' && (hasOAuthTokens() || isOAuthCallback));
  const [showOnboarding, setShowOnboarding] = useState(() => !hasAuth);

  // During onboarding, block token connections but ALLOW OAuth (including callbacks)
  const haConfig = showOnboarding
    ? config.authMethod === 'oauth'
      ? config // OAuth: pass config through so callback can be processed
      : { ...config, token: '' } // Token: block until onboarding finishes
    : config;

  // Key forces HomeAssistantProvider to remount when onboarding completes,
  // ensuring the fresh credentials trigger a new connection attempt.
  const providerKey = showOnboarding ? 'onboarding' : 'live';

  return (
    <HomeAssistantProvider key={providerKey} config={haConfig}>
      <ModalProvider>
        <Routes>
          <Route path="/" element={<Navigate to={`/page/${initialPage}`} replace />} />
          <Route
            path="/page/:pageId"
            element={
              <AppContent showOnboarding={showOnboarding} setShowOnboarding={setShowOnboarding} />
            }
          />
          <Route path="*" element={<Navigate to={`/page/${initialPage}`} replace />} />
        </Routes>
      </ModalProvider>
    </HomeAssistantProvider>
  );
}
