// Similar imports to ConfigModal
import React, { useState } from 'react';
import ModernDropdown from '../ui/ModernDropdown';
import M3Slider from '../ui/M3Slider';
import { GRADIENT_PRESETS } from '../../contexts/ConfigContext';
import { useConfig } from '../../contexts';
import { isValidPin } from '../../utils';
import {
  Sparkles,
  Sun,
  Moon,
  Home,
  RefreshCw,
  Palette,
  Globe,
  LayoutGrid,
  Type,
} from '../../icons';
import SidebarContainer from './SidebarContainer';

const APP_FONT_OPTIONS = ['sans', 'Inter', 'Roboto', 'Lato', 'Montserrat', 'Open Sans', 'Raleway'];

const LinkIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
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
  setInactivityTimeout,
}) {
  const {
    unitsMode,
    setUnitsMode,
    appFont,
    setAppFont,
    settingsLockEnabled,
    settingsLockSessionUnlocked,
    enableSettingsLock,
    disableSettingsLock,
    unlockSettingsLock,
    lockSettingsSession,
  } = useConfig();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [lockError, setLockError] = useState('');
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

  const handleEnableLock = () => {
    if (!isValidPin(newPin) || !isValidPin(confirmPin)) {
      setLockError(t('settings.lock.pinInvalid'));
      return;
    }
    if (newPin !== confirmPin) {
      setLockError(t('settings.lock.pinMismatch'));
      return;
    }
    enableSettingsLock(newPin);
    setNewPin('');
    setConfirmPin('');
    setUnlockPin('');
    setLockError('');
  };

  const handleUnlock = () => {
    if (!isValidPin(unlockPin)) {
      setLockError(t('settings.lock.pinInvalid'));
      return;
    }
    const unlocked = unlockSettingsLock(unlockPin);
    if (!unlocked) {
      setLockError(t('settings.lock.pinIncorrect'));
      return;
    }
    setUnlockPin('');
    setLockError('');
  };

  const handleDisableLock = () => {
    const pin = window.prompt(t('settings.lock.enterPinToDisable'));
    if (pin === null) return;
    if (!unlockSettingsLock(pin)) {
      setLockError(t('settings.lock.pinIncorrect'));
      return;
    }
    disableSettingsLock();
    setNewPin('');
    setConfirmPin('');
    setUnlockPin('');
    setLockError('');
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
        <div className="mb-6 flex items-center justify-center">
          <div
            className="flex rounded-2xl border p-1 shadow-sm"
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
          >
            <button
              className="relative z-10 flex h-9 w-12 items-center justify-center rounded-xl font-medium shadow-md transition-all"
              style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }}
              disabled
              title={t('system.tabAppearance')}
            >
              <Palette className="h-5 w-5" />
            </button>

            <div className="mx-1 my-1 w-px" style={{ backgroundColor: 'var(--glass-border)' }} />

            <button
              className="flex h-9 w-12 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-all hover:bg-white/5 hover:text-[var(--text-primary)]"
              onClick={onSwitchToLayout}
              title={t('system.tabLayout')}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>

            <div className="mx-1 my-1 w-px" style={{ backgroundColor: 'var(--glass-border)' }} />

            <button
              className="flex h-9 w-12 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-all hover:bg-white/5 hover:text-[var(--text-primary)]"
              onClick={onSwitchToHeader}
              title={t('system.tabHeader')}
            >
              <Type className="h-5 w-5" />
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
              map={{
                en: t('language.en'),
                nb: t('language.nb'),
                nn: t('language.nn'),
                sv: t('language.sv'),
                de: t('language.de'),
              }}
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
                imperial: t('settings.unitSystem.imperial'),
              }}
              placeholder={t('dropdown.noneSelected')}
            />
            <ModernDropdown
              label={t('settings.appFont')}
              icon={Type}
              options={APP_FONT_OPTIONS}
              current={appFont}
              onChange={setAppFont}
              map={{
                sans: 'Sans-serif',
                Inter: 'Inter',
                Roboto: 'Roboto',
                Lato: 'Lato',
                Montserrat: 'Montserrat',
                'Open Sans': 'Open Sans',
                Raleway: 'Raleway',
              }}
              placeholder={t('dropdown.noneSelected')}
            />
          </div>
        </div>

        <div className="h-px" style={{ backgroundColor: 'var(--glass-border)' }} />

        <div className="space-y-4">
          <p
            className="pl-1 text-xs font-bold tracking-widest uppercase"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('settings.lock.title')}
          </p>
          <div className="popup-surface space-y-3 rounded-xl p-3">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('settings.lock.description')}
            </p>
            {settingsLockEnabled ? (
              <>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {settingsLockSessionUnlocked
                    ? t('settings.lock.statusUnlocked')
                    : t('settings.lock.statusLocked')}
                </p>
                {!settingsLockSessionUnlocked && (
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={unlockPin}
                      onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-primary)',
                      }}
                      placeholder={t('settings.lock.pin')}
                    />
                    <button
                      type="button"
                      onClick={handleUnlock}
                      className="rounded-lg border px-3 py-2 text-xs font-semibold"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {t('settings.lock.unlock')}
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {settingsLockSessionUnlocked && (
                    <button
                      type="button"
                      onClick={lockSettingsSession}
                      className="rounded-lg border px-3 py-2 text-xs font-semibold"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        borderColor: 'var(--glass-border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {t('settings.lock.lockNow')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDisableLock}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--glass-bg)',
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {t('settings.lock.disable')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--glass-bg)',
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder={t('settings.lock.pin')}
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--glass-bg)',
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder={t('settings.lock.pinConfirm')}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleEnableLock}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--glass-bg)',
                    borderColor: 'var(--glass-border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {t('settings.lock.enable')}
                </button>
              </>
            )}
            {lockError && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {lockError}
              </p>
            )}
          </div>
        </div>

        {/* Background */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p
              className="pl-1 text-xs font-bold tracking-widest uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('settings.background')}
            </p>
            <button
              type="button"
              onClick={resetBackground}
              className="rounded-sm px-2 py-1 text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase transition-colors hover:bg-[var(--glass-bg-hover)]"
            >
              {t('settings.reset')}
            </button>
          </div>

          {/* Mode Selector - Compact */}
          <div className="grid grid-cols-4 gap-2">
            {bgModes.map((mode) => {
              const active = bgMode === mode.key;
              const ModeIcon = mode.icon;
              return (
                <button
                  key={mode.key}
                  onClick={() => setBgMode(mode.key)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all ${
                    active
                      ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:bg-white/10'
                  }`}
                  style={!active ? { backgroundColor: 'var(--glass-bg)' } : {}}
                >
                  <ModeIcon className="h-4 w-4" />
                  <span className="text-[9px] leading-tight font-bold tracking-wider uppercase">
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mode-specific controls */}
          {bgMode === 'theme' && (
            <div
              className="rounded-xl border p-3 text-center"
              style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
            >
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('settings.bgFollowThemeHint')}
              </p>
            </div>
          )}

          {bgMode === 'solid' && (
            <div className="flex items-center gap-4 py-2">
              <div
                className="group relative h-12 w-12 cursor-pointer overflow-hidden rounded-xl border shadow-lg"
                style={{ borderColor: 'var(--glass-border)' }}
              >
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
                <div
                  className="h-full w-full transition-colors"
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
                  className="w-full rounded-xl border px-3 py-2.5 font-mono text-sm uppercase transition-colors outline-none focus:border-[var(--glass-border)]"
                  style={{
                    backgroundColor: 'var(--glass-bg)',
                    borderColor: 'var(--glass-border)',
                    color: 'var(--text-primary)',
                  }}
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
                      className={`h-12 w-12 rounded-xl transition-all ${
                        active
                          ? 'scale-105 ring-2 ring-[var(--accent-color)]'
                          : 'opacity-80 hover:scale-105 hover:opacity-100'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                      }}
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
                    className="w-full rounded-xl border px-4 py-3 pl-10 text-xs transition-colors outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--glass-border)]"
                    style={{
                      backgroundColor: 'var(--glass-bg)',
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder={t('settings.bgUrl')}
                  />
                  <LinkIcon
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-px" style={{ backgroundColor: 'var(--glass-border)' }} />

        {/* Behavior */}
        <div className="space-y-4">
          <div className="mb-4 flex items-center justify-between">
            <span
              className="flex items-center gap-2 pl-1 text-xs font-bold tracking-widest uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Home className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              {t('settings.inactivity')}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const newVal = inactivityTimeout > 0 ? 0 : 60;
                  setInactivityTimeout(newVal);
                  try {
                    localStorage.setItem('tunet_inactivity_timeout', String(newVal));
                  } catch {}
                }}
                className={`relative h-6 w-10 rounded-full p-1 transition-colors ${inactivityTimeout > 0 ? 'bg-[var(--glass-bg-hover)]' : 'bg-gray-500/30'}`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${inactivityTimeout > 0 ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>

          {inactivityTimeout > 0 && (
            <div className="animate-in fade-in slide-in-from-top-1 px-1 pt-2 duration-200">
              <div className="mb-1 flex justify-end">
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  {inactivityTimeout}s
                </span>
              </div>
              <M3Slider
                min={10}
                max={300}
                step={10}
                value={inactivityTimeout}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setInactivityTimeout(val);
                  try {
                    localStorage.setItem('tunet_inactivity_timeout', String(val));
                  } catch {}
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
