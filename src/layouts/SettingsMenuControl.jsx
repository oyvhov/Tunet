import SettingsDropdown from '../components/ui/SettingsDropdown';

export default function SettingsMenuControl({
  setShowConfigModal,
  setConfigTab,
  setShowThemeSidebar,
  setShowLayoutSidebar,
  setShowHeaderEditModal,
  onAddCard,
  onToggleEdit,
  editMode,
  updateCount,
  isMobile,
  floating = false,
  t,
}) {
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center ${
        floating ? 'fixed z-[80]' : `relative ${isMobile ? 'ml-auto' : ''}`
      }`}
      style={
        floating
          ? {
              right: 'max(1rem, env(safe-area-inset-right))',
              bottom: 'max(1rem, env(safe-area-inset-bottom))',
            }
          : undefined
      }
      data-testid="settings-menu-control"
    >
      <SettingsDropdown
        onOpenSettings={() => {
          setShowConfigModal(true);
          setConfigTab('connection');
        }}
        onOpenTheme={() => setShowThemeSidebar(true)}
        onOpenLayout={() => setShowLayoutSidebar(true)}
        onOpenHeader={() => setShowHeaderEditModal(true)}
        onAddCard={onAddCard}
        onToggleEdit={isMobile ? onToggleEdit : undefined}
        editMode={editMode}
        isMobile={isMobile}
        floating={floating}
        t={t}
      />
      {updateCount > 0 && (
        <div
          data-settings-update-badge
          className="pointer-events-none absolute -top-2 -right-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-600 px-1 shadow-sm"
        >
          <span className="pt-[1px] text-[11px] leading-none font-bold text-white">
            {updateCount}
          </span>
        </div>
      )}
    </div>
  );
}
