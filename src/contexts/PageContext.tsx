import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PAGES_CONFIG } from '../config/defaults';
import { MAX_GRID_COLUMNS, MIN_GRID_COLUMNS } from '../hooks/useResponsiveGrid';
import {
  DEFAULT_STATUS_GROUP_PRESET,
  STATUS_GROUP_PILL_TYPE,
  STATUS_GROUP_SELECTION_ALL,
} from '../utils/statusGroupPills';
import { normalizeDecimalPlaces } from '../utils/units';
import { getCardSettingsKey } from '../utils/cardSettingsKey';
import type {
  CardSettingsMap,
  HeaderSettings,
  PageContextValue,
  PageProviderProps,
  PageSettingsMap,
  PagesConfig,
  SectionSpacing,
  StatusPillConfig,
} from '../types/dashboard';

const readJSON = (key: string, fallback?: unknown): unknown => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to parse ${key}:`, error);
    return fallback;
  }
};

const writeJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
};

const readNumber = (key: string, fallback: number | null): number | null => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const readBoolean = (key: string, fallback: boolean): boolean => {
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

const DEFAULT_SECTION_SPACING: SectionSpacing = {
  headerToStatus: 16,
  statusToNav: 24,
  navToGrid: 24,
};

const CARDS_ONLY_MODE_KEY = 'tunet_cards_only_mode';

const normalizeGridColumns = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 4;
  return Math.max(MIN_GRID_COLUMNS, Math.min(Math.round(parsed), MAX_GRID_COLUMNS));
};

const coercePillBoolean = (value: unknown, fallback: boolean): boolean => {
  if (value === true || value === false) return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return fallback;
};

const coerceConditionEnabled = (value: unknown): boolean | undefined => {
  if (value === true || value === false) return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return undefined;
};

function normalizeStatusPillConfig(pill: StatusPillConfig): StatusPillConfig {
  if (!pill || typeof pill !== 'object') return pill;

  return {
    ...pill,
    visible: coercePillBoolean(pill.visible, true),
    clickable: coercePillBoolean(pill.clickable, false),
    animated: coercePillBoolean(pill.animated, true),
    showLabel: coercePillBoolean(pill.showLabel, true),
    showSublabel: coercePillBoolean(pill.showSublabel, true),
    showCover: coercePillBoolean(pill.showCover, true),
    showCount: coercePillBoolean(pill.showCount, false),
    decimals: normalizeDecimalPlaces(pill.decimals),
    hideWhenEmpty:
      pill.type === STATUS_GROUP_PILL_TYPE
        ? coercePillBoolean(pill.hideWhenEmpty, true)
        : pill.hideWhenEmpty,
    groupPreset:
      pill.type === STATUS_GROUP_PILL_TYPE && typeof pill.groupPreset !== 'string'
        ? DEFAULT_STATUS_GROUP_PRESET
        : pill.groupPreset,
    groupSelectionMode:
      pill.type === STATUS_GROUP_PILL_TYPE && typeof pill.groupSelectionMode !== 'string'
        ? STATUS_GROUP_SELECTION_ALL
        : pill.groupSelectionMode,
    groupEntityIds:
      pill.type === STATUS_GROUP_PILL_TYPE && !Array.isArray(pill.groupEntityIds)
        ? []
        : pill.groupEntityIds,
    conditionEnabled: coerceConditionEnabled(pill.conditionEnabled),
  };
}

const ROOM_CARD_DEFAULTS = {
  showLightChip: true,
  showMediaChip: true,
  showActiveChip: true,
  showVacuumChip: true,
  showOccupiedIndicator: false,
  showIconWatermark: true,
  showPopupClimate: true,
  showPopupLights: true,
  showPopupTempOverview: true,
  showPopupMedia: true,
  showPopupVacuum: true,
  navigateOnTap: false,
};

function migrateCardSettings(rawSettings: unknown): {
  migratedSettings: CardSettingsMap;
  changed: boolean;
} {
  if (!rawSettings || typeof rawSettings !== 'object')
    return { migratedSettings: {}, changed: false };

  let changed = false;
  const migratedSettings: CardSettingsMap = { ...rawSettings };

  Object.entries(migratedSettings).forEach(([settingsKey, settings]) => {
    if (!settings || typeof settings !== 'object') return;

    const isRoomSettings =
      settingsKey.includes('room_card_') ||
      String(settings.type || '').toLowerCase() === 'room' ||
      typeof settings.areaId === 'string';

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

function loadCardSettings(): CardSettingsMap {
  const saved = readJSON('tunet_card_settings', null);
  if (!saved) return {};

  const { migratedSettings, changed } = migrateCardSettings(saved);
  if (changed) writeJSON('tunet_card_settings', migratedSettings);
  return migratedSettings;
}

/** Synchronously load & migrate pagesConfig from localStorage. */
function loadPagesConfig(): PagesConfig {
  // Stored JSON is unverified; the guards below repair missing pages/header fields.
  const parsed = readJSON('tunet_pages_config', null) as PagesConfig | null;
  if (!parsed) return DEFAULT_PAGES_CONFIG;

  let modified = false;

  // Remove legacy automations page config entirely
  if (parsed.automations) {
    delete parsed.automations;
    modified = true;
  }

  // Ensure pages array exists
  if (!Array.isArray(parsed.pages)) {
    const detectedPages = Object.keys(parsed).filter(
      (key) => Array.isArray(parsed[key]) && !['header', 'settings', 'automations'].includes(key)
    );
    parsed.pages = detectedPages.length > 0 ? detectedPages : ['home'];
    modified = true;
  }

  // Filter out settings and legacy automations from pages
  parsed.pages = parsed.pages.filter((id) => id !== 'settings' && id !== 'automations');
  if (parsed.pages.length === 0) {
    parsed.pages = ['home'];
    modified = true;
  }

  // Ensure all pages have arrays
  parsed.pages.forEach((pageId) => {
    if (!Array.isArray(parsed[pageId])) {
      parsed[pageId] = [];
      modified = true;
    }
  });

  // Ensure header exists
  if (!parsed.header) {
    parsed.header = [];
    modified = true;
  }

  if (modified) writeJSON('tunet_pages_config', parsed);
  return parsed;
}

/** Synchronously load & migrate status pills config from localStorage. */
function loadStatusPillsConfig(): StatusPillConfig[] {
  const parsed = readJSON('tunet_status_pills_config', []);
  if (!Array.isArray(parsed)) return [];

  let modified = false;
  // Stored entries are assumed to be pill objects; anything else passes through unchanged.
  const next = parsed.map((pill: StatusPillConfig) => {
    const normalizedPill = normalizeStatusPillConfig(pill);
    if (normalizedPill !== pill) {
      modified = true;
    }

    if (!normalizedPill || typeof normalizedPill !== 'object' || normalizedPill.type !== 'sonos') {
      return normalizedPill;
    }

    const updates: Partial<StatusPillConfig> = {};
    if (typeof normalizedPill.clickable !== 'boolean') {
      updates.clickable = true;
      modified = true;
    }
    if (typeof normalizedPill.showCount !== 'boolean') {
      updates.showCount = true;
      modified = true;
    }
    if (typeof normalizedPill.sonosHeadingSource !== 'string') {
      updates.sonosHeadingSource = 'song';
      modified = true;
    }
    if (typeof normalizedPill.sonosSubheadingSource !== 'string') {
      updates.sonosSubheadingSource = 'artist_player';
      modified = true;
    }

    if (Object.keys(updates).length === 0) return normalizedPill;
    return { ...normalizedPill, ...updates };
  });

  if (modified) writeJSON('tunet_status_pills_config', next);
  return next;
}

const PageContext = createContext<PageContextValue | null>(null);

export const usePages = (): PageContextValue => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePages must be used within PageProvider');
  }
  return context;
};

export const PageProvider = ({ children }: PageProviderProps) => {
  const [pagesConfig, setPagesConfig] = useState<PagesConfig>(loadPagesConfig);
  const [cardSettings, setCardSettings] = useState<CardSettingsMap>(loadCardSettings);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);
  const [pageSettings, setPageSettings] = useState<PageSettingsMap>({});
  const [gridColumns, setGridColumns] = useState(4);
  const [dynamicGridColumns, setDynamicGridColumns] = useState(true);
  const [gridGapH, setGridGapH] = useState(20);
  const [gridGapV, setGridGapV] = useState(20);
  const [cardBorderRadius, setCardBorderRadius] = useState(16);
  const [headerScale, setHeaderScale] = useState(1);
  const [sectionSpacing, setSectionSpacing] = useState<SectionSpacing>(DEFAULT_SECTION_SPACING);
  const [cardsOnlyMode, setCardsOnlyMode] = useState(() => readBoolean(CARDS_ONLY_MODE_KEY, false));
  const [headerTitle, setHeaderTitle] = useState(
    () => localStorage.getItem('tunet_header_title') || ''
  );

  // Load remaining configuration from localStorage
  // (stored JSON shapes are trusted as before; only truthiness is checked)
  useEffect(() => {
    const hidden = readJSON('tunet_hidden_cards', null) as string[] | null;
    if (hidden) {
      setHiddenCards(hidden);
    }

    const names = readJSON('tunet_custom_names', null) as Record<string, string> | null;
    if (names) setCustomNames(names);

    const icons = readJSON('tunet_custom_icons', null) as Record<string, string> | null;
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

    // Each field is validated with Number.isFinite below.
    const spacingSaved = readJSON('tunet_section_spacing', null) as SectionSpacing | null;
    if (spacingSaved) {
      const nextSpacing = {
        headerToStatus: Number.isFinite(spacingSaved.headerToStatus)
          ? spacingSaved.headerToStatus
          : DEFAULT_SECTION_SPACING.headerToStatus,
        statusToNav: Number.isFinite(spacingSaved.statusToNav)
          ? spacingSaved.statusToNav
          : DEFAULT_SECTION_SPACING.statusToNav,
        navToGrid: Number.isFinite(spacingSaved.navToGrid)
          ? spacingSaved.navToGrid
          : DEFAULT_SECTION_SPACING.navToGrid,
      };
      setSectionSpacing(nextSpacing);
    }

    const pageSettingsSaved = readJSON('tunet_page_settings', null) as PageSettingsMap | null;
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
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--card-border-radius', `${cardBorderRadius}px`);
  }, [cardBorderRadius]);

  useEffect(() => {
    writeJSON('tunet_pages_config', pagesConfig);
  }, [pagesConfig]);

  useEffect(() => {
    writeJSON('tunet_card_settings', cardSettings);
  }, [cardSettings]);

  const saveCustomName = useCallback((id: string, name: string) => {
    setCustomNames((prev) => {
      const newNames = { ...prev, [id]: name };
      writeJSON('tunet_custom_names', newNames);
      return newNames;
    });
  }, []);

  const saveCustomIcon = useCallback((id: string, iconName: string) => {
    setCustomIcons((prev) => {
      const newIcons = { ...prev, [id]: iconName };
      writeJSON('tunet_custom_icons', newIcons);
      return newIcons;
    });
  }, []);

  const saveCardSetting = useCallback((id: string, setting: string, value: unknown) => {
    setCardSettings((prev) => {
      return {
        ...prev,
        [id]: { ...(prev[id] || {}), [setting]: value },
      };
    });
  }, []);

  const savePageSetting = useCallback((id: string, setting: string, value: unknown) => {
    setPageSettings((prev) => {
      const newSettings = {
        ...prev,
        [id]: { ...(prev[id] || {}), [setting]: value },
      };
      writeJSON('tunet_page_settings', newSettings);
      return newSettings;
    });
  }, []);

  const persistPageSettings = useCallback((newSettings: PageSettingsMap) => {
    setPageSettings(newSettings);
    writeJSON('tunet_page_settings', newSettings);
  }, []);

  const persistCustomNames = useCallback((newNames: Record<string, string>) => {
    setCustomNames(newNames);
    writeJSON('tunet_custom_names', newNames);
  }, []);

  const persistCustomIcons = useCallback((newIcons: Record<string, string>) => {
    setCustomIcons(newIcons);
    writeJSON('tunet_custom_icons', newIcons);
  }, []);

  const persistHiddenCards = useCallback((newHidden: string[]) => {
    setHiddenCards(newHidden);
    writeJSON('tunet_hidden_cards', newHidden);
  }, []);

  const toggleCardVisibility = useCallback((cardId: string) => {
    setHiddenCards((prev) => {
      const newHidden = prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId];
      writeJSON('tunet_hidden_cards', newHidden);
      return newHidden;
    });
  }, []);

  const updateHeaderScale = useCallback((newScale: number) => {
    setHeaderScale(newScale);
    try {
      localStorage.setItem('tunet_header_scale', String(newScale));
    } catch (error) {
      console.error('Failed to save header scale:', error);
    }
  }, []);

  const updateHeaderTitle = useCallback((newTitle: string) => {
    setHeaderTitle(newTitle);
    try {
      localStorage.setItem('tunet_header_title', newTitle);
    } catch (error) {
      console.error('Failed to save header title:', error);
    }
  }, []);

  const updateSectionSpacing = useCallback((partial: Partial<SectionSpacing>) => {
    setSectionSpacing((prev) => {
      const nextSpacing = { ...prev, ...partial };
      writeJSON('tunet_section_spacing', nextSpacing);
      return nextSpacing;
    });
  }, []);

  const updateCardsOnlyMode = useCallback((nextValue: boolean) => {
    const enabled = Boolean(nextValue);
    setCardsOnlyMode(enabled);
    try {
      localStorage.setItem(CARDS_ONLY_MODE_KEY, enabled ? '1' : '0');
    } catch (error) {
      console.error('Failed to save cards-only mode:', error);
    }
  }, []);

  const [headerSettings, setHeaderSettings] = useState<HeaderSettings>(() => {
    // Stored header settings are trusted as before; only truthiness is checked.
    const saved = readJSON('tunet_header_settings') as HeaderSettings | undefined;
    return (
      saved || {
        showTitle: true,
        showClock: true,
        showClockOnMobile: true,
        showDate: true,
        headerStyle: 'classic',
        mobileAlignment: 'center',
        batteryVariant: 'glass',
        showBatteryNub: true,
      }
    );
  });

  const updateHeaderSettings = useCallback((newSettings: HeaderSettings) => {
    setHeaderSettings(newSettings);
    writeJSON('tunet_header_settings', newSettings);
  }, []);

  const [statusPillsConfig, setStatusPillsConfig] =
    useState<StatusPillConfig[]>(loadStatusPillsConfig);

  const saveStatusPillsConfig = useCallback((newConfig: StatusPillConfig[]) => {
    const normalized = Array.isArray(newConfig)
      ? newConfig.map((pill) => normalizeStatusPillConfig(pill))
      : [];
    setStatusPillsConfig(normalized);
    writeJSON('tunet_status_pills_config', normalized);
  }, []);

  const persistConfig = useCallback((newConfig: PagesConfig) => {
    setPagesConfig(newConfig);
    writeJSON('tunet_pages_config', newConfig);
  }, []);

  const persistCardSettings = useCallback((newSettings: CardSettingsMap) => {
    setCardSettings(newSettings);
    writeJSON('tunet_card_settings', newSettings);
  }, []);

  /**
   * Duplicate a card: the copy gets its own card id and its own settings
   * entry, but keeps the configuration (entity, size, options) of the
   * original.
   */
  const duplicateCard = useCallback(
    (cardId: string, pageId = 'home'): string | null => {
      if (!cardId) return null;

      const unique =
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const newCardId = `${cardId === 'car' ? 'car_card' : cardId}__dup_${unique}`;

      const newConfig = { ...pagesConfig };
      const listName = pageId === 'header' ? 'header' : pageId;
      const list = Array.isArray(newConfig[listName]) ? [...newConfig[listName]] : [];
      const index = list.indexOf(cardId);
      list.splice(index === -1 ? list.length : index + 1, 0, newCardId);
      newConfig[listName] = list;
      persistConfig(newConfig);

      const sourceKey = getCardSettingsKey(cardId, pageId);
      const targetKey = getCardSettingsKey(newCardId, pageId);
      const sourceSettings = cardSettings[sourceKey] || cardSettings[cardId] || {};
      const copiedSettings: Record<string, unknown> = JSON.parse(JSON.stringify(sourceSettings));
      // Cards that are identified by their entity id need the entity stored in
      // the settings so the copy keeps pointing at the same entity.
      if (!copiedSettings.entityId && /^[a-z_]+\.[a-z0-9_]+$/i.test(cardId)) {
        copiedSettings.entityId = cardId;
      }
      persistCardSettings({ ...cardSettings, [targetKey]: copiedSettings });

      if (customNames[cardId]) {
        persistCustomNames({ ...customNames, [newCardId]: customNames[cardId] });
      }
      if (customIcons[cardId]) {
        persistCustomIcons({ ...customIcons, [newCardId]: customIcons[cardId] });
      }

      return newCardId;
    },
    [
      cardSettings,
      customIcons,
      customNames,
      pagesConfig,
      persistCardSettings,
      persistConfig,
      persistCustomIcons,
      persistCustomNames,
    ]
  );

  const setGridColumnsPersisted = useCallback((val: number) => {
    const next = normalizeGridColumns(val);
    setGridColumns(next);
    try {
      localStorage.setItem('tunet_grid_columns', String(next));
    } catch (error) {
      console.error('Failed to save grid columns:', error);
    }
  }, []);

  const setDynamicGridColumnsPersisted = useCallback((val: boolean) => {
    const next = Boolean(val);
    setDynamicGridColumns(next);
    try {
      localStorage.setItem('tunet_grid_columns_dynamic', next ? '1' : '0');
    } catch (error) {
      console.error('Failed to save dynamic grid columns setting:', error);
    }
  }, []);

  const setGridGapHPersisted = useCallback((val: number) => {
    setGridGapH(val);
    try {
      localStorage.setItem('tunet_grid_gap_h', String(val));
    } catch (error) {
      console.error('Failed to save grid gap h:', error);
    }
  }, []);

  const setGridGapVPersisted = useCallback((val: number) => {
    setGridGapV(val);
    try {
      localStorage.setItem('tunet_grid_gap_v', String(val));
    } catch (error) {
      console.error('Failed to save grid gap v:', error);
    }
  }, []);

  const setCardBorderRadiusPersisted = useCallback((val: number) => {
    setCardBorderRadius(val);
    try {
      localStorage.setItem('tunet_card_border_radius', String(val));
    } catch (error) {
      console.error('Failed to save card border radius:', error);
    }
  }, []);

  const value = useMemo<PageContextValue>(
    () => ({
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
      duplicateCard,
      pageSettings,
      setPageSettings,
      persistPageSettings,
      persistCustomNames,
      persistCustomIcons,
      persistHiddenCards,
      savePageSetting,
      gridColumns,
      setGridColumns: setGridColumnsPersisted,
      dynamicGridColumns,
      setDynamicGridColumns: setDynamicGridColumnsPersisted,
      headerScale,
      updateHeaderScale,
      headerTitle,
      updateHeaderTitle,
      headerSettings,
      updateHeaderSettings,
      sectionSpacing,
      updateSectionSpacing,
      cardsOnlyMode,
      updateCardsOnlyMode,
      persistCardSettings,
      gridGapH,
      setGridGapH: setGridGapHPersisted,
      gridGapV,
      setGridGapV: setGridGapVPersisted,
      statusPillsConfig,
      saveStatusPillsConfig,
      cardBorderRadius,
      setCardBorderRadius: setCardBorderRadiusPersisted,
    }),
    [
      pagesConfig,
      persistConfig,
      cardSettings,
      saveCardSetting,
      customNames,
      saveCustomName,
      customIcons,
      saveCustomIcon,
      hiddenCards,
      toggleCardVisibility,
      duplicateCard,
      pageSettings,
      persistPageSettings,
      persistCustomNames,
      persistCustomIcons,
      persistHiddenCards,
      savePageSetting,
      gridColumns,
      setGridColumnsPersisted,
      dynamicGridColumns,
      setDynamicGridColumnsPersisted,
      headerScale,
      updateHeaderScale,
      headerTitle,
      updateHeaderTitle,
      headerSettings,
      updateHeaderSettings,
      sectionSpacing,
      updateSectionSpacing,
      cardsOnlyMode,
      updateCardsOnlyMode,
      persistCardSettings,
      gridGapH,
      setGridGapHPersisted,
      gridGapV,
      setGridGapVPersisted,
      statusPillsConfig,
      saveStatusPillsConfig,
      cardBorderRadius,
      setCardBorderRadiusPersisted,
    ]
  );

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
};
