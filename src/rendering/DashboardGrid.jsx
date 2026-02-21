import { LayoutGrid, Plus, UserCircle2 } from '../icons';
import { MediaPage } from '../components';
import CardErrorBoundary from '../components/ui/CardErrorBoundary';
import { formatDuration } from '../utils';

export default function DashboardGrid({
  page,
  media,
  grid,
  cards,
  actions,
  t,
}) {
  const { activePage, pagesConfig, pageSettings, editMode, isMediaPage } = page;
  const { entities, conn, isSonosActive, activeMediaId, setActiveMediaId, getA, getEntityImageUrl, callService, savePageSetting } = media;
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

  const hasVisiblePlacement = (pagesConfig[activePage] || []).filter(id => gridLayout[id]).length > 0;
  const cardIndexMap = new Map((pagesConfig[activePage] || []).map((id, index) => [id, index]));
  if (!hasVisiblePlacement) {
    const allPages = pagesConfig.pages || [];
    const totalCards = allPages.reduce((sum, p) => sum + (pagesConfig[p] || []).length, 0) + (pagesConfig.header || []).length;

    return (
      <div key={`${activePage}-empty`} className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 opacity-90 animate-in fade-in zoom-in duration-500 font-sans">
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] p-5 rounded-full mb-6 shadow-lg shadow-black/5">
          <LayoutGrid className="w-12 h-12 text-[var(--text-primary)] opacity-80" />
        </div>

        <h2 className="text-3xl font-light mb-3 text-[var(--text-primary)] uppercase tracking-tight">{t('welcome.title')}</h2>
        <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-md leading-relaxed">{t('welcome.subtitle')}</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowAddCardModal(true)}
            className="flex items-center gap-3 px-8 py-4 bg-[var(--accent-color)] hover:bg-[var(--accent-color)] active:scale-95 text-white rounded-2xl shadow-lg  transition-all duration-200 font-bold uppercase tracking-widest text-sm"
          >
            <Plus className="w-5 h-5" />
            {t('welcome.addCard')}
          </button>
          {totalCards > 0 ? null : (
            <button
              onClick={() => { setConfigTab('profiles'); setShowConfigModal(true); }}
              className="flex items-center gap-3 px-8 py-4 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] active:scale-95 text-[var(--text-primary)] rounded-2xl shadow-lg transition-all duration-200 font-bold uppercase tracking-widest text-sm"
            >
              <UserCircle2 className="w-5 h-5" />
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
      className="grid font-sans page-transition items-start"
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
          const sizeSetting = isLargeCard ? (cardSettings[getCardSettingsKey(id)]?.size || cardSettings[id]?.size) : null;
          const forcedSpan = isLargeCard
            ? (sizeSetting === 'small' ? 1 : (sizeSetting === 'medium' ? 2 : 4))
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
          if (id.startsWith('spacer_card_') && Number.isFinite(Number(settings.heightPx)) && Number(settings.heightPx) > 0) {
            cardHeight = Math.max(40, Math.min(420, Number(settings.heightPx)));
          } else if (isLargeCard && sizeSetting !== 'small' && sizeSetting !== 'medium') {
            cardHeight = (4 * rowPx) + (3 * gapPx);
          } else {
            cardHeight = forcedSpan * rowPx + Math.max(0, forcedSpan - 1) * gapPx;
          }

          return (
            <div
              key={id}
              className={`relative ${(isCompactCards || isMobile) ? 'card-compact' : ''}`}
              style={{
                gridRowStart: placement.row,
                gridColumnStart: placement.col,
                gridRowEnd: `span ${forcedSpan}`,
                gridColumnEnd: colSpan > 1 ? `span ${colSpan}` : undefined,
                height: `${cardHeight}px`,
              }}
            >
              {heading && !isSpacerCard && (
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
  );
}
