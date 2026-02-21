// Dropdown Menu Component that looks nice
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Palette, LayoutGrid, Server, Type } from '../../icons';

export default function SettingsDropdown({ 
  onOpenSettings, 
  onOpenTheme, 
  onOpenLayout,
  onOpenHeader,
  t 
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
        className={`p-2 rounded-full transition-all duration-300 group relative z-50 ${isOpen ? 'bg-[var(--accent-color)] text-white shadow-lg ' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}
        aria-label="Settings"
      >
        <Settings className={`w-5 h-5 transition-transform duration-500 ${isOpen ? 'rotate-90' : 'group-hover:rotate-45'}`} />
      </button>

      {/* Dropdown Menu */}
      <div 
        className={`absolute right-0 top-full mt-2 w-56 p-2 rounded-2xl bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-200 origin-top-right z-50 transform ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
        style={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(20px)' }}
      >
        <div className="space-y-1">
          <button
            onClick={() => handleSelect(onOpenTheme)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group"
          >
            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-white">{t('system.tabAppearance')}</p>
            </div>
          </button>

          <button
            onClick={() => handleSelect(onOpenLayout)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group"
          >
            <div className="p-2 rounded-lg bg-[var(--accent-bg)] text-[var(--accent-color)] group-hover:bg-[var(--accent-color)] group-hover:text-white transition-colors">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-white">{t('system.tabLayout')}</p>
            </div>
          </button>

          <button
            onClick={() => handleSelect(onOpenHeader)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group"
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-white">{t('system.tabHeader')}</p>
            </div>
          </button>

          <div className="h-px bg-white/5 my-1 mx-2" />

          <button
            onClick={() => handleSelect(onOpenSettings)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-white">{t('menu.system')}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
