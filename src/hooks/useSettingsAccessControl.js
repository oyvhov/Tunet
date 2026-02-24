import { useCallback, useRef, useState } from 'react';

export function useSettingsAccessControl({
  settingsLockEnabled,
  settingsLockSessionUnlocked,
  unlockSettingsLock,
  t,
}) {
  const [showPinLockModal, setShowPinLockModal] = useState(false);
  const [pinLockError, setPinLockError] = useState('');
  const pendingSettingsActionRef = useRef(null);

  const requestSettingsAccess = useCallback((onSuccess) => {
    if (!settingsLockEnabled || settingsLockSessionUnlocked) {
      if (typeof onSuccess === 'function') onSuccess();
      return true;
    }

    pendingSettingsActionRef.current = typeof onSuccess === 'function' ? onSuccess : null;
    setPinLockError('');
    setShowPinLockModal(true);
    return false;
  }, [settingsLockEnabled, settingsLockSessionUnlocked]);

  const handlePinSubmit = useCallback((pin) => {
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
  }, [unlockSettingsLock, t]);

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
