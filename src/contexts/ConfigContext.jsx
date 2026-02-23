import { createContext, useContext, useState, useEffect } from 'react';
import { themes } from '../config/themes';
import { DEFAULT_LANGUAGE, LEGACY_NN_MIGRATION_FLAG, normalizeLanguage } from '../i18n';
import { hashPin, runConfigMigrations, verifyPin } from '../utils';

/** @typedef {import('../types/dashboard').ConfigContextValue} ConfigContextValue */
/** @typedef {import('../types/dashboard').ConfigProviderProps} ConfigProviderProps */

export const GRADIENT_PRESETS = {
  midnight: { label: 'Midnight', from: '#0f172a', to: '#020617' },
  ocean: { label: 'Ocean', from: '#0c4a6e', to: '#164e63' },
  sunset: { label: 'Sunset', from: '#7c2d12', to: '#581c87' },
  aurora: { label: 'Aurora', from: '#064e3b', to: '#1e1b4b' },
  forest: { label: 'Forest', from: '#14532d', to: '#1a2e05' },
  rose: { label: 'Rose', from: '#881337', to: '#4a044e' },
};

/** @type {import('react').Context<ConfigContextValue | null>} */
const ConfigContext = createContext(null);

/** @returns {ConfigContextValue} */
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};

/** @param {ConfigProviderProps} props */
export const ConfigProvider = ({ children }) => {
  if (typeof window !== 'undefined') {
    runConfigMigrations(window.localStorage, window.sessionStorage);
  }

  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tunet_theme');
        return (saved && themes[saved]) ? saved : 'dark';
      } catch (error) {
        console.error('Failed to read theme from localStorage:', error);
        return 'dark';
      }
    }
    return 'dark';
  });

  const [language, setLanguage] = useState(() => {
    try {
      const rawLanguage = localStorage.getItem('tunet_language') || DEFAULT_LANGUAGE;
      const migrationDone = localStorage.getItem(LEGACY_NN_MIGRATION_FLAG) === '1';
      const shouldMigrateLegacyNn = rawLanguage === 'nn' && !migrationDone;
      const normalizedLanguage = shouldMigrateLegacyNn ? 'nb' : normalizeLanguage(rawLanguage);

      if (shouldMigrateLegacyNn) {
        localStorage.setItem('tunet_language', normalizedLanguage);
        localStorage.setItem(LEGACY_NN_MIGRATION_FLAG, '1');
      }

      return normalizedLanguage;
    } catch (error) {
      console.error('Failed to read language from localStorage:', error);
      return DEFAULT_LANGUAGE;
    }
  });

  const [unitsMode, setUnitsMode] = useState(() => {
    try {
      const saved = localStorage.getItem('tunet_units_mode');
      return saved && ['follow_ha', 'metric', 'imperial'].includes(saved) ? saved : 'follow_ha';
    } catch {
      return 'follow_ha';
    }
  });

  const [settingsLockEnabled, setSettingsLockEnabled] = useState(() => {
    try {
      return localStorage.getItem('tunet_settings_lock_enabled') === '1';
    } catch {
      return false;
    }
  });

  const [settingsLockPinHash, setSettingsLockPinHash] = useState(() => {
    try {
      return localStorage.getItem('tunet_settings_lock_pin_hash') || '';
    } catch {
      return '';
    }
  });

  const [settingsLockSessionUnlocked, setSettingsLockSessionUnlocked] = useState(() => {
    try {
      return window.sessionStorage.getItem('tunet_settings_lock_unlocked') === '1';
    } catch {
      return false;
    }
  });

  const [inactivityTimeout, setInactivityTimeout] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tunet_inactivity_timeout');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!Number.isNaN(parsed)) return parsed;
        }
      } catch (error) {
        console.error('Failed to read inactivity timeout from localStorage:', error);
      }
    }
    return 60;
  });

  const [bgMode, setBgMode] = useState(() => {
    try {
      const saved = localStorage.getItem('tunet_bg_mode');
      return saved && ['theme', 'solid', 'gradient', 'custom', 'animated'].includes(saved) ? saved : 'theme';
    } catch { return 'theme'; }
  });

  const [bgColor, setBgColor] = useState(() => {
    try { return localStorage.getItem('tunet_bg_color') || '#0f172a'; }
    catch { return '#0f172a'; }
  });

  const [bgGradient, setBgGradient] = useState(() => {
    try {
      const saved = localStorage.getItem('tunet_bg_gradient');
      return saved && GRADIENT_PRESETS[saved] ? saved : 'midnight';
    } catch { return 'midnight'; }
  });

  const [bgImage, setBgImage] = useState(() => {
    try { return localStorage.getItem('tunet_bg_image') || ''; }
    catch { return ''; }
  });

  const [cardTransparency, setCardTransparency] = useState(() => {
    try {
      const saved = localStorage.getItem('tunet_card_transparency');
      return saved !== null ? parseInt(saved, 10) : 40; // Default 40% transparency (0.6 opacity)
    } catch { return 40; }
  });

  const [cardBorderOpacity, setCardBorderOpacity] = useState(() => {
    try {
      const saved = localStorage.getItem('tunet_card_border_opacity');
      return saved !== null ? parseInt(saved, 10) : 5; // Default 5% opacity
    } catch { return 5; }
  });

  const [cardBgColor, setCardBgColor] = useState(() => {
    try {
      return localStorage.getItem('tunet_card_bg_color') || '';
    } catch {
      return '';
    }
  });


  const [config, setConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      // Ingress auto-detection: if served under /api/hassio_ingress/<token>,
      // connect to HA's root URL via Token (OAuth often fails in Ingress iframe)
      const path = window.location.pathname;
      const ingressMatch = path.match(/(.*\/api\/hassio_ingress\/[^/]+)/);
      if (ingressMatch && ingressMatch[1]) {
        // Still load saved URL/token from localStorage so the user doesn't
        // have to re-enter credentials on every page reload
        let savedUrl, savedToken;
        try {
          savedUrl = localStorage.getItem('ha_url') || '';
          const persistentToken = localStorage.getItem('ha_token') || '';
          const sessionToken = window.sessionStorage.getItem('ha_token') || '';
          if (persistentToken) {
            savedToken = persistentToken;
          } else if (sessionToken) {
            savedToken = sessionToken;
            localStorage.setItem('ha_token', sessionToken);
            window.sessionStorage.removeItem('ha_token');
          } else {
            savedToken = '';
          }
        } catch { savedUrl = ''; savedToken = ''; }
        return {
          url: savedUrl || window.location.origin,
          fallbackUrl: '',
          token: savedToken,
          authMethod: 'token',
          isIngress: true,
        };
      }

      try {
        const persistentToken = localStorage.getItem('ha_token') || '';
        const sessionToken = window.sessionStorage.getItem('ha_token') || '';
        const token = persistentToken || sessionToken || '';
        if (!persistentToken && sessionToken) {
          localStorage.setItem('ha_token', sessionToken);
          window.sessionStorage.removeItem('ha_token');
        }
        return {
          url: localStorage.getItem('ha_url') || '',
          fallbackUrl: localStorage.getItem('ha_fallback_url') || '',
          token,
          authMethod: localStorage.getItem('ha_auth_method') || 'oauth',
        };
      } catch (error) {
        console.error('Failed to read config from localStorage:', error);
        return { url: '', fallbackUrl: '', token: '', authMethod: 'oauth' };
      }
    }
    return { url: '', fallbackUrl: '', token: '', authMethod: 'oauth' };
  });

  // Apply theme to DOM
  useEffect(() => {
    const themeKey = themes[currentTheme] ? currentTheme : 'dark';
    const theme = themes[themeKey].colors;
    for (const key in theme) {
      document.documentElement.style.setProperty(key, theme[key]);
    }
    document.documentElement.dataset.theme = themeKey;
    document.documentElement.style.colorScheme = themeKey === 'light' ? 'light' : 'dark';
    
    /** @type {HTMLMetaElement | null} */
    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = theme['--bg-primary'];
    
    try {
      localStorage.setItem('tunet_theme', themeKey);
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }
  }, [currentTheme]);

  // Apply background based on bgMode
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const themeKey = themes[currentTheme] ? currentTheme : 'dark';
    const theme = themes[themeKey].colors;

    // Clean up custom image background and inline overrides
    body.style.backgroundImage = '';
    body.style.backgroundSize = '';
    body.style.backgroundPosition = '';
    body.style.backgroundAttachment = '';
    
    // Clear inline variables that might mask theme variables
    root.style.removeProperty('--bg-primary');
    root.style.removeProperty('--bg-gradient-from');
    root.style.removeProperty('--bg-gradient-to');
    
    root.classList.remove('custom-bg-active');

    if (bgMode === 'solid') {
      root.style.setProperty('--bg-gradient-from', bgColor);
      root.style.setProperty('--bg-gradient-to', bgColor);
      root.style.setProperty('--bg-primary', bgColor);
      root.style.backgroundColor = bgColor;
      body.style.backgroundColor = bgColor;
    } else if (bgMode === 'gradient') {
      const preset = GRADIENT_PRESETS[bgGradient] || GRADIENT_PRESETS.midnight;
      root.style.setProperty('--bg-gradient-from', preset.from);
      root.style.setProperty('--bg-gradient-to', preset.to);
      root.style.setProperty('--bg-primary', preset.to);
      root.style.backgroundColor = preset.to;
      body.style.backgroundColor = preset.to;
    } else if (bgMode === 'custom' && bgImage) {
      root.style.backgroundColor = theme['--bg-primary'];
      body.style.backgroundColor = 'transparent';
      body.style.backgroundImage = `url("${bgImage}")`;
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'center';
      body.style.backgroundAttachment = 'fixed';
      root.classList.add('custom-bg-active');
      root.style.setProperty('--bg-primary', theme['--bg-primary']);
    } else {
      // 'theme' mode — let theme colors apply normally
      root.style.backgroundColor = theme['--bg-primary'];
      body.style.backgroundColor = theme['--bg-primary'];
    }
  }, [bgMode, bgColor, bgGradient, bgImage, currentTheme]);

  const parseColorToRgb = (color) => {
    if (!color || typeof color !== 'string') return null;

    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        if ([r, g, b].every((value) => Number.isFinite(value))) return { r, g, b };
      }
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        if ([r, g, b].every((value) => Number.isFinite(value))) return { r, g, b };
      }
      return null;
    }

    if (color.startsWith('rgba') || color.startsWith('rgb')) {
      const parts = color.match(/\d+(\.\d+)?/g);
      if (parts && parts.length >= 3) {
        const r = Number(parts[0]);
        const g = Number(parts[1]);
        const b = Number(parts[2]);
        if ([r, g, b].every((value) => Number.isFinite(value))) return { r, g, b };
      }
    }

    return null;
  };

  // Apply card transparency to DOM
  useEffect(() => {
    const themeKey = themes[currentTheme] ? currentTheme : 'dark';
    const baseColor = cardBgColor || themes[themeKey].colors['--card-bg'];
    const parsed = parseColorToRgb(baseColor);

    if (parsed) {
      // transparency 0-100: 0 = solid, 100 = invisible
      // alpha = 1 - (transparency / 100)
      const alpha = Math.max(0, Math.min(1, 1 - (cardTransparency / 100)));
      document.documentElement.style.setProperty('--card-bg', `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha.toFixed(2)})`);
    } else {
      // Fallback
      document.documentElement.style.setProperty('--card-bg', baseColor);
    }
  }, [cardTransparency, currentTheme, cardBgColor]);

  // Apply card border opacity to DOM
  useEffect(() => {
    const themeKey = themes[currentTheme] ? currentTheme : 'dark';
    const baseBorder = themes[themeKey].colors['--card-border'];

    if (!baseBorder || baseBorder === 'transparent') return;

    let r, g, b;
    if (baseBorder.startsWith('#')) {
      const hex = baseBorder.substring(1);
      if (hex.length === 3) {
          r = parseInt(hex[0]+hex[0], 16);
          g = parseInt(hex[1]+hex[1], 16);
          b = parseInt(hex[2]+hex[2], 16);
      } else {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
      }
    } else if (baseBorder.startsWith('rgba') || baseBorder.startsWith('rgb')) {
      const parts = baseBorder.match(/(\d+)/g);
      if (parts && parts.length >= 3) {
        [r, g, b] = parts;
      }
    }

    if (r !== undefined) {
      // Map 0-100 slider directly to 0.0-1.0 alpha (0 = invisible, 100 = opaque)
      const alpha = cardBorderOpacity / 100;
      document.documentElement.style.setProperty('--card-border', `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`);
    }
  }, [cardBorderOpacity, currentTheme]);

  // Persist background settings
  useEffect(() => {
    try { localStorage.setItem('tunet_bg_mode', bgMode); } catch {}
  }, [bgMode]);
  useEffect(() => {
    try { localStorage.setItem('tunet_bg_color', bgColor); } catch {}
  }, [bgColor]);
  useEffect(() => {
    try { localStorage.setItem('tunet_bg_gradient', bgGradient); } catch {}
  }, [bgGradient]);
  useEffect(() => {
    try { localStorage.setItem('tunet_bg_image', bgImage); } catch {}
  }, [bgImage]);
  useEffect(() => {
    try { localStorage.setItem('tunet_card_transparency', String(cardTransparency)); } catch {}
  }, [cardTransparency]);
  useEffect(() => {
    try { localStorage.setItem('tunet_card_border_opacity', String(cardBorderOpacity)); } catch {}
  }, [cardBorderOpacity]);
  useEffect(() => {
    try {
      if (cardBgColor) {
        localStorage.setItem('tunet_card_bg_color', cardBgColor);
      } else {
        localStorage.removeItem('tunet_card_bg_color');
      }
    } catch {}
  }, [cardBgColor]);

  // Save language to localStorage
  useEffect(() => {
    try {
      const normalizedLanguage = normalizeLanguage(language);
      localStorage.setItem('tunet_language', normalizedLanguage);
      localStorage.setItem(LEGACY_NN_MIGRATION_FLAG, '1');
    } catch (error) {
      console.error('Failed to save language to localStorage:', error);
    }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem('tunet_units_mode', unitsMode);
    } catch {}
  }, [unitsMode]);

  useEffect(() => {
    try {
      localStorage.setItem('tunet_settings_lock_enabled', settingsLockEnabled ? '1' : '0');
    } catch {}
  }, [settingsLockEnabled]);

  useEffect(() => {
    try {
      if (settingsLockPinHash) {
        localStorage.setItem('tunet_settings_lock_pin_hash', settingsLockPinHash);
      } else {
        localStorage.removeItem('tunet_settings_lock_pin_hash');
      }
    } catch {}
  }, [settingsLockPinHash]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem('tunet_settings_lock_unlocked', settingsLockSessionUnlocked ? '1' : '0');
    } catch {}
  }, [settingsLockSessionUnlocked]);

  const enableSettingsLock = (pin) => {
    const pinHash = hashPin(pin);
    setSettingsLockPinHash(pinHash);
    setSettingsLockEnabled(true);
    setSettingsLockSessionUnlocked(false);
  };

  const disableSettingsLock = () => {
    setSettingsLockEnabled(false);
    setSettingsLockPinHash('');
    setSettingsLockSessionUnlocked(false);
  };

  const unlockSettingsLock = (pin) => {
    if (!settingsLockEnabled) return true;
    const unlocked = verifyPin(pin, settingsLockPinHash);
    if (unlocked) setSettingsLockSessionUnlocked(true);
    return unlocked;
  };

  const lockSettingsSession = () => {
    if (settingsLockEnabled) {
      setSettingsLockSessionUnlocked(false);
    }
  };


  const toggleTheme = () => {
    const themeKeys = Object.keys(themes);
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setCurrentTheme(themeKeys[nextIndex]);
  };

  /** @type {ConfigContextValue} */
  const value = {
    currentTheme,
    setCurrentTheme,
    toggleTheme,
    language,
    setLanguage,
    unitsMode,
    setUnitsMode,
    settingsLockEnabled,
    settingsLockSessionUnlocked,
    enableSettingsLock,
    disableSettingsLock,
    unlockSettingsLock,
    lockSettingsSession,
    inactivityTimeout,
    setInactivityTimeout,
    bgMode,
    setBgMode,
    bgColor,
    setBgColor,
    bgGradient,
    setBgGradient,
    bgImage,
    setBgImage,
    cardTransparency,
    setCardTransparency,
    cardBorderOpacity,
    setCardBorderOpacity,
    cardBgColor,
    setCardBgColor,
    config,
    setConfig,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};
