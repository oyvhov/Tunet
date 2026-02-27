import { useState } from 'react';
import { Plus, Edit2 } from '../../icons';
import { getIconComponent } from '../../icons';
import { useModalState, usePages } from '../../contexts';

/**
 * PageNavigation - Navigation component for switching between pages
 *
 * @param {Object} props
 * @param {Array} props.pages - Array of page objects with id, label, icon
 * @param {Object} props.pageSettings - Settings for each page (label, icon, hidden)
 * @param {string} props.activePage - Currently active page ID
 * @param {Function} props.setActivePage - Function to change active page
 * @param {boolean} props.editMode - Whether edit mode is active
 * @param {Function} props.setEditingPage - Function to open page edit modal
 * @param {Function} props.setShowAddPageModal - Function to open add page modal
 * @param {Object} props.pagesConfig - Full pages config
 * @param {Function} props.persistConfig - Persist updated pages config
 * @param {Function} props.t - Translation function
 */
export default function PageNavigation({
  pages,
  activePage,
  setActivePage,
  editMode,
  setEditingPage,
  t,
}) {
  const { pagesConfig, persistConfig, pageSettings } = usePages();
  const { setShowAddPageModal } = useModalState();
  const [dragOverId, setDragOverId] = useState(null);
  const pageOrder = pagesConfig?.pages || [];

  const movePage = (sourceId, targetId) => {
    if (!persistConfig) return;
    if (!sourceId || !targetId || sourceId === targetId) return;
    const nextPages = [...pageOrder];
    const fromIndex = nextPages.indexOf(sourceId);
    const toIndex = nextPages.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    nextPages.splice(fromIndex, 1);
    nextPages.splice(toIndex, 0, sourceId);
    persistConfig({ ...pagesConfig, pages: nextPages });
  };

  return (
    <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-4 overflow-x-auto pb-2">
      {pages.map((page) => {
        const settings = pageSettings[page.id] || {};
        const label = settings.label || page.label;
        const isHidden = settings.hidden;
        const Icon = settings.icon ? getIconComponent(settings.icon) || page.icon : page.icon;
        const isDragOver = dragOverId === page.id;

        if (!editMode && isHidden) return null;

        return (
          <button
            key={page.id}
            draggable={editMode}
            onClick={() => (editMode ? setEditingPage(page.id) : setActivePage(page.id))}
            onDragStart={(event) => {
              if (!editMode) return;
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', page.id);
            }}
            onDragOver={(event) => {
              if (!editMode) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDragOverId(page.id);
            }}
            onDragLeave={() => {
              if (!editMode) return;
              setDragOverId(null);
            }}
            onDrop={(event) => {
              if (!editMode) return;
              event.preventDefault();
              const sourceId = event.dataTransfer.getData('text/plain');
              setDragOverId(null);
              movePage(sourceId, page.id);
            }}
            onDragEnd={() => setDragOverId(null)}
            className={`flex items-center gap-1.5 rounded-2xl border px-4 py-2 text-[10px] font-bold tracking-widest whitespace-nowrap uppercase transition-all sm:gap-2 sm:rounded-full sm:px-5 sm:py-2.5 sm:text-xs ${
              activePage === page.id
                ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]'
                : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
            } ${editMode && isHidden ? 'scale-95 border-gray-500 opacity-50' : ''} ${editMode ? 'cursor-move' : ''} ${isDragOver ? 'border-[var(--accent-color)]' : ''}`}
          >
            <Icon className={`h-4 w-4 ${editMode && isHidden ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{label}</span>
            {editMode && (
              <Edit2 className="ml-1 hidden h-4 w-4 text-[var(--accent-color)] sm:inline" />
            )}
          </button>
        );
      })}

      {editMode && (
        <button
          onClick={() => setShowAddPageModal(true)}
          className="flex items-center gap-1.5 rounded-2xl border-2 border-white/20 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-[0.2em] whitespace-nowrap text-white uppercase transition-all hover:border-white/30 hover:bg-white/10 sm:rounded-full"
        >
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">{t('nav.addPage')}</span>
        </button>
      )}
    </div>
  );
}
