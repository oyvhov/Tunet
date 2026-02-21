import { useState } from 'react';
import { Plus, Edit2 } from '../../icons';
import { getIconComponent } from '../../icons';

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
  pagesConfig,
  persistConfig,
  pageSettings,
  activePage,
  setActivePage,
  editMode,
  setEditingPage,
  setShowAddPageModal,
  t
}) {
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
    <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide flex-1 min-w-0">
      {pages.map(page => {
        const settings = pageSettings[page.id] || {};
        const label = settings.label || page.label;
        const isHidden = settings.hidden;
        const Icon = settings.icon ? (getIconComponent(settings.icon) || page.icon) : page.icon;
        const isDragOver = dragOverId === page.id;
        
        if (!editMode && isHidden) return null;
        
        return (
          <button
            key={page.id}
            draggable={editMode}
            onClick={() => editMode ? setEditingPage(page.id) : setActivePage(page.id)}
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
            className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl sm:rounded-full transition-all font-bold uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap border ${
              activePage === page.id 
                ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' 
                : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
            } ${editMode && isHidden ? 'opacity-50 border-gray-500 scale-95' : ''} ${editMode ? 'cursor-move' : ''} ${isDragOver ? 'border-[var(--accent-color)]' : ''}`}
          >
            <Icon className={`w-4 h-4 ${editMode && isHidden ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{label}</span>
            {editMode && <Edit2 className="w-4 h-4 ml-1 text-[var(--accent-color)] hidden sm:inline" />}
          </button>
        );
      })}
      
      {editMode && (
        <button
          onClick={() => setShowAddPageModal(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-2xl sm:rounded-full font-bold uppercase tracking-[0.2em] text-[10px] whitespace-nowrap border-2 bg-white/5 text-white border-white/20 hover:bg-white/10 hover:border-white/30 transition-all"
        >
          <Plus className="w-3 h-3" />
          <span className="hidden sm:inline">{t('nav.addPage')}</span>
        </button>
      )}
    </div>
  );
}
