import { Profiler, memo, useCallback, useEffect, useRef } from 'react';
import { Plus } from '../icons';
import Header from './Header';
import StatusBar from './StatusBar';
import BackgroundLayer from './BackgroundLayer';
import ConnectionBanner from './ConnectionBanner';
import DragOverlaySVG from './DragOverlaySVG';
import EditToolbar from './EditToolbar';
import SettingsMenuControl from './SettingsMenuControl';
import { PageNavigation } from '../components';
import DashboardGrid from '../rendering/DashboardGrid';
import SettingsPinLockModal from '../components/ui/SettingsPinLockModal';
import { useOptionalToast } from '../contexts/ToastContext';

const MemoStatusBar = memo(StatusBar);
const MemoDashboardGrid = memo(DashboardGrid);

const CARDS_ONLY_EXIT_MS = 1000;
const CARDS_ONLY_LONG_PRESS_IGNORE_SELECTOR = [
  '[data-dashboard-card]',
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[contenteditable="true"]',
].join(',');

/** @param {any} props */
export default function DashboardLayout(props) {
  const {
    resolvedAppFontFamily,
    editMode,
    draggingId,
    touchPath,
    isMobile,
    gridColCount,
    dynamicGridColumns,
    isCompactCards,
    now,
    resolvedHeaderTitle,
    headerScale,
    headerSettings,
    setShowHeaderEditModal,
    t,
    sectionSpacing,
    cardsOnlyMode,
    updateCardsOnlyMode,
    pagesConfig,
    pageSettings = {},
    personStatus,
    requestSettingsAccess,
    setAddCardTargetPage,
    setShowAddCardModal,
    setConfigTab,
    isSonosActive,
    isMediaActive,
    getA,
    getEntityImageUrl,
    pages,
    activePage,
    setActivePage,
    setEditingPage,
    guardedSetEditMode,
    guardedSetShowAddCardModal,
    guardedSetShowConfigModal,
    guardedSetShowThemeSidebar,
    guardedSetShowLayoutSidebar,
    guardedSetShowHeaderEditModal,
    connected,
    updateCount,
    dashboardGridPage,
    dashboardGridMedia,
    dashboardGridGrid,
    dashboardGridCards,
    dashboardGridActions,
    showPinLockModal,
    closePinLockModal,
    handlePinSubmit,
    pinLockError,
  } = props;

  const toast = useOptionalToast();
  const addToast = toast?.addToast;
  const cardsOnlyExitTimerRef = useRef(null);
  const wasCardsOnlyRef = useRef(cardsOnlyMode);
  const showDashboardChrome = !cardsOnlyMode;

  useEffect(() => {
    if (cardsOnlyMode && !wasCardsOnlyRef.current) {
      addToast?.(t('header.cardsOnlyExitHint'), 'info');
    }
    wasCardsOnlyRef.current = cardsOnlyMode;
  }, [addToast, cardsOnlyMode, t]);

  const handleToggleEdit = useCallback(() => {
    const currentSettings = pageSettings[activePage];
    if (currentSettings?.hidden) setActivePage('home');
    if (editMode && typeof window !== 'undefined') {
      window.dispatchEvent(new window.CustomEvent('tunet:edit-done'));
    }
    guardedSetEditMode(!editMode);
  }, [activePage, editMode, guardedSetEditMode, pageSettings, setActivePage]);

  const handleAddCard = useCallback(() => {
    guardedSetShowAddCardModal(true);
  }, [guardedSetShowAddCardModal]);

  const clearCardsOnlyLongPress = useCallback(() => {
    if (cardsOnlyExitTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(cardsOnlyExitTimerRef.current);
    }
    cardsOnlyExitTimerRef.current = null;
  }, []);

  const shouldIgnoreCardsOnlyLongPress = useCallback((target) => {
    return Boolean(target?.closest?.(CARDS_ONLY_LONG_PRESS_IGNORE_SELECTOR));
  }, []);

  const handleCardsOnlyPointerDown = useCallback(
    (event) => {
      if (!cardsOnlyMode || typeof updateCardsOnlyMode !== 'function') return;
      if (event.button !== 0) return;
      if (shouldIgnoreCardsOnlyLongPress(event.target)) return;

      clearCardsOnlyLongPress();
      cardsOnlyExitTimerRef.current = window.setTimeout(() => {
        cardsOnlyExitTimerRef.current = null;
        updateCardsOnlyMode(false);
      }, CARDS_ONLY_EXIT_MS);
    },
    [cardsOnlyMode, clearCardsOnlyLongPress, shouldIgnoreCardsOnlyLongPress, updateCardsOnlyMode]
  );

  useEffect(() => {
    if (!cardsOnlyMode || typeof updateCardsOnlyMode !== 'function') return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') updateCardsOnlyMode(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cardsOnlyMode, updateCardsOnlyMode]);

  useEffect(() => clearCardsOnlyLongPress, [clearCardsOnlyLongPress]);

  let profilingEnabled = false;
  try {
    profilingEnabled =
      typeof window !== 'undefined' &&
      window.localStorage?.getItem('tunet_profile_renders') === '1';
  } catch {
    profilingEnabled = false;
  }

  const onProfileRender = useCallback(
    (id, phase, actualDuration, baseDuration) => {
      if (!profilingEnabled || actualDuration < 8) return;
      console.warn(
        `[RenderProfile] ${id} ${phase} actual=${actualDuration.toFixed(2)}ms base=${baseDuration.toFixed(2)}ms`
      );
    },
    [profilingEnabled]
  );

  const withProfiler = useCallback(
    (id, element) => {
      if (!profilingEnabled) return element;
      return (
        <Profiler id={id} onRender={onProfileRender}>
          {element}
        </Profiler>
      );
    },
    [profilingEnabled, onProfileRender]
  );

  const personHeader = (
    <div
      className={`flex items-center ${isMobile ? 'shrink-0 [zoom:0.9] gap-2 empty:hidden' : 'min-w-0 flex-wrap gap-2.5'}`}
    >
      {(pagesConfig.header || []).map((id) => personStatus(id))}
      {editMode && (
        <button
          onClick={() => {
            requestSettingsAccess(() => {
              setAddCardTargetPage('header');
              setShowAddCardModal(true);
            });
          }}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold tracking-[0.2em] uppercase transition-all"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent-color) 14%, transparent)',
            borderColor: 'color-mix(in srgb, var(--accent-color) 28%, transparent)',
            color: 'var(--accent-color)',
          }}
        >
          <Plus className="h-3 w-3" /> {t('addCard.type.entity')}
        </button>
      )}
      {(pagesConfig.header || []).length > 0 && !isMobile && (
        <div className="mx-2 h-8 w-px bg-[var(--glass-border)]"></div>
      )}
    </div>
  );

  return (
    <div
      className="min-h-screen overflow-x-hidden font-sans transition-colors duration-500 selection:bg-[var(--accent-bg)]"
      style={
        /** @type {any} */ ({
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          '--font-sans': resolvedAppFontFamily,
          fontFamily: resolvedAppFontFamily,
        })
      }
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-[var(--accent-color)] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[var(--accent-contrast)] focus:shadow-lg"
      >
        {t('a11y.skipToContent') || 'Skip to content'}
      </a>
      <BackgroundLayer />
      {editMode && draggingId && touchPath && <DragOverlaySVG touchPath={touchPath} />}
      <div
        id="main-content"
        role="main"
        aria-label="Dashboard"
        onPointerDown={handleCardsOnlyPointerDown}
        onPointerUp={clearCardsOnlyLongPress}
        onPointerCancel={clearCardsOnlyLongPress}
        onPointerLeave={clearCardsOnlyLongPress}
        className={`relative z-10 mx-auto w-full max-w-[1600px] py-6 md:py-10 ${
          isMobile
            ? 'mobile-grid px-2'
            : gridColCount === 1
              ? 'px-10 sm:px-16 md:px-24'
              : gridColCount === 3
                ? dynamicGridColumns
                  ? 'px-4 md:px-12'
                  : 'px-4 md:px-20'
                : 'px-6 md:px-20'
        } ${isCompactCards ? 'compact-cards' : ''}`}
        style={
          isMobile
            ? {
                paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))',
              }
            : undefined
        }
      >
        {showDashboardChrome && (
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
              className={`mt-0 w-full font-sans ${isMobile ? 'scrollbar-hide flex items-center gap-2.5 overflow-x-auto overflow-y-hidden pt-2 pb-1' : 'flex items-center justify-between'}`}
              style={{
                marginTop: `${
                  isMobile
                    ? Math.min(sectionSpacing?.headerToStatus ?? 0, 12)
                    : (sectionSpacing?.headerToStatus ?? 0)
                }px`,
              }}
            >
              {personHeader}
              <div className={isMobile ? 'shrink-0' : 'min-w-0 flex-1'}>
                {withProfiler(
                  'StatusBar',
                  <MemoStatusBar
                    editMode={editMode}
                    t={t}
                    isSonosActive={isSonosActive}
                    isMediaActive={isMediaActive}
                    getA={getA}
                    getEntityImageUrl={getEntityImageUrl}
                    isMobile={isMobile}
                  />
                )}
              </div>
            </div>
          </Header>
        )}

        <ConnectionBanner t={t} setConfigTab={setConfigTab} />

        {showDashboardChrome && (
          <div
            className={`flex flex-nowrap items-center justify-between ${
              isMobile ? 'gap-2' : 'gap-4'
            }`}
            style={{ marginBottom: `${sectionSpacing?.navToGrid ?? 24}px` }}
          >
            <PageNavigation
              pages={pages}
              activePage={activePage}
              setActivePage={setActivePage}
              editMode={editMode}
              setEditingPage={setEditingPage}
              t={t}
            />
            {!isMobile && (
              <EditToolbar
                editMode={editMode}
                setShowAddCardModal={guardedSetShowAddCardModal}
                setShowConfigModal={guardedSetShowConfigModal}
                setConfigTab={setConfigTab}
                setShowThemeSidebar={guardedSetShowThemeSidebar}
                setShowLayoutSidebar={guardedSetShowLayoutSidebar}
                setShowHeaderEditModal={guardedSetShowHeaderEditModal}
                onToggleEdit={handleToggleEdit}
                showSettingsMenu
                connected={connected}
                updateCount={updateCount}
                isMobile={isMobile}
                t={t}
              />
            )}
          </div>
        )}

        {withProfiler(
          'DashboardGrid',
          <MemoDashboardGrid
            page={dashboardGridPage}
            media={dashboardGridMedia}
            grid={dashboardGridGrid}
            cards={dashboardGridCards}
            actions={dashboardGridActions}
            t={t}
          />
        )}

        {showPinLockModal && (
          <SettingsPinLockModal
            open
            onClose={closePinLockModal}
            onSubmit={handlePinSubmit}
            t={t}
            error={pinLockError}
          />
        )}
      </div>

      {showDashboardChrome && isMobile && (
        <SettingsMenuControl
          setShowConfigModal={guardedSetShowConfigModal}
          setConfigTab={setConfigTab}
          setShowThemeSidebar={guardedSetShowThemeSidebar}
          setShowLayoutSidebar={guardedSetShowLayoutSidebar}
          setShowHeaderEditModal={guardedSetShowHeaderEditModal}
          onAddCard={handleAddCard}
          onToggleEdit={handleToggleEdit}
          editMode={editMode}
          updateCount={updateCount}
          isMobile
          floating
          t={t}
        />
      )}
    </div>
  );
}
