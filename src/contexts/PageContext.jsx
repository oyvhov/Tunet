import { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_PAGES_CONFIG } from '../config/defaults';
import { MAX_GRID_COLUMNS, MIN_GRID_COLUMNS } from '../hooks/useResponsiveGrid';

/** @typedef {import('../types/dashboard').PageContextValue} PageContextValue */
/** @typedef {import('../types/dashboard').PageProviderProps} PageProviderProps */

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to parse ${key}:`, error);
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
};

const readNumber = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const readBoolean = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    if (raw === '1' || raw === 'true') return true;
    if (raw === '0' || raw === 'false') return false;
    return fallback;
  } catch {
    return fallback;
  }
};

const DEFAULT_SECTION_SPACING = {
  headerToStatus: 16,
  statusToNav: 24,
  navToGrid: 24,
};

const normalizeGridColumns = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 4;
  return Math.max(MIN_GRID_COLUMNS, Math.min(Math.round(parsed), MAX_GRID_COLUMNS));
};

const ROOM_CARD_DEFAULTS = {
  showLightChip: true,
  showMediaChip: true,
  showActiveChip: true,
  showVacuumChip: true,
  showOccupiedIndicator: true,
  showPopupClimate: true,
  showPopupLights: true,
  showPopupTempOverview: true,
  showPopupMedia: true,
  showPopupVacuum: true,
  navigateOnTap: false,
};

function migrateCardSettings(rawSettings) {
  if (!rawSettings || typeof rawSettings !== 'object') return { migratedSettings: {}, changed: false };

  let changed = false;
  const migratedSettings = { ...rawSettings };

  Object.entries(migratedSettings).forEach(([settingsKey, settings]) => {
    if (!settings || typeof settings !== 'object') return;

    const isRoomSettings = settingsKey.includes('room_card_')
      || String(settings.type || '').toLowerCase() === 'room'
      || typeof settings.areaId === 'string';

    if (!isRoomSettings) return;

    const next = { ...settings };
    Object.entries(ROOM_CARD_DEFAULTS).forEach(([key, defaultValue]) => {
      if (next[key] === undefined) {
        next[key] = defaultValue;
        changed = true;
      }
    });

    migratedSettings[settingsKey] = next;
  });

  return { migratedSettings, changed };
}

/** Synchronously load & migrate pagesConfig from localStorage. */
function loadPagesConfig() {
  const parsed = readJSON('tunet_pages_config', null);
  if (!parsed) return DEFAULT_PAGES_CONFIG;

  let modified = false;

  // Remove legacy automations page config entirely
  if (parsed.automations) { delete parsed.automations; modified = true; }

  // Ensure pages array exists
  if (!Array.isArray(parsed.pages)) {
    const detectedPages = Object.keys(parsed)
      .filter(key => Array.isArray(parsed[key]) &&
        !['header', 'settings', 'automations'].includes(key));
    parsed.pages = detectedPages.length > 0 ? detectedPages : ['home'];
    modified = true;
  }

  // Filter out settings and legacy automations from pages
  parsed.pages = parsed.pages.filter(id => id !== 'settings' && id !== 'automations');
  if (parsed.pages.length === 0) { parsed.pages = ['home']; modified = true; }

  // Ensure all pages have arrays
  parsed.pages.forEach((pageId) => {
    if (!Array.isArray(parsed[pageId])) { parsed[pageId] = []; modified = true; }
  });

  // Ensure header exists
  if (!parsed.header) { parsed.header = []; modified = true; }

  if (modified) writeJSON('tunet_pages_config', parsed);
  return parsed;
}

/** Synchronously load & migrate status pills config from localStorage. */
function loadStatusPillsConfig() {
  const parsed = readJSON('tunet_status_pills_config', []);
  if (!Array.isArray(parsed)) return [];

  let modified = false;
  const next = parsed.map((pill) => {
    if (!pill || typeof pill !== 'object' || pill.type !== 'sonos') return pill;

    const updates = {};
    if (typeof pill.clickable !== 'boolean') {
      updates.clickable = true;
      modified = true;
    }
    if (typeof pill.showCount !== 'boolean') {
      updates.showCount = true;
      modified = true;
    }
    if (typeof pill.sonosHeadingSource !== 'string') {
      updates.sonosHeadingSource = 'song';
      modified = true;
    }
    if (typeof pill.sonosSubheadingSource !== 'string') {
      updates.sonosSubheadingSource = 'artist_player';
      modified = true;
    }

    if (Object.keys(updates).length === 0) return pill;
    return { ...pill, ...updates };
  });

  if (modified) writeJSON('tunet_status_pills_config', next);
  return next;
}

/** @type {import('react').Context<PageContextValue | null>} */
const PageContext = createContext(null);

/** @returns {PageContextValue} */
export const usePages = () => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePages must be used within PageProvider');
  }
  return context;
};

/** @param {PageProviderProps} props */
export const PageProvider = ({ children }) => {
  const [pagesConfig, setPagesConfig] = useState(loadPagesConfig);
  const [cardSettings, setCardSettings] = useState({});
  const [customNames, setCustomNames] = useState({});
  const [customIcons, setCustomIcons] = useState({});
  const [hiddenCards, setHiddenCards] = useState([]);
  const [pageSettings, setPageSettings] = useState({});
  const [gridColumns, setGridColumns] = useState(4);
  const [dynamicGridColumns, setDynamicGridColumns] = useState(true);
  const [gridGapH, setGridGapH] = useState(20);
  const [gridGapV, setGridGapV] = useState(20);
  const [cardBorderRadius, setCardBorderRadius] = useState(16);
  const [headerScale, setHeaderScale] = useState(1);
  const [sectionSpacing, setSectionSpacing] = useState(DEFAULT_SECTION_SPACING);
  const [headerTitle, setHeaderTitle] = useState(() => 
    localStorage.getItem('tunet_header_title') || ''
  );

  // Load remaining configuration from localStorage
  useEffect(() => {
    const hidden = readJSON('tunet_hidden_cards', null);
    if (hidden) {
      setHiddenCards(hidden);
    }

    const names = readJSON('tunet_custom_names', null);
    if (names) setCustomNames(names);

    const icons = readJSON('tunet_custom_icons', null);
    if (icons) setCustomIcons(icons);

    const savedCols = readNumber('tunet_grid_columns', null);
    if (savedCols !== null) setGridColumns(normalizeGridColumns(savedCols));

    const savedDynamicCols = readBoolean('tunet_grid_columns_dynamic', true);
    setDynamicGridColumns(savedDynamicCols);

    const savedGap = readNumber('tunet_grid_gap', null);
    const savedGapH = readNumber('tunet_grid_gap_h', null);
    const savedGapV = readNumber('tunet_grid_gap_v', null);

    if (savedGapH !== null) setGridGapH(savedGapH);
    else if (savedGap !== null) setGridGapH(savedGap);

    if (savedGapV !== null) setGridGapV(savedGapV);
    else if (savedGap !== null) setGridGapV(savedGap);

    const savedRadius = readNumber('tunet_card_border_radius', null);
    if (savedRadius !== null) setCardBorderRadius(savedRadius);

    const savedScale = readNumber('tunet_header_scale', null);
    if (savedScale !== null) setHeaderScale(savedScale);

    const spacingSaved = readJSON('tunet_section_spacing', null);
    if (spacingSaved) {
      const nextSpacing = {
        headerToStatus: Number.isFinite(spacingSaved.headerToStatus) ? spacingSaved.headerToStatus : DEFAULT_SECTION_SPACING.headerToStatus,
        statusToNav: Number.isFinite(spacingSaved.statusToNav) ? spacingSaved.statusToNav : DEFAULT_SECTION_SPACING.statusToNav,
        navToGrid: Number.isFinite(spacingSaved.navToGrid) ? spacingSaved.navToGrid : DEFAULT_SECTION_SPACING.navToGrid,
      };
      setSectionSpacing(nextSpacing);
    }

    const pageSettingsSaved = readJSON('tunet_page_settings', null);
    if (pageSettingsSaved) {
      let modified = false;
      const nextSettings = { ...pageSettingsSaved };
      Object.keys(nextSettings).forEach((pageId) => {
        if (nextSettings[pageId]?.type === 'sonos') {
          nextSettings[pageId] = { ...nextSettings[pageId], type: 'media' };
          modified = true;
        }
      });
      setPageSettings(nextSettings);
      if (modified) writeJSON('tunet_page_settings', nextSettings);
    }

    const cardSettingsSaved = readJSON('tunet_card_settings', null);
    if (cardSettingsSaved) {
      const { migratedSettings, changed } = migrateCardSettings(cardSettingsSaved);
      setCardSettings(migratedSettings);
      if (changed) writeJSON('tunet_card_settings', migratedSettings);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--card-border-radius', `${cardBorderRadius}px`);
  }, [cardBorderRadius]);

  useEffect(() => {
    writeJSON('tunet_pages_config', pagesConfig);
  }, [pagesConfig]);

  const saveCustomName = (id, name) => {
    const newNames = { ...customNames, [id]: name };
    setCustomNames(newNames);
    writeJSON('tunet_custom_names', newNames);
  };

  const saveCustomIcon = (id, iconName) => {
    const newIcons = { ...customIcons, [id]: iconName };
    setCustomIcons(newIcons);
    writeJSON('tunet_custom_icons', newIcons);
  };

  const saveCardSetting = (id, setting, value) => {
    setCardSettings((prev) => {
      const newSettings = {
        ...prev,
        [id]: { ...(prev[id] || {}), [setting]: value }
      };
      writeJSON('tunet_card_settings', newSettings);
      return newSettings;
    });
  };

  const savePageSetting = (id, setting, value) => {
    setPageSettings(prev => {
      const newSettings = { 
        ...prev, 
        [id]: { ...(prev[id] || {}), [setting]: value } 
      };
      writeJSON('tunet_page_settings', newSettings);
      return newSettings;
    });
  };

  const persistPageSettings = (newSettings) => {
    setPageSettings(newSettings);
    writeJSON('tunet_page_settings', newSettings);
  };

  const persistCustomNames = (newNames) => {
    setCustomNames(newNames);
    writeJSON('tunet_custom_names', newNames);
  };

  const persistCustomIcons = (newIcons) => {
    setCustomIcons(newIcons);
    writeJSON('tunet_custom_icons', newIcons);
  };

  const persistHiddenCards = (newHidden) => {
    setHiddenCards(newHidden);
    writeJSON('tunet_hidden_cards', newHidden);
  };

  const toggleCardVisibility = (cardId) => {
    const newHidden = hiddenCards.includes(cardId) 
      ? hiddenCards.filter(id => id !== cardId)
      : [...hiddenCards, cardId];
    setHiddenCards(newHidden);
    writeJSON('tunet_hidden_cards', newHidden);
  };

  const updateHeaderScale = (newScale) => {
    setHeaderScale(newScale);
    try {
      localStorage.setItem('tunet_header_scale', String(newScale));
    } catch (error) {
      console.error('Failed to save header scale:', error);
    }
  };

  const updateHeaderTitle = (newTitle) => {
    setHeaderTitle(newTitle);
    try {
      localStorage.setItem('tunet_header_title', newTitle);
    } catch (error) {
      console.error('Failed to save header title:', error);
    }
  };

  const updateSectionSpacing = (partial) => {
    const nextSpacing = { ...sectionSpacing, ...partial };
    setSectionSpacing(nextSpacing);
    writeJSON('tunet_section_spacing', nextSpacing);
  };

  const [headerSettings, setHeaderSettings] = useState(() => {
    const saved = readJSON('tunet_header_settings');
    return saved || { showTitle: true, showClock: true, showClockOnMobile: true, showDate: true };
  });

  const updateHeaderSettings = (newSettings) => {
    setHeaderSettings(newSettings);
    writeJSON('tunet_header_settings', newSettings);
  };

  const [statusPillsConfig, setStatusPillsConfig] = useState(loadStatusPillsConfig);

  const saveStatusPillsConfig = (newConfig) => {
    setStatusPillsConfig(newConfig);
    writeJSON('tunet_status_pills_config', newConfig);
  };

  const persistConfig = (newConfig) => {
    setPagesConfig(newConfig);
    writeJSON('tunet_pages_config', newConfig);
  };

  /** @type {PageContextValue} */
  const value = {
    pagesConfig,
    setPagesConfig,
    persistConfig,
    cardSettings,
    setCardSettings,
    saveCardSetting,
    customNames,
    saveCustomName,
    customIcons,
    saveCustomIcon,
    hiddenCards,
    toggleCardVisibility,
    pageSettings,
    setPageSettings,
    persistPageSettings,
    persistCustomNames,
    persistCustomIcons,
    persistHiddenCards,
    savePageSetting,
    gridColumns,
    setGridColumns: (val) => {
      const next = normalizeGridColumns(val);
      setGridColumns(next);
      try {
        localStorage.setItem('tunet_grid_columns', String(next));
      } catch (error) {
        console.error('Failed to save grid columns:', error);
      }
    },
    dynamicGridColumns,
    setDynamicGridColumns: (val) => {
      const next = Boolean(val);
      setDynamicGridColumns(next);
      try {
        localStorage.setItem('tunet_grid_columns_dynamic', next ? '1' : '0');
      } catch (error) {
        console.error('Failed to save dynamic grid columns setting:', error);
      }
    },
    headerScale,
    updateHeaderScale,
    headerTitle,
    updateHeaderTitle,
    headerSettings,
    updateHeaderSettings,
    sectionSpacing,
    updateSectionSpacing,
    persistCardSettings: (newSettings) => {
      setCardSettings(newSettings);
      writeJSON('tunet_card_settings', newSettings);
    },
    gridGapH,
    setGridGapH: (val) => {
      setGridGapH(val);
      try {
        localStorage.setItem('tunet_grid_gap_h', String(val));
      } catch (error) {
        console.error('Failed to save grid gap h:', error);
      }
    },
    gridGapV,
    setGridGapV: (val) => {
      setGridGapV(val);
      try {
        localStorage.setItem('tunet_grid_gap_v', String(val));
      } catch (error) {
        console.error('Failed to save grid gap v:', error);
      }
    },
    statusPillsConfig,
    saveStatusPillsConfig,
    cardBorderRadius,
    setCardBorderRadius: (val) => {
      setCardBorderRadius(val);
      try {
        localStorage.setItem('tunet_card_border_radius', String(val));
      } catch (error) {
        console.error('Failed to save card border radius:', error);
      }
    },
  };

  return (
    <PageContext.Provider value={value}>
      {children}
    </PageContext.Provider>
  );
};
