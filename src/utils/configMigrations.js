import { themes } from '../config/themes';
import { DEFAULT_LANGUAGE, LEGACY_NN_MIGRATION_FLAG, normalizeLanguage } from '../i18n';

const CONFIG_STORAGE_VERSION_KEY = 'tunet_config_storage_version';
const CURRENT_CONFIG_STORAGE_VERSION = 1;

const VALID_UNITS_MODE = new Set(['follow_ha', 'metric', 'imperial']);
const VALID_BG_MODE = new Set(['theme', 'solid', 'gradient', 'custom', 'animated']);

const readNumberOrFallback = (storage, key, fallback) => {
  const raw = storage.getItem(key);
  const parsed = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const migrateV1 = (storage, sessionStorageRef) => {
  const savedTheme = storage.getItem('tunet_theme');
  if (!savedTheme || !themes[savedTheme]) {
    storage.setItem('tunet_theme', 'dark');
  }

  const rawLanguage = storage.getItem('tunet_language') || DEFAULT_LANGUAGE;
  const migrationDone = storage.getItem(LEGACY_NN_MIGRATION_FLAG) === '1';
  const shouldMigrateLegacyNn = rawLanguage === 'nn' && !migrationDone;
  const normalizedLanguage = shouldMigrateLegacyNn ? 'nb' : normalizeLanguage(rawLanguage);
  storage.setItem('tunet_language', normalizedLanguage);
  storage.setItem(LEGACY_NN_MIGRATION_FLAG, '1');

  const unitsMode = storage.getItem('tunet_units_mode');
  if (!unitsMode || !VALID_UNITS_MODE.has(unitsMode)) {
    storage.setItem('tunet_units_mode', 'follow_ha');
  }

  const inactivityTimeout = readNumberOrFallback(storage, 'tunet_inactivity_timeout', 60);
  storage.setItem('tunet_inactivity_timeout', String(inactivityTimeout));

  const bgMode = storage.getItem('tunet_bg_mode');
  if (!bgMode || !VALID_BG_MODE.has(bgMode)) {
    storage.setItem('tunet_bg_mode', 'theme');
  }

  const cardTransparency = readNumberOrFallback(storage, 'tunet_card_transparency', 40);
  storage.setItem('tunet_card_transparency', String(cardTransparency));

  const cardBorderOpacity = readNumberOrFallback(storage, 'tunet_card_border_opacity', 5);
  storage.setItem('tunet_card_border_opacity', String(cardBorderOpacity));

  const settingsLockEnabled = storage.getItem('tunet_settings_lock_enabled');
  if (settingsLockEnabled !== '1' && settingsLockEnabled !== '0') {
    storage.setItem('tunet_settings_lock_enabled', '0');
  }

  const sessionUnlocked = sessionStorageRef.getItem('tunet_settings_lock_unlocked');
  if (sessionUnlocked !== '1' && sessionUnlocked !== '0') {
    sessionStorageRef.setItem('tunet_settings_lock_unlocked', '0');
  }
};

/**
 * Versioned localStorage migrations for ConfigContext-owned keys.
 * Safe to call repeatedly; migrations only run when version changes.
 */
export const runConfigMigrations = (storage, sessionStorageRef) => {
  if (!storage || !sessionStorageRef) return;

  try {
    const currentVersionRaw = storage.getItem(CONFIG_STORAGE_VERSION_KEY);
    const currentVersion = Number.isFinite(Number(currentVersionRaw)) ? Number(currentVersionRaw) : 0;

    for (let version = currentVersion + 1; version <= CURRENT_CONFIG_STORAGE_VERSION; version += 1) {
      if (version === 1) {
        migrateV1(storage, sessionStorageRef);
      }
      storage.setItem(CONFIG_STORAGE_VERSION_KEY, String(version));
    }
  } catch {
    // Ignore migration failures and let context-level fallbacks handle invalid values.
  }
};
