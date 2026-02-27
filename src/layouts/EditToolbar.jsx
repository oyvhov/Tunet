import { Plus, Check, Edit2 } from '../icons';
import SettingsDropdown from '../components/ui/SettingsDropdown';
import { usePages } from '../contexts';
import { usePageRouting } from '../hooks';

/**
 * EditToolbar — add card, done, edit toggle, settings dropdown, connection dot.
 */
export default function EditToolbar({
  editMode,
  setEditMode,
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
  const { pageSettings } = usePages();
  const { activePage, setActivePage } = usePageRouting();

  return (
    <div className="relative flex flex-shrink-0 items-center justify-end gap-6 overflow-visible pb-2">
      {editMode && (
        <button
          onClick={() => setShowAddCardModal(true)}
          className="group flex items-center gap-2 rounded-full border border-transparent px-2.5 py-1.5 text-xs font-bold whitespace-nowrap text-[var(--accent-color)] transition-all duration-200 hover:border-[var(--glass-border)] hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:outline-none"
        >
          <span className="group-hover: rounded-full bg-[var(--accent-bg)] p-2 text-[var(--accent-color)] transition-all duration-300 group-hover:scale-105 group-hover:bg-[var(--accent-color)] group-hover:text-white group-hover:shadow-lg">
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          </span>
          <span className="transition-colors duration-200">{t('nav.addCard')}</span>
        </button>
      )}

      <button
        onClick={() => {
          const currentSettings = pageSettings[activePage];
          if (currentSettings?.hidden) setActivePage('home');
          if (editMode && typeof window !== 'undefined') {
            window.dispatchEvent(new window.CustomEvent('tunet:edit-done'));
          }
          setEditMode(!editMode);
        }}
        className={`group rounded-full border p-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:outline-none ${editMode ? 'hover: border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)] hover:bg-[var(--accent-bg)] hover:text-white hover:shadow-lg' : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--glass-border)] hover:bg-white/10 hover:text-white'}`}
        title={editMode ? t('nav.done') : t('menu.edit')}
        aria-label={editMode ? t('nav.done') : t('menu.edit')}
        aria-pressed={editMode}
      >
        {editMode ? (
          <Check className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
        ) : (
          <Edit2 className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
        )}
      </button>

      <div className="relative">
        <SettingsDropdown
          onOpenSettings={() => {
            setShowConfigModal(true);
            setConfigTab('connection');
          }}
          onOpenTheme={() => setShowThemeSidebar(true)}
          onOpenLayout={() => setShowLayoutSidebar(true)}
          onOpenHeader={() => setShowHeaderEditModal(true)}
          t={t}
        />
        {updateCount > 0 && (
          <div className="pointer-events-none absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--card-bg)] bg-gray-600 shadow-sm">
            <span className="pt-[1px] text-[11px] leading-none font-bold text-white">
              {updateCount}
            </span>
          </div>
        )}
      </div>

      {!connected && (
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border transition-all"
          style={{
            backgroundColor: 'rgba(255,255,255,0.01)',
            borderColor: 'rgba(239, 68, 68, 0.2)',
          }}
        >
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
        </div>
      )}
    </div>
  );
}
