// Dropdown Menu Component that looks nice
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Palette, LayoutGrid, Server, Type } from '../../icons';

export default function SettingsDropdown({
  onOpenSettings,
  onOpenTheme,
  onOpenLayout,
  onOpenHeader,
  t,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const handleSelect = (action) => {
    setIsOpen(false);
    if (typeof action === 'function') action();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative z-50 rounded-full p-2 transition-all duration-300 ${isOpen ? 'bg-[var(--accent-color)] text-white shadow-lg ' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
        aria-label="Settings"
      >
        <Settings
          className={`h-5 w-5 transition-transform duration-500 ${isOpen ? 'rotate-90' : 'group-hover:rotate-45'}`}
        />
      </button>

      {/* Dropdown Menu */}
      <div
        className={`absolute top-full right-0 z-50 mt-2 w-56 origin-top-right transform rounded-2xl border border-white/10 bg-[#0f172a]/95 p-2 shadow-2xl backdrop-blur-xl transition-all duration-200 ${
          isOpen
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
        }`}
        style={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(20px)' }}
      >
        <div className="space-y-1">
          <button
            onClick={() => handleSelect(onOpenTheme)}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/10"
          >
            <div className="rounded-lg bg-pink-500/10 p-2 text-pink-400 transition-colors group-hover:bg-pink-500 group-hover:text-white">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-white">
                {t('system.tabAppearance')}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleSelect(onOpenLayout)}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/10"
          >
            <div className="rounded-lg bg-[var(--accent-bg)] p-2 text-[var(--accent-color)] transition-colors group-hover:bg-[var(--accent-color)] group-hover:text-white">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-white">
                {t('system.tabLayout')}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleSelect(onOpenHeader)}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/10"
          >
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400 transition-colors group-hover:bg-indigo-500 group-hover:text-white">
              <Type className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-white">
                {t('system.tabHeader')}
              </p>
            </div>
          </button>

          <div className="mx-2 my-1 h-px bg-white/5" />

          <button
            onClick={() => handleSelect(onOpenSettings)}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/10"
          >
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-white">
                {t('menu.system')}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
