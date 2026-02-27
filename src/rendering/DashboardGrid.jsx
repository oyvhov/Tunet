import { LayoutGrid, Plus, UserCircle2 } from '../icons';
import { MediaPage } from '../components';
import CardErrorBoundary from '../components/ui/CardErrorBoundary';
import { formatDuration } from '../utils';

export default function DashboardGrid({ page, media, grid, cards, actions, t }) {
  const { activePage, pagesConfig, pageSettings, editMode, isMediaPage } = page;
  const {
    entities,
    conn,
    isSonosActive,
    activeMediaId,
    setActiveMediaId,
    getA,
    getEntityImageUrl,
    callService,
    savePageSetting,
  } = media;
  const { gridLayout, isMobile, gridGapV, gridGapH, gridColCount, isCompactCards } = grid;
  const { cardSettings, getCardSettingsKey, hiddenCards, isCardHiddenByLogic, renderCard } = cards;
  const { setShowAddCardModal, setConfigTab, setShowConfigModal } = actions;

  if (isMediaPage(activePage)) {
    return (
      <div key={activePage} className="page-transition">
        <MediaPage
          pageId={activePage}
          entities={entities}
          conn={conn}
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
    );
  }

  const hasVisiblePlacement =
    (pagesConfig[activePage] || []).filter((id) => gridLayout[id]).length > 0;
  const cardIndexMap = new Map((pagesConfig[activePage] || []).map((id, index) => [id, index]));
  if (!hasVisiblePlacement) {
    const allPages = pagesConfig.pages || [];
    const totalCards =
      allPages.reduce((sum, p) => sum + (pagesConfig[p] || []).length, 0) +
      (pagesConfig.header || []).length;

    return (
      <div
        key={`${activePage}-empty`}
        className="animate-in fade-in zoom-in flex min-h-[60vh] flex-col items-center justify-center p-8 text-center font-sans opacity-90 duration-500"
      >
        <div className="mb-6 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-5 shadow-lg shadow-black/5">
          <LayoutGrid className="h-12 w-12 text-[var(--text-primary)] opacity-80" />
        </div>

        <h2 className="mb-3 text-3xl font-light tracking-tight text-[var(--text-primary)] uppercase">
          {t('welcome.title')}
        </h2>
        <p className="mb-8 max-w-md text-lg leading-relaxed text-[var(--text-secondary)]">
          {t('welcome.subtitle')}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setShowAddCardModal(true)}
            className="flex items-center gap-3 rounded-2xl bg-[var(--accent-color)] px-8 py-4 text-sm font-bold tracking-widest text-white uppercase shadow-lg transition-all duration-200 hover:bg-[var(--accent-color)] active:scale-95"
          >
            <Plus className="h-5 w-5" />
            {t('welcome.addCard')}
          </button>
          {totalCards > 0 ? null : (
            <button
              onClick={() => {
                setConfigTab('profiles');
                setShowConfigModal(true);
              }}
              className="flex items-center gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-8 py-4 text-sm font-bold tracking-widest text-[var(--text-primary)] uppercase shadow-lg transition-all duration-200 hover:bg-[var(--glass-bg-hover)] active:scale-95"
            >
              <UserCircle2 className="h-5 w-5" />
              {t('welcome.restoreProfile')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      key={activePage}
      className="page-transition grid items-start font-sans"
      style={{
        gap: isMobile ? '12px' : `${gridGapV}px ${gridGapH}px`,
        gridAutoRows: 'auto',
        gridTemplateColumns: `repeat(${gridColCount}, minmax(0, 1fr))`,
      }}
    >
      {(pagesConfig[activePage] || [])
        .map((id) => ({ id, placement: gridLayout[id] }))
        .filter(({ placement }) => placement)
        .sort((a, b) => {
          if (a.placement.row !== b.placement.row) return a.placement.row - b.placement.row;
          return a.placement.col - b.placement.col;
        })
        .map(({ id }) => {
          const index = cardIndexMap.get(id) ?? -1;
          const placement = gridLayout[id];
          const isCalendarCard = id.startsWith('calendar_card_');
          const isTodoCard = id.startsWith('todo_card_');
          const isLargeCard = isCalendarCard || isTodoCard;
          const sizeSetting = isLargeCard
            ? cardSettings[getCardSettingsKey(id)]?.size || cardSettings[id]?.size
            : null;
          const forcedSpan = isLargeCard
            ? sizeSetting === 'small'
              ? 1
              : sizeSetting === 'medium'
                ? 2
                : 4
            : placement?.span;
          const settingsKey = getCardSettingsKey(id);
          const settings = cardSettings[settingsKey] || cardSettings[id] || {};
          const heading = cardSettings[settingsKey]?.heading;
          const colSpan = placement?.colSpan || 1;
          const isSpacerCard = id.startsWith('spacer_card_');

          if (!editMode && (hiddenCards.includes(id) || isCardHiddenByLogic(id))) return null;

          const cardContent = renderCard(id, index);
          if (!cardContent) return null;

          const gapPx = isMobile ? 12 : gridGapV;
          const rowPx = isMobile ? 82 : 100;
          let cardHeight;
          if (
            id.startsWith('spacer_card_') &&
            Number.isFinite(Number(settings.heightPx)) &&
            Number(settings.heightPx) > 0
          ) {
            cardHeight = Math.max(40, Math.min(420, Number(settings.heightPx)));
          } else if (isLargeCard && sizeSetting !== 'small' && sizeSetting !== 'medium') {
            cardHeight = 4 * rowPx + 3 * gapPx;
          } else {
            cardHeight = forcedSpan * rowPx + Math.max(0, forcedSpan - 1) * gapPx;
          }

          return (
            <div
              key={id}
              className={`relative ${isCompactCards || isMobile ? 'card-compact' : ''}`}
              style={{
                gridRowStart: placement.row,
                gridColumnStart: placement.col,
                gridRowEnd: `span ${forcedSpan}`,
                gridColumnEnd: colSpan > 1 ? `span ${colSpan}` : undefined,
                height: `${cardHeight}px`,
              }}
            >
              {heading && !isSpacerCard && (
                <div className="absolute -top-4 left-2 text-[10px] font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase">
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
  );
}
