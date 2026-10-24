import { useCallback, useRef, useState } from 'react';
import type { Translate } from '../types/ha';

export interface UseSettingsAccessControlDeps {
  settingsLockEnabled: boolean;
  settingsLockSessionUnlocked: boolean;
  unlockSettingsLock: (pin: string) => boolean;
  t: Translate;
}

type SettingsAction = () => void;

export function useSettingsAccessControl({
  settingsLockEnabled,
  settingsLockSessionUnlocked,
  unlockSettingsLock,
  t,
}: UseSettingsAccessControlDeps) {
  const [showPinLockModal, setShowPinLockModal] = useState(false);
  const [pinLockError, setPinLockError] = useState('');
  const pendingSettingsActionRef = useRef<SettingsAction | null>(null);

  const requestSettingsAccess = useCallback(
    (onSuccess?: SettingsAction | null) => {
      if (!settingsLockEnabled || settingsLockSessionUnlocked) {
        if (typeof onSuccess === 'function') onSuccess();
        return true;
      }

      pendingSettingsActionRef.current = typeof onSuccess === 'function' ? onSuccess : null;
      setPinLockError('');
      setShowPinLockModal(true);
      return false;
    },
    [settingsLockEnabled, settingsLockSessionUnlocked]
  );

  const handlePinSubmit = useCallback(
    (pin: string) => {
      const unlocked = unlockSettingsLock(pin);
      if (!unlocked) {
        setPinLockError(t('settings.lock.pinIncorrect'));
        return;
      }

      setPinLockError('');
      setShowPinLockModal(false);

      const pendingAction = pendingSettingsActionRef.current;
      pendingSettingsActionRef.current = null;
      if (typeof pendingAction === 'function') pendingAction();
    },
    [unlockSettingsLock, t]
  );

  const closePinLockModal = useCallback(() => {
    setShowPinLockModal(false);
    setPinLockError('');
    pendingSettingsActionRef.current = null;
  }, []);

  return {
    showPinLockModal,
    pinLockError,
    requestSettingsAccess,
    handlePinSubmit,
    closePinLockModal,
  };
}
