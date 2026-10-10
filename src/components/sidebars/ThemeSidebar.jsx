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
  RefreshCw,
  Palette,
  Globe,
  Type,
  Flame,
  Feather,
  Link,
  Lock,
} from '../../icons';
import SidebarContainer from './SidebarContainer';
import {
  SidebarAccordion,
  SidebarGroupHeader,
  SidebarNavigation,
  SidebarToggle,
} from './SidebarControls';

const APP_FONT_OPTIONS = ['sans', 'Inter', 'Roboto', 'Lato', 'Montserrat', 'Open Sans', 'Raleway'];

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
  const [securityOpen, setSecurityOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [lockError, setLockError] = useState('');
  const bgModes = [
    { key: 'theme', icon: Sparkles, label: t('settings.bgFollowTheme') },
    { key: 'solid', icon: Sun, label: t('settings.bgSolid') },
    { key: 'gradient', icon: Moon, label: t('settings.bgGradient') },
    { key: 'animated', icon: Sparkles, label: t('settings.bgAurora') },
    { key: 'lavaLamp', icon: Flame, label: t('settings.bgLavaLamp') },
    { key: 'silk', icon: Feather, label: t('settings.bgSilk') },
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
      testId="theme-sidebar"
      closeLabel={t('nav.done')}
      navigation={
        <SidebarNavigation
          active="appearance"
          onSwitchToTheme={() => {}}
          onSwitchToLayout={onSwitchToLayout}
          onSwitchToHeader={onSwitchToHeader}
          t={t}
        />
      }
    >
      <div className="sidebar-stack font-sans">
        <SidebarGroupHeader title={t('settings.basics')} />

        {/* Theme & Language */}
        <div className="sidebar-inspector-list">
          <ModernDropdown
            label={t('settings.theme')}
            icon={Palette}
            options={Object.keys(themes)}
            current={currentTheme}
            onChange={setCurrentTheme}
            map={{ dark: t('theme.dark'), light: t('theme.light'), contextual: 'Smart (Auto)' }}
            placeholder={t('dropdown.noneSelected')}
            variant="inspector"
          />
          <ModernDropdown
            label={t('settings.language')}
            icon={Globe}
            options={['en', 'nb', 'nn', 'sv', 'de', 'zh', 'fr', 'es']}
            current={language}
            onChange={setLanguage}
            map={{
              en: t('language.en'),
              nb: t('language.nb'),
              nn: t('language.nn'),
              sv: t('language.sv'),
              de: t('language.de'),
              zh: t('language.zh'),
              fr: t('language.fr'),
              es: t('language.es'),
            }}
            placeholder={t('dropdown.noneSelected')}
            variant="inspector"
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
            variant="inspector"
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
            variant="inspector"
          />
        </div>

        {/* Background */}
        <div>
          <SidebarGroupHeader
            title={t('settings.background')}
            action={t('settings.reset')}
            onAction={resetBackground}
          />

          <div className="sidebar-background-grid">
            {bgModes.map((mode) => {
              const active = bgMode === mode.key;
              const ModeIcon = mode.icon;
              const previewStyle =
                mode.key === 'solid'
                  ? { background: bgColor }
                  : mode.key === 'gradient'
                    ? {
                        background: `linear-gradient(135deg, ${GRADIENT_PRESETS[bgGradient]?.from || '#0f172a'}, ${GRADIENT_PRESETS[bgGradient]?.to || '#020617'})`,
                      }
                    : undefined;
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setBgMode(mode.key)}
                  aria-pressed={active}
                  className={`sidebar-background-option ${active ? 'is-active' : ''}`}
                >
                  <span
                    className={`sidebar-background-option__preview sidebar-background-option__preview--${mode.key}`}
                    style={previewStyle}
                  >
                    <ModeIcon aria-hidden="true" />
                  </span>
                  <span className="sidebar-background-option__label">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mode-specific controls */}
          {bgMode === 'theme' && (
            <div className="sidebar-inline-panel text-center">
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('settings.bgFollowThemeHint')}
              </p>
            </div>
          )}

          {bgMode === 'solid' && (
            <div className="sidebar-inline-panel flex items-center gap-4">
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
            <div className="sidebar-inline-panel flex flex-wrap gap-3">
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
            <div className="sidebar-inline-panel space-y-3">
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
                  <Link
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <SidebarAccordion
          id="security"
          icon={Lock}
          title={t('settings.lock.title')}
          isOpen={securityOpen}
          toggle={() => setSecurityOpen((previous) => !previous)}
        >
          <div className="space-y-3">
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
        </SidebarAccordion>

        {/* Behavior */}
        <div>
          <SidebarGroupHeader title={t('settings.behavior')} />
          <div className="px-6 py-2 max-[479px]:px-[18px]">
            <SidebarToggle
              label={t('settings.inactivity')}
              value={inactivityTimeout > 0}
              onChange={(enabled) => {
                const nextValue = enabled ? 60 : 0;
                setInactivityTimeout(nextValue);
                try {
                  localStorage.setItem('tunet_inactivity_timeout', String(nextValue));
                } catch {}
              }}
            />

            {inactivityTimeout > 0 && (
              <div className="animate-in fade-in slide-in-from-top-1 pt-1 pb-4 duration-200">
                <div className="mb-1 flex justify-end">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
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
                  variant="thinLg"
                  ariaLabel={t('settings.inactivity')}
                  ariaValueText={`${inactivityTimeout}s`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarContainer>
  );
}
