import { Profiler, memo, useCallback } from 'react';
import { Plus } from '../icons';
import Header from './Header';
import StatusBar from './StatusBar';
import BackgroundLayer from './BackgroundLayer';
import ConnectionBanner from './ConnectionBanner';
import DragOverlaySVG from './DragOverlaySVG';
import EditToolbar from './EditToolbar';
import { PageNavigation } from '../components';
import DashboardGrid from '../rendering/DashboardGrid';
import ModalManager from '../rendering/ModalManager';
import PinLockModal from '../components/ui/PinLockModal';

const MemoStatusBar = memo(StatusBar);
const MemoDashboardGrid = memo(DashboardGrid);
const MemoModalManager = memo(ModalManager);

/** @param {Record<string, unknown>} props */
export default function DashboardLayout(props) {
  const {
    resolvedAppFontFamily,
    bgMode,
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
    language,
    sectionSpacing,
    pagesConfig,
    personStatus,
    requestSettingsAccess,
    setAddCardTargetPage,
    setShowAddCardModal,
    entities,
    setActiveMediaId,
    setActiveMediaGroupKey,
    setActiveMediaGroupIds,
    setActiveMediaSessionSensorIds,
    setActiveMediaModal,
    setShowAlarmModal,
    setShowConfigModal,
    setConfigTab,
    setShowStatusPillsConfig,
    isSonosActive,
    isMediaActive,
    getA,
    getEntityImageUrl,
    statusPillsConfig,
    haUnavailableVisible,
    oauthExpired,
    pages,
    persistConfig,
    pageSettings,
    activePage,
    setActivePage,
    setEditingPage,
    setShowAddPageModal,
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
    modalManagerCore,
    modalManagerState,
    modalManagerAppearance,
    modalManagerLayout,
    modalManagerOnboarding,
    modalManagerPageManagement,
    modalManagerEntityHelpers,
    modalManagerAddCard,
    modalManagerCardConfig,
    mediaTick,
    showPinLockModal,
    closePinLockModal,
    handlePinSubmit,
    pinLockError,
  } = props;

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
      console.info(
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

  const handleShowUpdates = useCallback(() => {
    setShowConfigModal(true);
    setConfigTab('updates');
  }, [setShowConfigModal, setConfigTab]);

  const handleReconnect = useCallback(() => {
    setShowConfigModal(true);
    setConfigTab('connection');
  }, [setShowConfigModal, setConfigTab]);

  return (
    <div
      className="min-h-screen overflow-x-hidden font-sans transition-colors duration-500 selection:bg-[var(--accent-bg)]"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        '--font-sans': resolvedAppFontFamily,
        fontFamily: resolvedAppFontFamily,
      }}
    >
      <BackgroundLayer bgMode={bgMode} />
      {editMode && draggingId && touchPath && <DragOverlaySVG touchPath={touchPath} />}
      <div
        role="main"
        aria-label="Dashboard"
        className={`relative z-10 mx-auto w-full max-w-[1600px] py-6 md:py-10 ${
          isMobile
            ? 'mobile-grid px-5'
            : gridColCount === 1
              ? 'px-10 sm:px-16 md:px-24'
              : gridColCount === 3
                ? dynamicGridColumns
                  ? 'px-4 md:px-12'
                  : 'px-4 md:px-20'
                : 'px-6 md:px-20'
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
            className={`mt-0 w-full font-sans ${isMobile ? 'flex flex-col items-start gap-3' : 'flex items-center justify-between'}`}
            style={{ marginTop: `${sectionSpacing?.headerToStatus ?? 0}px` }}
          >
            <div
              className={`flex min-w-0 flex-wrap items-center gap-2.5 ${isMobile ? 'w-full origin-left scale-90' : ''}`}
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
              {(pagesConfig.header || []).length > 0 && (
                <div className="mx-2 h-8 w-px bg-[var(--glass-border)]"></div>
              )}
            </div>
            <div className={`min-w-0 ${isMobile ? 'w-full' : 'flex-1'}`}>
              {withProfiler(
                'StatusBar',
                <MemoStatusBar
                  entities={entities}
                  now={now}
                  setActiveMediaId={setActiveMediaId}
                  setActiveMediaGroupKey={setActiveMediaGroupKey}
                  setActiveMediaGroupIds={setActiveMediaGroupIds}
                  setActiveMediaSessionSensorIds={setActiveMediaSessionSensorIds}
                  setActiveMediaModal={setActiveMediaModal}
                  setShowAlarmModal={setShowAlarmModal}
                  setShowUpdateModal={handleShowUpdates}
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
              )}
            </div>
          </div>
        </Header>

        {haUnavailableVisible && (
          <ConnectionBanner oauthExpired={oauthExpired} onReconnect={handleReconnect} t={t} />
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

        {withProfiler(
          'ModalManager',
          <MemoModalManager
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
        )}

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
