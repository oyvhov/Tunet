import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConfigProvider, useConfig } from '../contexts/ConfigContext';
import { hashPin } from '../utils';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ConfigProvider>{children}</ConfigProvider>
);
const mount = () => renderHook(() => useConfig(), { wrapper }).result;

const LOCK_ENABLED = 'tunet_settings_lock_enabled';
const LOCK_HASH = 'tunet_settings_lock_pin_hash';
const LOCK_UNLOCKED = 'tunet_settings_lock_unlocked';
const PIN = '1234';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('useConfig', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useConfig())).toThrow(
      'useConfig must be used within ConfigProvider'
    );
  });
});

describe('settings lock', () => {
  it('starts unlocked and off', () => {
    const config = mount();

    expect(config.current.settingsLockEnabled).toBe(false);
    expect(config.current.settingsLockSessionUnlocked).toBe(false);
    expect(localStorage.getItem(LOCK_ENABLED)).toBe('0');
    expect(localStorage.getItem(LOCK_HASH)).toBeNull();
  });

  it('stores a hash of the pin and not the pin itself', () => {
    const config = mount();

    act(() => config.current.enableSettingsLock(PIN));

    expect(config.current.settingsLockEnabled).toBe(true);
    expect(config.current.settingsLockSessionUnlocked).toBe(false);
    expect(localStorage.getItem(LOCK_ENABLED)).toBe('1');
    expect(localStorage.getItem(LOCK_HASH)).toBe(hashPin(PIN));
    expect(localStorage.getItem(LOCK_HASH)).not.toBe(PIN);
  });

  it('stays locked for a wrong pin', () => {
    const config = mount();
    act(() => config.current.enableSettingsLock(PIN));

    let unlocked: boolean | undefined;
    act(() => {
      unlocked = config.current.unlockSettingsLock('9999');
    });

    expect(unlocked).toBe(false);
    expect(config.current.settingsLockSessionUnlocked).toBe(false);
    expect(sessionStorage.getItem(LOCK_UNLOCKED)).toBe('0');
  });

  it('unlocks the session for the right pin', () => {
    const config = mount();
    act(() => config.current.enableSettingsLock(PIN));

    let unlocked: boolean | undefined;
    act(() => {
      unlocked = config.current.unlockSettingsLock(PIN);
    });

    expect(unlocked).toBe(true);
    expect(config.current.settingsLockSessionUnlocked).toBe(true);
    expect(sessionStorage.getItem(LOCK_UNLOCKED)).toBe('1');
  });

  it('reports success without a pin when the lock is off', () => {
    const config = mount();

    expect(config.current.unlockSettingsLock('anything')).toBe(true);
    expect(config.current.settingsLockSessionUnlocked).toBe(false);
  });

  it('locks an unlocked session again', () => {
    const config = mount();
    act(() => config.current.enableSettingsLock(PIN));
    act(() => {
      config.current.unlockSettingsLock(PIN);
    });

    act(() => config.current.lockSettingsSession());

    expect(config.current.settingsLockSessionUnlocked).toBe(false);
    expect(sessionStorage.getItem(LOCK_UNLOCKED)).toBe('0');
  });

  it('forgets the pin when the lock is turned off', () => {
    const config = mount();
    act(() => config.current.enableSettingsLock(PIN));
    act(() => {
      config.current.unlockSettingsLock(PIN);
    });

    act(() => config.current.disableSettingsLock());

    expect(config.current.settingsLockEnabled).toBe(false);
    expect(config.current.settingsLockSessionUnlocked).toBe(false);
    expect(localStorage.getItem(LOCK_ENABLED)).toBe('0');
    expect(localStorage.getItem(LOCK_HASH)).toBeNull();
  });

  it('still needs the pin after a reload in a new session', () => {
    const first = mount();
    act(() => first.current.enableSettingsLock(PIN));
    sessionStorage.clear();

    const reloaded = mount();

    expect(reloaded.current.settingsLockEnabled).toBe(true);
    expect(reloaded.current.settingsLockSessionUnlocked).toBe(false);
    expect(reloaded.current.unlockSettingsLock('9999')).toBe(false);
    let unlocked: boolean | undefined;
    act(() => {
      unlocked = reloaded.current.unlockSettingsLock(PIN);
    });
    expect(unlocked).toBe(true);
  });

  it('keeps an unlocked session across a reload in the same tab', () => {
    const first = mount();
    act(() => first.current.enableSettingsLock(PIN));
    act(() => {
      first.current.unlockSettingsLock(PIN);
    });

    expect(mount().current.settingsLockSessionUnlocked).toBe(true);
  });

  it('cannot be unlocked when the stored hash is missing', () => {
    localStorage.setItem(LOCK_ENABLED, '1');
    const config = mount();

    expect(config.current.settingsLockEnabled).toBe(true);
    expect(config.current.unlockSettingsLock(PIN)).toBe(false);
  });
});

describe('language', () => {
  it('defaults to a supported language and writes it back', () => {
    const config = mount();

    expect(config.current.language).toBe('en');
    expect(localStorage.getItem('tunet_language')).toBe('en');
  });

  it('restores a saved language', () => {
    localStorage.setItem('tunet_language', 'de');

    expect(mount().current.language).toBe('de');
  });

  it('persists a change', () => {
    const config = mount();

    act(() => config.current.setLanguage('fr'));

    expect(config.current.language).toBe('fr');
    expect(localStorage.getItem('tunet_language')).toBe('fr');
    expect(mount().current.language).toBe('fr');
  });

  it('normalizes a stored language it does not know', () => {
    localStorage.setItem('tunet_language', 'klingon');

    expect(mount().current.language).toBe('en');
    expect(localStorage.getItem('tunet_language')).toBe('en');
  });

  it('never persists an unsupported language', () => {
    const config = mount();

    act(() => config.current.setLanguage('klingon'));

    expect(localStorage.getItem('tunet_language')).toBe('en');
  });
});

describe('units mode', () => {
  it('follows Home Assistant by default', () => {
    expect(mount().current.unitsMode).toBe('follow_ha');
    expect(localStorage.getItem('tunet_units_mode')).toBe('follow_ha');
  });

  it.each(['follow_ha', 'metric', 'imperial'])('restores a saved %s mode', (mode) => {
    localStorage.setItem('tunet_units_mode', mode);

    expect(mount().current.unitsMode).toBe(mode);
  });

  it('replaces an invalid saved mode', () => {
    localStorage.setItem('tunet_units_mode', 'nautical');

    expect(mount().current.unitsMode).toBe('follow_ha');
    expect(localStorage.getItem('tunet_units_mode')).toBe('follow_ha');
  });

  it('persists a change across a reload', () => {
    const config = mount();

    act(() => config.current.setUnitsMode('imperial'));

    expect(config.current.unitsMode).toBe('imperial');
    expect(localStorage.getItem('tunet_units_mode')).toBe('imperial');
    expect(mount().current.unitsMode).toBe('imperial');
  });
});

describe('what happens next line', () => {
  it('is off by default', () => {
    expect(mount().current.showNextUp).toBe(false);
  });

  it('persists a change across a reload', () => {
    const config = mount();

    act(() => config.current.setShowNextUp(true));

    expect(config.current.showNextUp).toBe(true);
    expect(localStorage.getItem('tunet_show_next_up')).toBe('1');
    expect(mount().current.showNextUp).toBe(true);
  });
});
