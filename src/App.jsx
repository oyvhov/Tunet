import { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { en, nb, nn, sv, de, DEFAULT_LANGUAGE, normalizeLanguage } from './i18n';
import {
  LayoutGrid,
  Plus,
} from './icons';


import { Header, StatusBar, BackgroundLayer, ConnectionBanner, DragOverlaySVG, EditToolbar } from './layouts';

import {
  PageNavigation,
  PersonStatus,
} from './components';


import {
  HomeAssistantProvider,
  useConfig,
  useHomeAssistant,
  usePages
} from './contexts';

import {
  useModals, useSmartTheme, useTempHistory, useWeatherForecast,
  useAddCard, useConnectionSetup,
  useResponsiveGrid, useEntityHelpers,
  usePageManagement, useDashboardEffects, usePageRouting, useCardRendering,
  useAppComposition, useAppUiState, useSettingsAccessControl, usePopupTriggers,
} from './hooks';

import './styles/dashboard.css';
import { hasOAuthTokens } from './services/oauthStorage';
import { isCardRemovable as _isCardRemovable, isCardHiddenByLogic as _isCardHiddenByLogic, isMediaPage as _isMediaPage } from './utils/cardUtils';
import DashboardGrid from './rendering/DashboardGrid';
import ModalManager from './rendering/ModalManager';
import PinLockModal from './components/ui/PinLockModal';

/** @typedef {import('./types/dashboard').AppContentProps} AppContentProps */

/** @param {AppContentProps} props */
function AppContent({ showOnboarding, setShowOnboarding }) {
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
    setConfig
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
    saveStatusPillsConfig
  } = usePages();

  const {
    entities,
    entitiesLoaded,
    connected,
    haUnavailableVisible,
    oauthExpired,
    conn,
    activeUrl,
    authRef
  } = useHomeAssistant();
  const translations = useMemo(() => ({ en, nb, nn, sv, de }), []);
  const appFontFamilyMap = useMemo(() => ({
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    Inter: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    Roboto: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    Lato: 'Lato, "Helvetica Neue", Arial, sans-serif',
    Montserrat: 'Montserrat, "Helvetica Neue", Arial, sans-serif',
    'Open Sans': '"Open Sans", "Helvetica Neue", Arial, sans-serif',
    Raleway: 'Raleway, "Helvetica Neue", Arial, sans-serif',
  }), []);
  const resolvedAppFontFamily = appFontFamilyMap[appFont] || appFontFamilyMap.sans;
  const t = useCallback((key) => {
    const selectedLanguage = normalizeLanguage(language);
    const value = translations[selectedLanguage]?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key];
    if (value !== undefined) return value;
    return key;
  }, [language, translations]);
  const resolvedHeaderTitle = headerTitle || t('page.home');
  
  // Modal state management
  const modals = useModals();
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
  const { gridColCount, isCompactCards, isMobile } = useResponsiveGrid(effectiveGridColumns, dynamicGridColumns);

  // ── Connection / onboarding hook ───────────────────────────────────────
  const {
    onboardingStep, setOnboardingStep,
    onboardingUrlError, setOnboardingUrlError,
    onboardingTokenError, setOnboardingTokenError,
    testingConnection, testConnection,
    connectionTestResult, setConnectionTestResult,
    configTab, setConfigTab,
    startOAuthLogin, handleOAuthLogout,
    canAdvanceOnboarding, isOnboardingActive,
  } = useConnectionSetup({
    config, setConfig, connected,
    showOnboarding, setShowOnboarding,
    showConfigModal, setShowConfigModal, t,
  });

  const updateCount = Object.values(entities).filter(e => e.entity_id.startsWith('update.') && e.state === 'on' && !e.attributes.skipped_version).length;
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

  // ── Dashboard-level side-effects (timers, title, haptics, idle) ────────
  const {
    now, mediaTick,
    optimisticLightBrightness, setOptimisticLightBrightness,
  } = useDashboardEffects({
    resolvedHeaderTitle, inactivityTimeout,
    resetToHome, activeMediaModal, entities,
  });

  // Smart Theme Logic — only active when bgMode is 'theme'
  useSmartTheme({ currentTheme, bgMode, entities, now });

  // ── Validate persisted activePage still exists in config ───────────────
  useEffect(() => {
    const pages = pagesConfig.pages || [];
    if (activePage !== 'home' && !pages.includes(activePage)) {
      setActivePage('home');
    }
  }, [pagesConfig.pages]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Entity accessor helpers ────────────────────────────────────────────
  const {
    getS, getA, getEntityImageUrl, callService,
    isSonosActive, isMediaActive,
    hvacMap, fanMap, swingMap,
  } = useEntityHelpers({ entities, conn, activeUrl, language, now, t });

  // ── Page management ────────────────────────────────────────────────────
  const {
    newPageLabel, setNewPageLabel,
    newPageIcon, setNewPageIcon,
    editingPage, setEditingPage,
    createPage, createMediaPage, deletePage, removeCard,
  } = usePageManagement({
    pagesConfig, persistConfig, pageSettings, persistPageSettings,
    savePageSetting, pageDefaults: { home: { label: t('page.home'), icon: LayoutGrid } },
    activePage, setActivePage,
    showAddPageModal, setShowAddPageModal,
    showAddCardModal, setShowAddCardModal, t,
  });

  const personStatus = (id) => (
    <PersonStatus
      key={id} id={id} entities={entities} editMode={editMode}
      customNames={customNames} customIcons={customIcons}
      cardSettings={cardSettings} getCardSettingsKey={getCardSettingsKey}
      getEntityImageUrl={getEntityImageUrl} getS={getS}
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

  const pageDefaults = {
    home: { label: t('page.home'), icon: LayoutGrid }
  };
  const pages = (pagesConfig.pages || []).map(id => ({
    id,
    label: pageDefaults[id]?.label || id,
    icon: pageDefaults[id]?.icon || LayoutGrid
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
    addCardTargetPage, setAddCardTargetPage,
    addCardType, setAddCardType,
    searchTerm, setSearchTerm,
    selectedEntities, setSelectedEntities,
    selectedWeatherId, setSelectedWeatherId,
    selectedTempId, setSelectedTempId,
    selectedAndroidTVMediaId, setSelectedAndroidTVMediaId,
    selectedAndroidTVRemoteId, setSelectedAndroidTVRemoteId,
    selectedCostTodayId, setSelectedCostTodayId,
    selectedCostMonthId, setSelectedCostMonthId,
    costSelectionTarget, setCostSelectionTarget,
    selectedNordpoolId, setSelectedNordpoolId,
    nordpoolDecimals, setNordpoolDecimals,
    selectedSpacerVariant, setSelectedSpacerVariant,
    onAddSelected,
    getAddCardAvailableLabel,
    getAddCardNoneLeftLabel,
  } = useAddCard({
    showAddCardModal, activePage, isMediaPage,
    pagesConfig, persistConfig,
    cardSettings, persistCardSettings, getCardSettingsKey, saveCardSetting,
    setShowAddCardModal, setShowEditCardModal, setEditCardSettingsKey, t,
  });

  const guardedSetShowEditCardModal = (value) => {
    if (value == null || value === false) {
      setShowEditCardModal(value);
      return;
    }
    requestSettingsAccess(() => {
      setShowEditCardModal(value);
    });
  };

  const applySettingsGuardToBooleanSetter = useCallback((show, setter) => {
    if (!show) {
      setter(false);
      return;
    }
    requestSettingsAccess(() => {
      setter(true);
    });
  }, [requestSettingsAccess]);

  const guardedSetEditMode = useCallback((nextValue) => {
    const resolved = typeof nextValue === 'function' ? nextValue(editMode) : nextValue;
    if (!resolved) {
      setEditMode(false);
      return;
    }
    requestSettingsAccess(() => {
      setEditMode(true);
    });
  }, [editMode, requestSettingsAccess, setEditMode]);

  const guardedSetShowAddCardModal = useCallback((show) => {
    applySettingsGuardToBooleanSetter(show, setShowAddCardModal);
  }, [applySettingsGuardToBooleanSetter, setShowAddCardModal]);

  const guardedSetShowConfigModal = useCallback((show) => {
    applySettingsGuardToBooleanSetter(show, setShowConfigModal);
  }, [applySettingsGuardToBooleanSetter, setShowConfigModal]);

  const guardedSetShowThemeSidebar = useCallback((show) => {
    applySettingsGuardToBooleanSetter(show, setShowThemeSidebar);
  }, [applySettingsGuardToBooleanSetter, setShowThemeSidebar]);

  const guardedSetShowLayoutSidebar = useCallback((show) => {
    applySettingsGuardToBooleanSetter(show, setShowLayoutSidebar);
  }, [applySettingsGuardToBooleanSetter, setShowLayoutSidebar]);

  const guardedSetShowHeaderEditModal = useCallback((show) => {
    applySettingsGuardToBooleanSetter(show, setShowHeaderEditModal);
  }, [applySettingsGuardToBooleanSetter, setShowHeaderEditModal]);

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

  const {
    renderCard,
    gridLayout,
    draggingId,
    touchPath,
  } = useCardRendering({
    editMode,
    pagesConfig,
    setPagesConfig,
    persistConfig,
    activePage,
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
    <div className="min-h-screen font-sans selection:bg-[var(--accent-bg)] overflow-x-hidden transition-colors duration-500" style={{backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', '--font-sans': resolvedAppFontFamily, fontFamily: resolvedAppFontFamily}}>
      <BackgroundLayer bgMode={bgMode} />
      {editMode && draggingId && touchPath && <DragOverlaySVG touchPath={touchPath} />}
      <div
        role="main"
        aria-label="Dashboard"
        className={`relative z-10 w-full max-w-[1600px] mx-auto py-6 md:py-10 ${
          isMobile
            ? 'px-5 mobile-grid'
            : (gridColCount === 1
              ? 'px-10 sm:px-16 md:px-24'
              : (gridColCount === 3
                ? (dynamicGridColumns ? 'px-4 md:px-12' : 'px-4 md:px-20')
                : 'px-6 md:px-20'))
        } ${isCompactCards ? 'compact-cards' : ''}`}
      >
        <Header
          now={now}
          headerTitle={resolvedHeaderTitle}
          headerScale={headerScale}
          editMode={editMode}
          headerSettings={headerSettings}
          setShowHeaderEditModal={setShowHeaderEditModal}
          t={t}
          language={language}
          isMobile={isMobile}
          sectionSpacing={sectionSpacing}
        >
          <div
            className={`w-full mt-0 font-sans ${isMobile ? 'flex flex-col items-start gap-3' : 'flex items-center justify-between'}`}
            style={{ marginTop: `${sectionSpacing?.headerToStatus ?? 0}px` }}
          >
            <div className={`flex flex-wrap gap-2.5 items-center min-w-0 ${isMobile ? 'scale-90 origin-left w-full' : ''}`}>
              {(pagesConfig.header || []).map(id => personStatus(id))}
              {editMode && (
                <button 
                  onClick={() => {
                    requestSettingsAccess(() => {
                      setAddCardTargetPage('header');
                      setShowAddCardModal(true);
                    });
                  }} 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent-color) 14%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-color) 28%, transparent)',
                    color: 'var(--accent-color)'
                  }}
                >
                  <Plus className="w-3 h-3" /> {t('addCard.type.entity')}
                </button>
              )}
              {(pagesConfig.header || []).length > 0 && <div className="w-px h-8 bg-[var(--glass-border)] mx-2"></div>}
            </div>
            <div className={`min-w-0 ${isMobile ? 'w-full' : 'flex-1'}`}>
              <StatusBar
                entities={entities}
                now={now}
                setActiveMediaId={setActiveMediaId}
                setActiveMediaGroupKey={setActiveMediaGroupKey}
                setActiveMediaGroupIds={setActiveMediaGroupIds}
                setActiveMediaSessionSensorIds={setActiveMediaSessionSensorIds}
                setActiveMediaModal={setActiveMediaModal}
                setShowAlarmModal={setShowAlarmModal}
                setShowUpdateModal={() => { setShowConfigModal(true); setConfigTab('updates'); }}
                setShowStatusPillsConfig={setShowStatusPillsConfig}
                editMode={editMode}
                t={t}
                isSonosActive={isSonosActive}
                isMediaActive={isMediaActive}
                getA={getA}
                getEntityImageUrl={getEntityImageUrl}
                statusPillsConfig={statusPillsConfig}
                isMobile={isMobile}
              />
            </div>
          </div>
        </Header>

        {haUnavailableVisible && (
          <ConnectionBanner
            oauthExpired={oauthExpired}
            onReconnect={() => { setShowConfigModal(true); setConfigTab('connection'); }}
            t={t}
          />
        )}

        <div
          className="flex flex-nowrap items-center justify-between gap-4"
          style={{ marginBottom: `${sectionSpacing?.navToGrid ?? 24}px` }}
        >
          <PageNavigation
            pages={pages}
            pagesConfig={pagesConfig}
            persistConfig={persistConfig}
            pageSettings={pageSettings}
            activePage={activePage}
            setActivePage={setActivePage}
            editMode={editMode}
            setEditingPage={setEditingPage}
            setShowAddPageModal={setShowAddPageModal}
            t={t}
          />
          <EditToolbar
            editMode={editMode}
            setEditMode={guardedSetEditMode}
            activePage={activePage}
            pageSettings={pageSettings}
            setActivePage={setActivePage}
            setShowAddCardModal={guardedSetShowAddCardModal}
            setShowConfigModal={guardedSetShowConfigModal}
            setConfigTab={setConfigTab}
            setShowThemeSidebar={guardedSetShowThemeSidebar}
            setShowLayoutSidebar={guardedSetShowLayoutSidebar}
            setShowHeaderEditModal={guardedSetShowHeaderEditModal}
            connected={connected}
            updateCount={updateCount}
            t={t}
          />
        </div>

        <DashboardGrid
          page={dashboardGridPage}
          media={dashboardGridMedia}
          grid={dashboardGridGrid}
          cards={dashboardGridCards}
          actions={dashboardGridActions}
          t={t}
        />
        
        <ModalManager
          core={modalManagerCore}
          modalState={modalManagerState}
          appearance={modalManagerAppearance}
          layout={modalManagerLayout}
          onboarding={modalManagerOnboarding}
          pageManagement={modalManagerPageManagement}
          entityHelpers={modalManagerEntityHelpers}
          addCard={modalManagerAddCard}
          cardConfig={modalManagerCardConfig}
          mediaTick={mediaTick}
        />

        <PinLockModal
          open={showPinLockModal}
          onClose={closePinLockModal}
          onSubmit={handlePinSubmit}
          t={t}
          error={pinLockError}
        />
      </div>
    </div>
  );
}

export default function App() {
  const { config } = useConfig();
  const [initialPage] = useState(() => {
    try { return localStorage.getItem('tunet_active_page') || 'home'; }
    catch { return 'home'; }
  });
  // Detect if we're returning from an OAuth2 redirect
  const isOAuthCallback = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('auth_callback');
  const hasAuth = config.token || (config.authMethod === 'oauth' && (hasOAuthTokens() || isOAuthCallback));
  const [showOnboarding, setShowOnboarding] = useState(() => !hasAuth);

  // During onboarding, block token connections but ALLOW OAuth (including callbacks)
  const haConfig = showOnboarding
    ? config.authMethod === 'oauth'
      ? config                     // OAuth: pass config through so callback can be processed
      : { ...config, token: '' }   // Token: block until onboarding finishes
    : config;

  // Key forces HomeAssistantProvider to remount when onboarding completes,
  // ensuring the fresh credentials trigger a new connection attempt.
  const providerKey = showOnboarding ? 'onboarding' : 'live';

  return (
    <HomeAssistantProvider key={providerKey} config={haConfig}>
      <Routes>
        <Route path="/" element={<Navigate to={`/page/${initialPage}`} replace />} />
        <Route
          path="/page/:pageId"
          element={(
            <AppContent
              showOnboarding={showOnboarding}
              setShowOnboarding={setShowOnboarding}
            />
          )}
        />
        <Route path="*" element={<Navigate to={`/page/${initialPage}`} replace />} />
      </Routes>
    </HomeAssistantProvider>
  );
}
