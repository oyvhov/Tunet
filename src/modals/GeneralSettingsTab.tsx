import { useState } from 'react';
import ModernDropdown from '../components/ui/ModernDropdown';
import M3Slider from '../components/ui/M3Slider';
import PinLockModal from '../components/ui/PinLockModal';
import { SidebarAccordion, SidebarToggle } from '../components/sidebars/SidebarControls';
import { useConfig } from '../contexts';
import { Globe, Lock, RefreshCw } from '../icons';
import type { Translate } from '../types/ha';
import { isValidPin } from '../utils';
import type { UnitsMode } from '../utils/units';

export interface GeneralSettingsTabProps {
  t: Translate;
  language: string;
  setLanguage: (language: string) => void;
  inactivityTimeout: number;
  setInactivityTimeout: (seconds: number) => void;
}

const LANGUAGES = ['en', 'nb', 'nn', 'sv', 'de', 'zh', 'fr', 'es'];

const FIELD_STYLE = {
  backgroundColor: 'var(--glass-bg)',
  borderColor: 'var(--glass-border)',
  color: 'var(--text-primary)',
};

const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 4);

const rememberInactivityTimeout = (seconds: number) => {
  try {
    localStorage.setItem('tunet_inactivity_timeout', String(seconds));
  } catch {}
};

export default function GeneralSettingsTab({
  t,
  language,
  setLanguage,
  inactivityTimeout,
  setInactivityTimeout,
}: GeneralSettingsTabProps) {
  const {
    unitsMode,
    setUnitsMode,
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
  const [disablePinOpen, setDisablePinOpen] = useState(false);
  const [disablePinError, setDisablePinError] = useState('');

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
    if (!unlockSettingsLock(unlockPin)) {
      setLockError(t('settings.lock.pinIncorrect'));
      return;
    }
    setUnlockPin('');
    setLockError('');
  };

  const closeDisablePin = () => {
    setDisablePinOpen(false);
    setDisablePinError('');
  };

  const handleDisablePinSubmit = (pin: string) => {
    if (!unlockSettingsLock(pin)) {
      setDisablePinError(t('settings.lock.pinIncorrect'));
      return;
    }
    closeDisablePin();
    disableSettingsLock();
    setNewPin('');
    setConfirmPin('');
    setUnlockPin('');
    setLockError('');
  };

  const updateInactivityTimeout = (seconds: number) => {
    setInactivityTimeout(seconds);
    rememberInactivityTimeout(seconds);
  };

  const buttonClassName = 'rounded-lg border px-3 py-2 text-xs font-semibold';
  const pinField = (value: string, onChange: (value: string) => void, placeholder: string) => (
    <input
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={4}
      value={value}
      onChange={(e) => onChange(onlyDigits(e.target.value))}
      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
      style={FIELD_STYLE}
      placeholder={placeholder}
    />
  );

  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-6 font-sans duration-300">
      <div className="space-y-3">
        <p className="modal-section-label ml-1">{t('settings.basics')}</p>
        <div className="space-y-4">
          <ModernDropdown
            label={t('settings.language')}
            icon={Globe}
            options={LANGUAGES}
            current={language}
            onChange={setLanguage}
            map={Object.fromEntries(LANGUAGES.map((code) => [code, t(`language.${code}`)]))}
            placeholder={t('dropdown.noneSelected')}
          />
          <ModernDropdown
            label={t('settings.unitSystem')}
            icon={RefreshCw}
            options={['follow_ha', 'metric', 'imperial']}
            current={unitsMode}
            onChange={(mode) => setUnitsMode(mode as UnitsMode)}
            map={{
              follow_ha: t('settings.unitSystem.followHa'),
              metric: t('settings.unitSystem.metric'),
              imperial: t('settings.unitSystem.imperial'),
            }}
            placeholder={t('dropdown.noneSelected')}
          />
        </div>
      </div>

      <div className="popup-surface overflow-hidden">
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
                    {pinField(unlockPin, setUnlockPin, t('settings.lock.pin'))}
                    <button
                      type="button"
                      onClick={handleUnlock}
                      className={buttonClassName}
                      style={FIELD_STYLE}
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
                      className={buttonClassName}
                      style={FIELD_STYLE}
                    >
                      {t('settings.lock.lockNow')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDisablePinOpen(true)}
                    className={buttonClassName}
                    style={FIELD_STYLE}
                  >
                    {t('settings.lock.disable')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2">
                  {pinField(newPin, setNewPin, t('settings.lock.pin'))}
                  {pinField(confirmPin, setConfirmPin, t('settings.lock.pinConfirm'))}
                </div>
                <button
                  type="button"
                  onClick={handleEnableLock}
                  className={buttonClassName}
                  style={FIELD_STYLE}
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
      </div>

      <div className="space-y-3">
        <p className="modal-section-label ml-1">{t('settings.behavior')}</p>
        <div className="popup-surface px-4 py-1">
          <SidebarToggle
            label={t('settings.inactivity')}
            value={inactivityTimeout > 0}
            onChange={(enabled: boolean) => updateInactivityTimeout(enabled ? 60 : 0)}
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
                onChange={(e) => updateInactivityTimeout(parseInt(e.target.value, 10))}
                variant="thinLg"
                ariaLabel={t('settings.inactivity')}
                ariaValueText={`${inactivityTimeout}s`}
              />
            </div>
          )}
        </div>
      </div>

      <PinLockModal
        open={disablePinOpen}
        onClose={closeDisablePin}
        onSubmit={handleDisablePinSubmit}
        t={t}
        error={disablePinError}
        title={t('settings.lock.enterPinToDisable')}
      />
    </div>
  );
}
