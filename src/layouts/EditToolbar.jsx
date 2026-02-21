import { Plus, Check, Edit2 } from '../icons';
import SettingsDropdown from '../components/ui/SettingsDropdown';

/**
 * EditToolbar — add card, done, edit toggle, settings dropdown, connection dot.
 */
export default function EditToolbar({
  editMode,
  setEditMode,
  activePage,
  pageSettings,
  setActivePage,
  setShowAddCardModal,
  setShowConfigModal,
  setConfigTab,
  setShowThemeSidebar,
  setShowLayoutSidebar,
  setShowHeaderEditModal,
  connected,
  updateCount,
  t,
}) {
  return (
    <div className="relative flex items-center gap-6 flex-shrink-0 overflow-visible pb-2 justify-end">
      {editMode && (
        <button
          onClick={() => setShowAddCardModal(true)}
          className="group flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-transparent hover:border-[var(--glass-border)] hover:bg-white/10 text-xs font-bold text-[var(--accent-color)] hover:text-white transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
        >
          <span className="p-2 rounded-full bg-[var(--accent-bg)] text-[var(--accent-color)] transition-all duration-300 group-hover:bg-[var(--accent-color)] group-hover:text-white group-hover:scale-105 group-hover:shadow-lg group-hover:">
            <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
          </span>
          <span className="transition-colors duration-200">{t('nav.addCard')}</span>
        </button>
      )}

      <button
        onClick={() => {
          const currentSettings = pageSettings[activePage];
          if (currentSettings?.hidden) setActivePage('home');
          setEditMode(!editMode);
        }}
        className={`p-2 rounded-full group border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] ${editMode ? 'bg-[var(--accent-bg)] text-[var(--accent-color)] border-[var(--accent-color)] hover:bg-[var(--accent-bg)] hover:text-white hover:shadow-lg hover:' : 'text-[var(--text-secondary)] border-transparent hover:border-[var(--glass-border)] hover:bg-white/10 hover:text-white'}`}
        title={editMode ? t('nav.done') : t('menu.edit')}
        aria-label={editMode ? t('nav.done') : t('menu.edit')}
        aria-pressed={editMode}
      >
        {editMode ? <Check className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" /> : <Edit2 className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />}
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

      {!connected && (
        <div
          className="flex items-center justify-center h-8 w-8 rounded-full transition-all border flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
        >
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
        </div>
      )}
    </div>
  );
}
