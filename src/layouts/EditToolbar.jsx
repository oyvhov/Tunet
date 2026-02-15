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
          className="group flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-white transition-all whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> {t('nav.addCard')}
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
        aria-label={editMode ? t('nav.done') : t('menu.edit')}
        aria-pressed={editMode}
      >
        {editMode ? <Check className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
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
