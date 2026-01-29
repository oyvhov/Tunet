import { Edit2, Settings, Sun, Moon, Check } from '../icons';

/**
 * SettingsMenu - Dropdown menu for app settings and actions
 * 
 * @param {Object} props
 * @param {boolean} props.showMenu - Whether menu is visible
 * @param {Function} props.setShowMenu - Function to toggle menu visibility
 * @param {boolean} props.editMode - Whether edit mode is active
 * @param {Function} props.setEditMode - Function to toggle edit mode
 * @param {Function} props.setShowConfigModal - Function to open config modal
 * @param {Function} props.setShowOnboarding - Function to toggle onboarding
 * @param {Function} props.toggleTheme - Function to cycle through themes
 * @param {string} props.currentTheme - Currently active theme key
 * @param {string} props.activePage - Currently active page ID
 * @param {Object} props.pageSettings - Settings for each page
 * @param {Function} props.t - Translation function
 * @param {React.Ref} [props.menuRef] - Ref for the menu container
 */
export default function SettingsMenu({
  showMenu,
  setShowMenu,
  editMode,
  setEditMode,
  setShowConfigModal,
  setShowOnboarding,
  toggleTheme,
  currentTheme,
  activePage,
  pageSettings,
  t,
  menuRef
}) {
  return (
    <div
      ref={menuRef}
      className={`absolute right-0 top-12 z-50 flex flex-col items-stretch gap-3 p-5 min-w-[200px] w-fit max-w-[280px] rounded-2xl bg-[var(--glass-bg)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-all duration-500 ease-in-out ${
        showMenu ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
      }`}
    >
      {!editMode && (
        <button 
          onClick={() => {
            setEditMode(true);
            setShowMenu(false);
          }} 
          className="group flex items-center gap-2 text-sm font-bold uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap py-3 px-3 rounded-xl hover:bg-[var(--glass-bg-hover)]"
        >
          <Edit2 className="w-4 h-4" /> {t('menu.edit')}
        </button>
      )}
      
      {!editMode && (
        <button 
          onClick={() => { 
            setShowConfigModal(true); 
            setShowOnboarding(false); 
            setShowMenu(false); 
          }} 
          className="group flex items-center gap-2 text-sm font-bold uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap py-3 px-3 rounded-xl hover:bg-[var(--glass-bg-hover)]"
        >
          <Settings className="w-4 h-4" /> {t('menu.system')}
        </button>
      )}
      
      {!editMode && (
        <button 
          onClick={() => { 
            toggleTheme(); 
            setShowMenu(false); 
          }} 
          className="flex items-center gap-2 text-sm font-bold uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all whitespace-nowrap py-3 px-3 rounded-xl hover:bg-[var(--glass-bg-hover)]" 
          title={t('menu.themeTitle')}
        >
          {currentTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {t('menu.theme')}
        </button>
      )}
    </div>
  );
}
