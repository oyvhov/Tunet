// Similar imports to ConfigModal
import React from 'react';
import ModernDropdown from '../ui/ModernDropdown';
import M3Slider from '../ui/M3Slider';
import { GRADIENT_PRESETS } from '../../contexts/ConfigContext';
import { useConfig } from '../../contexts';
import {
  Sparkles,
  Sun,
  Moon,
  Home,
  RefreshCw,
  Palette,
  Globe,
  LayoutGrid,
  Type
} from '../../icons';
import SidebarContainer from './SidebarContainer';

const LinkIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);

export default function ThemeSidebar({
  open,
  onClose,
  onSwitchToLayout,
  onSwitchToHeader,
  t,
  themes,
  currentTheme,
  setCurrentTheme,
  language,
  setLanguage,
  bgMode,
  setBgMode,
  bgColor,
  setBgColor,
  bgGradient,
  setBgGradient,
  bgImage,
  setBgImage,
  inactivityTimeout,
  setInactivityTimeout
}) {
  const { unitsMode, setUnitsMode } = useConfig();
  const bgModes = [
    { key: 'theme', icon: Sparkles, label: t('settings.bgFollowTheme') },
    { key: 'solid', icon: Sun, label: t('settings.bgSolid') },
    { key: 'gradient', icon: Moon, label: t('settings.bgGradient') },
    { key: 'animated', icon: Sparkles, label: t('settings.bgAurora') },
  ];

  const resetBackground = () => {
    setBgMode('theme');
    setBgColor('#0f172a');
    setBgGradient('midnight');
    setBgImage('');
  };

  return (
    <SidebarContainer
      open={open}
      onClose={onClose}
      title={t('system.tabAppearance')}
      icon={Palette}
    >
      <div className="space-y-8 font-sans">
        
        {/* Switcher Tab */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex p-1 rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
             <button
                className="w-12 h-9 rounded-xl flex items-center justify-center transition-all shadow-md relative z-10 text-white"
               style={{ backgroundColor: 'var(--glass-bg-hover)', color: 'var(--text-primary)' }}
                disabled
                title={t('system.tabAppearance')}
             >
                <Palette className="w-5 h-5" />
             </button>

             <div className="w-px my-1 mx-1" style={{ backgroundColor: 'var(--glass-border)' }} />

             <button
                className="w-12 h-9 rounded-xl flex items-center justify-center transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                onClick={onSwitchToLayout}
                title={t('system.tabLayout')}
             >
                <LayoutGrid className="w-5 h-5" />
             </button>

             <div className="w-px my-1 mx-1" style={{ backgroundColor: 'var(--glass-border)' }} />

             <button
                className="w-12 h-9 rounded-xl flex items-center justify-center transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                onClick={onSwitchToHeader}
                title={t('system.tabHeader')}
             >
                <Type className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Theme & Language */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <ModernDropdown
              label={t('settings.theme')}
              icon={Palette}
              options={Object.keys(themes)}
              current={currentTheme}
              onChange={setCurrentTheme}
              map={{ dark: t('theme.dark'), light: t('theme.light'), contextual: 'Smart (Auto)' }}
              placeholder={t('dropdown.noneSelected')}
            />
            <ModernDropdown
              label={t('settings.language')}
              icon={Globe}
              options={['en', 'nb', 'nn', 'sv', 'de']}
              current={language}
              onChange={setLanguage}
              map={{ en: t('language.en'), nb: t('language.nb'), nn: t('language.nn'), sv: t('language.sv'), de: t('language.de') }}
              placeholder={t('dropdown.noneSelected')}
            />
            <ModernDropdown
              label={t('settings.unitSystem')}
              icon={RefreshCw}
              options={['follow_ha', 'metric', 'imperial']}
              current={unitsMode}
              onChange={setUnitsMode}
              map={{
                follow_ha: t('settings.unitSystem.followHa'),
                metric: t('settings.unitSystem.metric'),
                imperial: t('settings.unitSystem.imperial')
              }}
              placeholder={t('dropdown.noneSelected')}
            />
          </div>
        </div>

        <div className="h-px" style={{ backgroundColor: 'var(--glass-border)' }} />

        {/* Background */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold tracking-widest pl-1" style={{ color: 'var(--text-secondary)' }}>{t('settings.background')}</p>
            <button 
              type="button"
              onClick={resetBackground}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] rounded-sm transition-colors"
            >
              {t('settings.reset')}
            </button>
          </div>

          {/* Mode Selector - Compact */}
          <div className="grid grid-cols-4 gap-2">
            {bgModes.map(mode => {
              const active = bgMode === mode.key;
              const ModeIcon = mode.icon;
              return (
                <button
                  key={mode.key}
                  onClick={() => setBgMode(mode.key)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all text-center border ${
                    active
                      ? 'bg-[var(--glass-bg-hover)] border-[var(--glass-border)] text-[var(--text-primary)]'
                      : 'border-transparent hover:bg-white/10 text-[var(--text-secondary)]'
                  }`}
                  style={!active ? { backgroundColor: 'var(--glass-bg)' } : {}}
                >
                  <ModeIcon className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase tracking-wider leading-tight">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mode-specific controls */}
          {bgMode === 'theme' && (
             <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
               <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('settings.bgFollowThemeHint')}</p>
             </div>
          )}

          {bgMode === 'solid' && (
            <div className="py-2 flex items-center gap-4">
              <div className="relative cursor-pointer group w-12 h-12 rounded-xl overflow-hidden border shadow-lg" style={{ borderColor: 'var(--glass-border)' }}>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className="w-full h-full transition-colors"
                  style={{ backgroundColor: bgColor }}
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) setBgColor(val);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border font-mono text-sm outline-none transition-colors uppercase focus:border-[var(--glass-border)]"
                  style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
                  placeholder="#0f172a"
                  maxLength={7}
                />
              </div>
            </div>
          )}

          {bgMode === 'gradient' && (
            <div className="flex flex-wrap gap-3 py-2">
              {Object.entries(GRADIENT_PRESETS).map(([key, preset]) => {
                const active = bgGradient === key;
                return (
                  <button
                    key={key}
                    onClick={() => setBgGradient(key)}
                    className="group relative flex-shrink-0"
                    title={preset.label}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl transition-all ${
                        active ? 'ring-2 ring-[var(--glass-border)] scale-105' : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {bgMode === 'custom' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <input
                    type="url"
                    value={bgImage}
                    onChange={(e) => setBgImage(e.target.value)}
                    className="w-full px-4 py-3 pl-10 rounded-xl border text-xs outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[var(--glass-border)]"
                    style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
                    placeholder={t('settings.bgUrl')}
                  />
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-px" style={{ backgroundColor: 'var(--glass-border)' }} />

        {/* Behavior */}
        <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase font-bold tracking-widest flex items-center gap-2 pl-1" style={{ color: 'var(--text-secondary)' }}>
                  <Home className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  {t('settings.inactivity')}
                </span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      const newVal = inactivityTimeout > 0 ? 0 : 60;
                      setInactivityTimeout(newVal);
                      try { localStorage.setItem('tunet_inactivity_timeout', String(newVal)); } catch {}
                    }}
                    className={`w-10 h-6 rounded-full p-1 transition-colors relative ${inactivityTimeout > 0 ? 'bg-[var(--glass-bg-hover)]' : 'bg-gray-500/30'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${inactivityTimeout > 0 ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
              
              {inactivityTimeout > 0 && (
                <div className="px-1 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                   <div className="flex justify-end mb-1">
                     <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{inactivityTimeout}s</span>
                  </div>
                  <M3Slider
                    min={10}
                    max={300}
                    step={10}
                    value={inactivityTimeout}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setInactivityTimeout(val);
                      try { localStorage.setItem('tunet_inactivity_timeout', String(val)); } catch {}
                    }}
                    colorClass="bg-[var(--text-secondary)]"
                  />
                </div>
              )}
        </div>
      </div>
    </SidebarContainer>
  );
}
