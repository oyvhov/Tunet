// Dropdown Menu Component that looks nice
import React, { memo, useState, useRef, useEffect } from 'react';
import { Settings, Palette, LayoutGrid, Server, Type, Edit2, Plus, Check } from '../../icons';

function SettingsDropdown({
  onOpenSettings,
  onOpenTheme,
  onOpenLayout,
  onOpenHeader,
  onAddCard,
  onToggleEdit,
  editMode,
  isMobile,
  floating = false,
  t,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isFloatingDone = Boolean(floating && isMobile && editMode && onToggleEdit);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSelect = (action) => {
    setIsOpen(false);
    if (typeof action === 'function') action();
  };

  const handleTrigger = () => {
    if (isFloatingDone) {
      setIsOpen(false);
      onToggleEdit();
      return;
    }
    setIsOpen((open) => !open);
  };

  return (
    <>
      {floating && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          data-testid="settings-mobile-backdrop"
        />
      )}

      <div className="relative z-50" ref={dropdownRef}>
        <button
          onClick={handleTrigger}
          className={`group relative z-50 flex flex-shrink-0 items-center justify-center border transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] focus-visible:outline-none ${
            floating
              ? `h-14 w-14 rounded-2xl border-transparent text-white shadow-[0_16px_48px_rgba(0,0,0,0.35)] ${
                  isFloatingDone
                    ? 'bg-[var(--status-success-fg)] text-[var(--bg-primary)]'
                    : 'bg-[var(--accent-color)]'
                }`
              : isMobile
                ? 'h-11 w-11 rounded-full border-transparent'
                : 'rounded-full border-transparent p-2'
          } ${!floating ? (isOpen ? 'border-[var(--accent-color)] bg-[var(--accent-color)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]') : ''}`}
          aria-label={
            isFloatingDone ? t('nav.done') : floating ? t('menu.edit') : t('menu.settings')
          }
          aria-expanded={isFloatingDone ? undefined : isOpen}
          aria-controls={isFloatingDone ? undefined : 'settings-dropdown-menu'}
          data-testid="settings-dropdown-trigger"
        >
          {isFloatingDone ? (
            <Check className="h-6 w-6" />
          ) : floating ? (
            <Edit2 className="h-6 w-6" />
          ) : (
            <Settings className="h-5 w-5" />
          )}
        </button>

        {/* Dropdown Menu */}
        <div
          id="settings-dropdown-menu"
          className={`absolute right-0 z-50 w-60 rounded-3xl border border-[var(--glass-border)] p-2.5 shadow-2xl ${
            floating ? 'bottom-full mb-3' : 'top-full mt-2'
          } ${isOpen ? 'visible' : 'pointer-events-none invisible'}`}
          style={{ backgroundColor: 'var(--modal-bg)' }}
          role="menu"
          aria-hidden={!isOpen}
          data-testid="settings-dropdown-menu"
        >
          <div className="space-y-1">
            {isMobile && onAddCard && (
              <button
                onClick={() => handleSelect(onAddCard)}
                className="group flex w-full items-center gap-3 rounded-2xl bg-[var(--accent-bg)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
                aria-label={t('nav.addCard')}
                role="menuitem"
                data-testid="settings-menu-add-card"
              >
                <div className="rounded-xl bg-[var(--accent-color)] p-2 text-white shadow-sm transition-transform group-hover:scale-105">
                  <Plus className="h-4 w-4" />
                </div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{t('nav.addCard')}</p>
              </button>
            )}

            {isMobile && onToggleEdit && !editMode && (
              <>
                <button
                  onClick={() => handleSelect(onToggleEdit)}
                  className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
                  aria-label={t('menu.edit')}
                  role="menuitem"
                  data-testid="settings-menu-edit"
                >
                  <div className="rounded-xl bg-[var(--glass-bg)] p-2 text-[var(--text-secondary)] transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{t('menu.edit')}</p>
                </button>
                <div className="mx-2 my-1.5 h-px bg-[var(--glass-border)]" />
              </>
            )}

            <button
              onClick={() => handleSelect(onOpenTheme)}
              className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
              aria-label={t('settings.openAppearance')}
              role="menuitem"
              data-testid="settings-menu-theme"
            >
              <div className="rounded-xl bg-pink-500/10 p-2 text-pink-400 transition-colors group-hover:bg-pink-500 group-hover:text-white">
                <Palette className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {t('system.tabAppearance')}
              </p>
            </button>

            <button
              onClick={() => handleSelect(onOpenLayout)}
              className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
              aria-label={t('settings.openLayout')}
              role="menuitem"
              data-testid="settings-menu-layout"
            >
              <div className="rounded-xl bg-[var(--accent-bg)] p-2 text-[var(--accent-color)] transition-colors group-hover:bg-[var(--accent-color)] group-hover:text-white">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {t('system.tabLayout')}
              </p>
            </button>

            <button
              onClick={() => handleSelect(onOpenHeader)}
              className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
              aria-label={t('settings.openHeader')}
              role="menuitem"
              data-testid="settings-menu-header"
            >
              <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400 transition-colors group-hover:bg-indigo-500 group-hover:text-white">
                <Type className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {t('system.tabHeader')}
              </p>
            </button>

            <div className="mx-2 my-1.5 h-px bg-[var(--glass-border)]" />

            <button
              onClick={() => handleSelect(onOpenSettings)}
              className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-hover)]"
              aria-label={t('settings.openSystem')}
              role="menuitem"
              data-testid="settings-menu-system"
            >
              <div className="rounded-xl bg-[var(--status-success-bg)] p-2 text-[var(--status-success-fg)] transition-colors group-hover:opacity-90">
                <Server className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{t('menu.system')}</p>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(SettingsDropdown);
