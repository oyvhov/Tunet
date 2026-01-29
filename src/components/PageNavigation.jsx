import { Plus, Settings } from '../icons';
import { ICON_MAP } from '../iconMap';

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
 * @param {Function} props.t - Translation function
 */
export default function PageNavigation({
  pages,
  pageSettings,
  activePage,
  setActivePage,
  editMode,
  setEditingPage,
  setShowAddPageModal,
  t
}) {
  return (
    <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide flex-1 min-w-0">
      {pages.map(page => {
        const settings = pageSettings[page.id] || {};
        const label = settings.label || page.label;
        const isHidden = settings.hidden;
        const Icon = settings.icon ? ICON_MAP[settings.icon] : page.icon;
        
        if (!editMode && isHidden) return null;
        
        return (
          <button
            key={page.id}
            onClick={() => editMode ? setEditingPage(page.id) : setActivePage(page.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl sm:rounded-full transition-all font-bold uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap border ${
              activePage === page.id 
                ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' 
                : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
            } ${editMode && isHidden ? 'opacity-50 border-dashed border-gray-500' : ''}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            {editMode && <Settings className="w-3 h-3 ml-1 opacity-50 hidden sm:inline" />}
          </button>
        );
      })}
      
      {editMode && (
        <button
          onClick={() => setShowAddPageModal(true)}
          className="flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl sm:rounded-full transition-all font-bold uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap border bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('nav.addPage')}</span>
        </button>
      )}
    </div>
  );
}
