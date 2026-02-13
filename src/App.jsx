import { useState, useMemo, useRef, useCallback } from 'react';
import { en, nn } from './i18n';
import {
  AlertTriangle,
  Check,
  Edit2,
  LayoutGrid,
  Plus,
} from './icons';


import SettingsDropdown from './components/SettingsDropdown';

import { Header, StatusBar } from './layouts';

import {
  MediaPage,
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
  useModals, useSmartTheme, useTempHistory,
  useAddCard, useConnectionSetup,
  useResponsiveGrid, useEntityHelpers,
  usePageManagement, useDashboardEffects,
} from './hooks';

import { formatDuration } from './utils';
import './dashboard.css';
import { hasOAuthTokens } from './services/oauthStorage';
import { isCardRemovable as _isCardRemovable, isCardHiddenByLogic as _isCardHiddenByLogic, isMediaPage as _isMediaPage } from './cardUtils';
import { getCardGridSpan as _getCardGridSpan, buildGridLayout as _buildGridLayout } from './gridLayout';
import { createDragAndDropHandlers } from './dragAndDrop';
import { dispatchCardRender } from './rendering/cardRenderers';
import ModalOrchestrator from './rendering/ModalOrchestrator';
import CardErrorBoundary from './components/CardErrorBoundary';
import EditOverlay from './components/EditOverlay';
import AuroraBackground from './components/AuroraBackground';

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
    savePageSetting,
    gridColumns,
    setGridColumns,
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
    connected,
    haUnavailableVisible,
    oauthExpired,
    conn,
    activeUrl,
    authRef
  } = useHomeAssistant();
  const translations = useMemo(() => ({ en, nn }), []);
  const nnFallback = useMemo(() => ({
    'system.tabHeader': 'Topptekst',
    'system.tabLayout': 'Oppsett'
  }), []);
  const t = (key) => {
    const value = translations[language]?.[key] ?? translations.nn[key];
    if (value !== undefined) return value;
    if (language === 'nn' && nnFallback[key]) return nnFallback[key];
    return key;
  };
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
    setShowSensorInfoModal,
    setShowCalendarModal,
    setShowTodoModal,
    setShowRoomModal,
    setShowWeatherModal,
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
  
  const [activeVacuumId, setActiveVacuumId] = useState(null);
  const [showThemeSidebar, setShowThemeSidebar] = useState(false);
  const [showLayoutSidebar, setShowLayoutSidebar] = useState(false);
  const [editCardSettingsKey, setEditCardSettingsKey] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [activePage, setActivePage] = useState('home');
  const dragSourceRef = useRef(null);
  const touchTargetRef = useRef(null);
  const [touchTargetId, setTouchTargetId] = useState(null);
  const [touchPath, setTouchPath] = useState(null);
  const touchSwapCooldownRef = useRef(0);
  const pointerDragRef = useRef(false);
  const ignoreTouchRef = useRef(false);
  const [tempHistoryById, _setTempHistoryById] = useTempHistory(conn, cardSettings);

  // ── Responsive grid ────────────────────────────────────────────────────
  const { gridColCount, isCompactCards, isMobile } = useResponsiveGrid(gridColumns);

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
      onEditCard={(eid, sk) => { setShowEditCardModal(eid); setEditCardSettingsKey(sk); }}
      onRemoveCard={removeCard} t={t}
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
    onAddSelected,
    getAddCardAvailableLabel,
    getAddCardNoneLeftLabel,
  } = useAddCard({
    showAddCardModal, activePage, isMediaPage,
    pagesConfig, persistConfig,
    cardSettings, persistCardSettings, getCardSettingsKey, saveCardSetting,
    setShowAddCardModal, setShowEditCardModal, setEditCardSettingsKey, t,
  });

  const getCardGridSpan = (cardId) => _getCardGridSpan(cardId, getCardSettingsKey, cardSettings, activePage);

  const moveCardInArray = useCallback((cardId, direction) => {
    const newConfig = { ...pagesConfig };
    const pageCards = newConfig[activePage];
    const currentIndex = pageCards.indexOf(cardId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= pageCards.length) return;

    // Swap cards
    [pageCards[currentIndex], pageCards[newIndex]] = [pageCards[newIndex], pageCards[currentIndex]];
    
    persistConfig(newConfig);
  }, [pagesConfig, activePage, persistConfig]);

  const gridLayout = useMemo(() => {
    const ids = pagesConfig[activePage] || [];
    const visibleIds = editMode ? ids : ids.filter(id => !(hiddenCards.includes(id) || isCardHiddenByLogic(id)));
    return _buildGridLayout(visibleIds, gridColCount, getCardGridSpan);
  }, [pagesConfig, activePage, gridColCount, cardSettings, hiddenCards, editMode, entities]);

  const dragAndDrop = createDragAndDropHandlers({
    editMode,
    pagesConfig,
    setPagesConfig,
    persistConfig,
    activePage,
    dragSourceRef,
    touchTargetRef,
    touchSwapCooldownRef,
    touchPath,
    setTouchPath,
    touchTargetId,
    setTouchTargetId,
    setDraggingId,
    ignoreTouchRef
  });

  const renderCard = (cardId, index, colIndex) => {
    const isHidden = hiddenCards.includes(cardId) || isCardHiddenByLogic(cardId);
    if (isHidden && !editMode) return null;
    const isDragging = draggingId === cardId;

    const {
      getDragProps,
      getCardStyle,
      startTouchDrag,
      updateTouchDrag,
      performTouchDrop,
      resetDragState
    } = dragAndDrop;

    const dragProps = getDragProps({ cardId, index, colIndex });
    const baseCardStyle = getCardStyle({ cardId, isHidden, isDragging });
    
    // Removed animation delay to prevent slow reanimation on card move
    const cardStyle = baseCardStyle;

    const settingsKey = getCardSettingsKey(cardId);

    const getControls = (targetId) => {
      if (!editMode) return null;
      const editId = targetId || cardId;
      const isHidden = hiddenCards.includes(cardId) || isCardHiddenByLogic(cardId);
      const settings = cardSettings[settingsKey] || cardSettings[editId] || {};

      return (
        <EditOverlay
          cardId={cardId}
          editId={editId}
          settingsKey={settingsKey}
          isHidden={isHidden}
          currentSize={cardSettings[settingsKey]?.size || 'large'}
          settings={settings}
          canRemove={isCardRemovable(cardId)}
          onMoveLeft={() => moveCardInArray(cardId, 'left')}
          onMoveRight={() => moveCardInArray(cardId, 'right')}
          onEdit={() => { setShowEditCardModal(editId); setEditCardSettingsKey(settingsKey); }}
          onToggleVisibility={() => toggleCardVisibility(cardId)}
          onSaveSize={(size) => saveCardSetting(settingsKey, 'size', size)}
          onRemove={() => removeCard(cardId)}
          dragHandleProps={{
            onContextMenu: (e) => e.preventDefault(),
            onPointerDown: (e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              pointerDragRef.current = true;
              ignoreTouchRef.current = true;
              startTouchDrag(cardId, index, colIndex, e.clientX, e.clientY);
            },
            onPointerMove: (e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              if (!pointerDragRef.current) return;
              e.preventDefault();
              updateTouchDrag(e.clientX, e.clientY);
            },
            onPointerUp: (e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              if (!pointerDragRef.current) return;
              e.preventDefault();
              pointerDragRef.current = false;
              ignoreTouchRef.current = false;
              performTouchDrop(e.clientX, e.clientY);
              resetDragState();
            },
            onPointerCancel: (e) => {
              if (!editMode || e.pointerType !== 'touch') return;
              if (!pointerDragRef.current) return;
              e.preventDefault();
              pointerDragRef.current = false;
              ignoreTouchRef.current = false;
              const x = touchPath?.x ?? e.clientX;
              const y = touchPath?.y ?? e.clientY;
              performTouchDrop(x, y);
              resetDragState();
            },
          }}
          t={t}
        />
      );
    };

    // Build shared context for card renderers
    const ctx = {
      entities, editMode, conn, cardSettings, customNames, customIcons,
      getA, getS, getEntityImageUrl, callService, isMediaActive,
      saveCardSetting, language, isMobile, activePage, t,
      optimisticLightBrightness, setOptimisticLightBrightness,
      tempHistoryById, isCardHiddenByLogic,
      // Modal openers
      setShowLightModal, setShowSensorInfoModal, setActiveClimateEntityModal,
      setShowCostModal, setActiveVacuumId, setShowVacuumModal,
      setShowAndroidTVModal, setActiveCarModal, setShowWeatherModal,
      setShowNordpoolModal, setShowCalendarModal, setShowTodoModal,
      setShowRoomModal, setShowEditCardModal, setEditCardSettingsKey,
      openMediaModal: (mpId, groupKey, groupIds) => {
        setActiveMediaId(mpId);
        setActiveMediaGroupKey(groupKey);
        setActiveMediaGroupIds(groupIds);
        setActiveMediaModal('media');
      },
    };

    return dispatchCardRender(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-blue-500/30 overflow-x-hidden transition-colors duration-500" style={{backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)'}}>
      {bgMode === 'animated' ? (
        <AuroraBackground />
      ) : (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0" style={{background: 'linear-gradient(to bottom right, var(--bg-gradient-from), var(--bg-primary), var(--bg-gradient-to))'}} />
          <div className="absolute top-[-15%] right-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none" style={{background: 'rgba(59, 130, 246, 0.08)', filter: 'blur(150px)'}} />
          <div className="absolute bottom-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none" style={{background: 'rgba(30, 58, 138, 0.1)', filter: 'blur(150px)'}} />
        </div>
      )}
      {editMode && draggingId && touchPath && (
        <svg className="fixed inset-0 pointer-events-none z-40">
          <line
            x1={touchPath.startX}
            y1={touchPath.startY}
            x2={touchPath.x}
            y2={touchPath.y}
            stroke="rgba(59, 130, 246, 0.6)"
            strokeWidth="3"
            strokeDasharray="6 6"
          />
          <circle cx={touchPath.startX} cy={touchPath.startY} r="6" fill="rgba(59, 130, 246, 0.6)" />
          <circle cx={touchPath.x} cy={touchPath.y} r="8" fill="rgba(59, 130, 246, 0.9)" />
        </svg>
      )}
      <div
        className={`relative z-10 w-full max-w-[1600px] mx-auto py-6 md:py-10 ${
          isMobile ? 'px-5 mobile-grid' : (gridColCount === 1 ? 'px-10 sm:px-16 md:px-24' : 'px-6 md:px-20')
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
                  onClick={() => { setAddCardTargetPage('header'); setShowAddCardModal(true); }} 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all text-[10px] font-bold uppercase tracking-[0.2em]"
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
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 px-4 sm:px-6 py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-300" />
            <div className="text-sm font-semibold">
              {oauthExpired ? t('system.oauth.expired') : t('ha.unavailable')}
            </div>
            {oauthExpired && (
              <button
                onClick={() => { setShowConfigModal(true); setConfigTab('connection'); }}
                className="ml-auto px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 text-xs font-bold uppercase tracking-wider transition-colors border border-yellow-500/30"
              >
                {t('system.oauth.loginButton')}
              </button>
            )}
          </div>
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
          <div className="relative flex items-center gap-6 flex-shrink-0 overflow-visible pb-2 justify-end">
            {editMode && <button onClick={() => setShowAddCardModal(true)} className="group flex items-center gap-2 text-xs font-bold uppercase text-blue-400 hover:text-white transition-all whitespace-nowrap"><Plus className="w-4 h-4" /> {t('nav.addCard')}</button>}
            {editMode && (
              <button onClick={() => {
                const currentSettings = pageSettings[activePage];
                if (currentSettings?.hidden) setActivePage('home');
                setEditMode(false);
              }} className="group flex items-center gap-2 text-xs font-bold uppercase text-green-400 hover:text-white transition-all whitespace-nowrap">
                <Check className="w-4 h-4" /> {t('nav.done')}
              </button>
            )}
            
            <button 
              onClick={() => {
                const currentSettings = pageSettings[activePage];
                if (currentSettings?.hidden) setActivePage('home');
                setEditMode(!editMode);
              }} 
              className={`p-2 rounded-full group ${editMode ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--text-secondary)]'}`}
              title={editMode ? t('nav.done') : t('menu.edit')}
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <div className="relative">
              <SettingsDropdown 
                onOpenSettings={() => { setShowConfigModal(true); setConfigTab('connection'); }}
                onOpenTheme={() => setShowThemeSidebar(true)}
                onOpenLayout={() => setShowLayoutSidebar(true)}
                onOpenHeader={() => setShowHeaderEditModal(true)}
                t={t}
              />
              {updateCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center border-2 border-[var(--card-bg)] pointer-events-none shadow-sm">
                  <span className="text-[11px] font-bold text-white leading-none pt-[1px]">{updateCount}</span>
                </div>
              )}
            </div>
            {!connected && <div className={`flex items-center justify-center h-8 w-8 rounded-full transition-all border flex-shrink-0`} style={{backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(239, 68, 68, 0.2)'}}><div className="h-2 w-2 rounded-full" style={{backgroundColor: '#ef4444'}} /></div>}
          </div>
        </div>

        {isMediaPage(activePage) ? (
          <div key={activePage} className="page-transition">
            <MediaPage
              pageId={activePage}
              entities={entities}
              pageSettings={pageSettings}
              editMode={editMode}
              isSonosActive={isSonosActive}
              activeMediaId={activeMediaId}
              setActiveMediaId={setActiveMediaId}
              getA={getA}
              getEntityImageUrl={getEntityImageUrl}
              callService={callService}
              savePageSetting={savePageSetting}
              formatDuration={formatDuration}
              t={t}
            />
          </div>
        ) : (pagesConfig[activePage] || []).filter(id => gridLayout[id]).length === 0 ? (
          <div key={`${activePage}-empty`} className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 opacity-90 animate-in fade-in zoom-in duration-500 font-sans">
             <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] p-5 rounded-full mb-6 shadow-lg shadow-black/5">
                <LayoutGrid className="w-12 h-12 text-[var(--text-primary)] opacity-80" />
             </div>
             
             <h2 className="text-3xl font-light mb-3 text-[var(--text-primary)] uppercase tracking-tight">{t('welcome.title')}</h2>
             <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-md leading-relaxed">{t('welcome.subtitle')}</p>
             
             <div className="flex gap-4">
                  <button 
                    onClick={() => setShowAddCardModal(true)} 
                    className="flex items-center gap-3 px-8 py-4 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all duration-200 font-bold uppercase tracking-widest text-sm"
                  >
                     <Plus className="w-5 h-5" />
                     {t('welcome.addCard')}
                  </button>
             </div>

             <div className="mt-12 max-w-xs mx-auto p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest leading-relaxed">
                   {t('welcome.editHint')}
                </p>
             </div>
          </div>
        ) : (
          <div key={activePage} className="grid font-sans page-transition items-start" style={{ gap: isMobile ? '12px' : `${gridGapV}px ${gridGapH}px`, gridAutoRows: isMobile ? '82px' : '100px', gridTemplateColumns: `repeat(${gridColCount}, minmax(0, 1fr))` }}>
            {(pagesConfig[activePage] || [])
              .map((id) => ({ id, placement: gridLayout[id] }))
              .filter(({ placement }) => placement)
              .sort((a, b) => {
                if (a.placement.row !== b.placement.row) return a.placement.row - b.placement.row;
                return a.placement.col - b.placement.col;
              })
              .map(({ id }, _sortedIndex) => {
              const index = (pagesConfig[activePage] || []).indexOf(id);
              const placement = gridLayout[id];
              const isCalendarCard = id.startsWith('calendar_card_');
              const isTodoCard = id.startsWith('todo_card_');
              const isLargeCard = isCalendarCard || isTodoCard;
              const sizeSetting = isLargeCard ? (cardSettings[getCardSettingsKey(id)]?.size || cardSettings[id]?.size) : null;
              const forcedSpan = isLargeCard
                ? (sizeSetting === 'small' ? 1 : (sizeSetting === 'medium' ? 2 : 4))
                : placement?.span;
              const settingsKey = getCardSettingsKey(id);
              const heading = cardSettings[settingsKey]?.heading;

              if (!editMode && (hiddenCards.includes(id) || isCardHiddenByLogic(id))) return null;

              const cardContent = renderCard(id, index);
              if (!cardContent) return null;

              return (
                <div
                  key={id}
                  className={`h-full relative ${(isCompactCards || isMobile) ? 'card-compact' : ''}`}
                  style={{
                    gridRowStart: placement.row,
                    gridColumnStart: placement.col,
                    gridRowEnd: `span ${forcedSpan}`,
                    minHeight: isLargeCard && sizeSetting !== 'small' && sizeSetting !== 'medium' ? `${(4 * 100) + (3 * (isMobile ? 12 : gridGapV))}px` : undefined
                  }}
                >
                  {heading && (
                    <div className="absolute -top-4 left-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-secondary)]">
                      {heading}
                    </div>
                  )}
                  <div className="h-full">
                    <CardErrorBoundary cardId={id} t={t}>
                      {cardContent}
                    </CardErrorBoundary>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <ModalOrchestrator
          entities={entities} conn={conn} activeUrl={activeUrl}
          connected={connected} authRef={authRef}
          config={config} setConfig={setConfig}
          t={t} language={language} setLanguage={setLanguage}
          modals={{
            ...modals,
            activeVacuumId, setActiveVacuumId,
            showThemeSidebar, setShowThemeSidebar,
            showLayoutSidebar, setShowLayoutSidebar,
            editCardSettingsKey, setEditCardSettingsKey,
            configTab, setConfigTab,
          }}
          appearance={{
            currentTheme, setCurrentTheme,
            bgMode, setBgMode, bgColor, setBgColor,
            bgGradient, setBgGradient, bgImage, setBgImage,
            cardTransparency, setCardTransparency,
            cardBorderOpacity, setCardBorderOpacity,
            inactivityTimeout, setInactivityTimeout,
          }}
          layout={{
            gridGapH, setGridGapH, gridGapV, setGridGapV,
            gridColumns, setGridColumns,
            cardBorderRadius, setCardBorderRadius,
            sectionSpacing, updateSectionSpacing,
            headerTitle, headerScale, headerSettings,
            updateHeaderTitle, updateHeaderScale, updateHeaderSettings,
          }}
          onboarding={{
            showOnboarding, setShowOnboarding, isOnboardingActive,
            onboardingStep, setOnboardingStep,
            onboardingUrlError, setOnboardingUrlError,
            onboardingTokenError, setOnboardingTokenError,
            testingConnection, testConnection,
            connectionTestResult, setConnectionTestResult,
            startOAuthLogin, handleOAuthLogout, canAdvanceOnboarding,
          }}
          pageManagement={{
            pageDefaults, editingPage, setEditingPage,
            newPageLabel, setNewPageLabel, newPageIcon, setNewPageIcon,
            createPage, createMediaPage, deletePage,
            pageSettings, savePageSetting,
            pagesConfig, persistConfig, activePage,
          }}
          entityHelpers={{
            callService, getEntityImageUrl, getA, getS,
            optimisticLightBrightness, setOptimisticLightBrightness,
            hvacMap, fanMap, swingMap,
            isSonosActive, isMediaActive,
          }}
          addCard={{
            addCardTargetPage, addCardType, setAddCardType,
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
            onAddSelected,
            getAddCardAvailableLabel, getAddCardNoneLeftLabel,
          }}
          cardConfig={{
            cardSettings, saveCardSetting, persistCardSettings,
            customNames, saveCustomName,
            customIcons, saveCustomIcon,
            hiddenCards, toggleCardVisibility,
            getCardSettingsKey,
            statusPillsConfig, saveStatusPillsConfig,
          }}
          mediaTick={mediaTick}
        />
      </div>
    </div>
  );
}

export default function App() {
  const { config } = useConfig();
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

  return (
    <HomeAssistantProvider config={haConfig}>
      <AppContent
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
      />
    </HomeAssistantProvider>
  );
}