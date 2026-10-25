/**
 * Config snapshot — collect/apply dashboard configuration.
 *
 * A snapshot captures layout, card settings, and appearance — everything
 * a user would want to back up or transfer.  Credentials (HA URL, token,
 * OAuth tokens) are intentionally excluded for security.
 */

import { DEFAULT_LANGUAGE, normalizeLanguage } from '../i18n';

const SNAPSHOT_VERSION = 1;

export interface PagesConfig {
  header?: string[];
  pages?: string[];
  [key: string]: unknown;
}

export interface HeaderSettings {
  showTitle?: boolean;
  showClock?: boolean;
  showDate?: boolean;
  [key: string]: unknown;
}

export interface SectionSpacing {
  headerToStatus?: number;
  statusToNav?: number;
  navToGrid?: number;
}

export interface SnapshotLayout {
  pagesConfig: PagesConfig | null;
  cardSettings: Record<string, unknown> | null;
  hiddenCards: string[] | null;
  customNames: Record<string, string> | null;
  customIcons: Record<string, string> | null;
  pageSettings: Record<string, unknown> | null;
  gridColumns: number;
  dynamicGridColumns: boolean;
  gridGapH: number;
  gridGapV: number;
  cardBorderRadius: number;
  cardsOnlyMode: boolean;
  headerSettings: HeaderSettings | null;
  headerTitle: string;
  headerScale: number;
  sectionSpacing: SectionSpacing | null;
  statusPillsConfig: unknown[] | null;
  musicAssistantUrl?: string;
}

export interface SnapshotAppearance {
  theme: string;
  language: string;
  appFont: string;
  unitsMode: string;
  bgMode: string;
  bgColor: string;
  bgGradient: string;
  bgImage: string;
  cardBgColor: string;
  cardTransparency: number;
  cardBorderOpacity: number;
  inactivityTimeout: number;
}

export interface DashboardSnapshot {
  version: number;
  layout: SnapshotLayout;
  appearance: SnapshotAppearance;
}

type SnapshotInput = {
  layout?: Partial<SnapshotLayout>;
  appearance?: Partial<SnapshotAppearance>;
};

type Setter<T> = (value: T) => unknown;

export interface SnapshotContextSetters {
  persistConfig?: Setter<PagesConfig>;
  persistCardSettings?: Setter<Record<string, unknown>>;
  persistPageSettings?: Setter<Record<string, unknown>>;
  persistCustomNames?: Setter<Record<string, string>>;
  persistCustomIcons?: Setter<Record<string, string>>;
  persistHiddenCards?: Setter<string[]>;
  setGridColumns?: Setter<number>;
  setDynamicGridColumns?: Setter<boolean>;
  setGridGapH?: Setter<number>;
  setGridGapV?: Setter<number>;
  setCardBorderRadius?: Setter<number>;
  updateCardsOnlyMode?: Setter<boolean>;
  updateHeaderScale?: Setter<number>;
  updateHeaderTitle?: Setter<string>;
  updateHeaderSettings?: Setter<HeaderSettings>;
  updateSectionSpacing?: Setter<SectionSpacing>;
  saveStatusPillsConfig?: Setter<unknown[]>;
  setCurrentTheme?: Setter<string>;
  setLanguage?: Setter<string>;
  setAppFont?: Setter<string>;
  setUnitsMode?: Setter<string>;
  setBgMode?: Setter<string>;
  setBgColor?: Setter<string>;
  setBgGradient?: Setter<string>;
  setBgImage?: Setter<string>;
  setCardBgColor?: Setter<string>;
  setCardTransparency?: Setter<number>;
  setCardBorderOpacity?: Setter<number>;
  setInactivityTimeout?: Setter<number>;
}

// ── helpers ──────────────────────────────────────────────────────────

const readJSON = <T>(key: string, fallback: T | null = null): T | null => {
  try {
    const raw = localStorage.getItem(key);
    // Stored JSON is trusted to have the same shape as the fallback.
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const readNumber = (key: string, fallback: number): number => {
  const raw = localStorage.getItem(key);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const readBoolean = (key: string, fallback: boolean): boolean => {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return fallback;
};

const normalizeSnapshotLanguage = (language: string): string => normalizeLanguage(language);

// ── collect ──────────────────────────────────────────────────────────

/**
 * Read all relevant localStorage keys and return a versioned snapshot object.
 */
export function collectSnapshot(): DashboardSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    layout: {
      pagesConfig: readJSON<PagesConfig>('tunet_pages_config', {
        header: [],
        pages: ['home'],
        home: [],
      }),
      cardSettings: readJSON<Record<string, unknown>>('tunet_card_settings', {}),
      hiddenCards: readJSON<string[]>('tunet_hidden_cards', []),
      customNames: readJSON<Record<string, string>>('tunet_custom_names', {}),
      customIcons: readJSON<Record<string, string>>('tunet_custom_icons', {}),
      pageSettings: readJSON<Record<string, unknown>>('tunet_page_settings', {}),
      gridColumns: readNumber('tunet_grid_columns', 4),
      dynamicGridColumns: readBoolean('tunet_grid_columns_dynamic', true),
      gridGapH: readNumber('tunet_grid_gap_h', 20),
      gridGapV: readNumber('tunet_grid_gap_v', 20),
      cardBorderRadius: readNumber('tunet_card_border_radius', 16),
      cardsOnlyMode: readBoolean('tunet_cards_only_mode', false),
      headerSettings: readJSON<HeaderSettings>('tunet_header_settings', {
        showTitle: true,
        showClock: true,
        showDate: true,
      }),
      headerTitle: localStorage.getItem('tunet_header_title') || '',
      headerScale: readNumber('tunet_header_scale', 1),
      sectionSpacing: readJSON<SectionSpacing>('tunet_section_spacing', {
        headerToStatus: 16,
        statusToNav: 24,
        navToGrid: 24,
      }),
      statusPillsConfig: readJSON<unknown[]>('tunet_status_pills_config', []),
      musicAssistantUrl: localStorage.getItem('tunet_music_assistant_url') || '',
    },
    appearance: {
      theme: localStorage.getItem('tunet_theme') || 'dark',
      language: normalizeSnapshotLanguage(
        localStorage.getItem('tunet_language') || DEFAULT_LANGUAGE
      ),
      appFont: localStorage.getItem('tunet_app_font') || 'sans',
      unitsMode: localStorage.getItem('tunet_units_mode') || 'follow_ha',
      bgMode: localStorage.getItem('tunet_bg_mode') || 'theme',
      bgColor: localStorage.getItem('tunet_bg_color') || '#0f172a',
      bgGradient: localStorage.getItem('tunet_bg_gradient') || 'midnight',
      bgImage: localStorage.getItem('tunet_bg_image') || '',
      cardBgColor: localStorage.getItem('tunet_card_bg_color') || '',
      cardTransparency: readNumber('tunet_card_transparency', 40),
      cardBorderOpacity: readNumber('tunet_card_border_opacity', 5),
      inactivityTimeout: readNumber('tunet_inactivity_timeout', 60),
    },
  };
}

// ── apply ────────────────────────────────────────────────────────────

/**
 * Write a snapshot into localStorage AND update React context state via
 * the provided setter object.
 *
 * @param snapshot Versioned snapshot (from collectSnapshot or API)
 * @param [contextSetters] Object with setter functions from PageContext + ConfigContext
 */
export function applySnapshot(
  snapshot: unknown,
  contextSetters: SnapshotContextSetters = {}
): void {
  if (!snapshot || typeof snapshot !== 'object') return;

  // Untrusted input (API or file import): only the object check above is enforced at runtime.
  const { layout = {}, appearance = {} } = snapshot as SnapshotInput;

  // ── Layout → localStorage ──
  if (layout.pagesConfig)
    localStorage.setItem('tunet_pages_config', JSON.stringify(layout.pagesConfig));
  if (layout.cardSettings)
    localStorage.setItem('tunet_card_settings', JSON.stringify(layout.cardSettings));
  if (layout.hiddenCards)
    localStorage.setItem('tunet_hidden_cards', JSON.stringify(layout.hiddenCards));
  if (layout.customNames)
    localStorage.setItem('tunet_custom_names', JSON.stringify(layout.customNames));
  if (layout.customIcons)
    localStorage.setItem('tunet_custom_icons', JSON.stringify(layout.customIcons));
  if (layout.pageSettings)
    localStorage.setItem('tunet_page_settings', JSON.stringify(layout.pageSettings));
  if (layout.statusPillsConfig)
    localStorage.setItem('tunet_status_pills_config', JSON.stringify(layout.statusPillsConfig));
  if (layout.headerSettings)
    localStorage.setItem('tunet_header_settings', JSON.stringify(layout.headerSettings));
  if (layout.sectionSpacing)
    localStorage.setItem('tunet_section_spacing', JSON.stringify(layout.sectionSpacing));

  if (layout.gridColumns !== undefined)
    localStorage.setItem('tunet_grid_columns', String(layout.gridColumns));
  if (layout.dynamicGridColumns !== undefined)
    localStorage.setItem('tunet_grid_columns_dynamic', layout.dynamicGridColumns ? '1' : '0');
  if (layout.gridGapH !== undefined)
    localStorage.setItem('tunet_grid_gap_h', String(layout.gridGapH));
  if (layout.gridGapV !== undefined)
    localStorage.setItem('tunet_grid_gap_v', String(layout.gridGapV));
  if (layout.cardBorderRadius !== undefined)
    localStorage.setItem('tunet_card_border_radius', String(layout.cardBorderRadius));
  if (layout.cardsOnlyMode !== undefined)
    localStorage.setItem('tunet_cards_only_mode', layout.cardsOnlyMode ? '1' : '0');
  if (layout.headerScale !== undefined)
    localStorage.setItem('tunet_header_scale', String(layout.headerScale));
  if (layout.headerTitle !== undefined)
    localStorage.setItem('tunet_header_title', layout.headerTitle);
  if (layout.musicAssistantUrl)
    localStorage.setItem('tunet_music_assistant_url', layout.musicAssistantUrl);
  else if (layout.musicAssistantUrl !== undefined)
    localStorage.removeItem('tunet_music_assistant_url');

  // ── Appearance → localStorage ──
  if (appearance.theme) localStorage.setItem('tunet_theme', appearance.theme);
  if (appearance.language)
    localStorage.setItem('tunet_language', normalizeSnapshotLanguage(appearance.language));
  if (appearance.appFont) localStorage.setItem('tunet_app_font', appearance.appFont);
  if (appearance.unitsMode) localStorage.setItem('tunet_units_mode', appearance.unitsMode);
  if (appearance.bgMode) localStorage.setItem('tunet_bg_mode', appearance.bgMode);
  if (appearance.bgColor) localStorage.setItem('tunet_bg_color', appearance.bgColor);
  if (appearance.bgGradient) localStorage.setItem('tunet_bg_gradient', appearance.bgGradient);
  if (appearance.bgImage !== undefined) localStorage.setItem('tunet_bg_image', appearance.bgImage);
  if (appearance.cardBgColor !== undefined) {
    if (appearance.cardBgColor) {
      localStorage.setItem('tunet_card_bg_color', appearance.cardBgColor);
    } else {
      localStorage.removeItem('tunet_card_bg_color');
    }
  }
  if (appearance.cardTransparency !== undefined)
    localStorage.setItem('tunet_card_transparency', String(appearance.cardTransparency));
  if (appearance.cardBorderOpacity !== undefined)
    localStorage.setItem('tunet_card_border_opacity', String(appearance.cardBorderOpacity));
  if (appearance.inactivityTimeout !== undefined)
    localStorage.setItem('tunet_inactivity_timeout', String(appearance.inactivityTimeout));

  // ── Update React contexts (if setters provided) ──
  const s = contextSetters;

  // PageContext setters
  if (s.persistConfig && layout.pagesConfig) s.persistConfig(layout.pagesConfig);
  if (s.persistCardSettings && layout.cardSettings) s.persistCardSettings(layout.cardSettings);
  if (s.persistPageSettings && layout.pageSettings) s.persistPageSettings(layout.pageSettings);
  if (s.persistCustomNames && layout.customNames) s.persistCustomNames(layout.customNames);
  if (s.persistCustomIcons && layout.customIcons) s.persistCustomIcons(layout.customIcons);
  if (s.persistHiddenCards && layout.hiddenCards) s.persistHiddenCards(layout.hiddenCards);
  if (s.setGridColumns && layout.gridColumns !== undefined) s.setGridColumns(layout.gridColumns);
  if (s.setDynamicGridColumns && layout.dynamicGridColumns !== undefined)
    s.setDynamicGridColumns(layout.dynamicGridColumns);
  if (s.setGridGapH && layout.gridGapH !== undefined) s.setGridGapH(layout.gridGapH);
  if (s.setGridGapV && layout.gridGapV !== undefined) s.setGridGapV(layout.gridGapV);
  if (s.setCardBorderRadius && layout.cardBorderRadius !== undefined)
    s.setCardBorderRadius(layout.cardBorderRadius);
  if (s.updateCardsOnlyMode && layout.cardsOnlyMode !== undefined)
    s.updateCardsOnlyMode(layout.cardsOnlyMode);
  if (s.updateHeaderScale && layout.headerScale !== undefined)
    s.updateHeaderScale(layout.headerScale);
  if (s.updateHeaderTitle && layout.headerTitle !== undefined)
    s.updateHeaderTitle(layout.headerTitle);
  if (s.updateHeaderSettings && layout.headerSettings)
    s.updateHeaderSettings(layout.headerSettings);
  if (s.updateSectionSpacing && layout.sectionSpacing)
    s.updateSectionSpacing(layout.sectionSpacing);
  if (s.saveStatusPillsConfig && layout.statusPillsConfig)
    s.saveStatusPillsConfig(layout.statusPillsConfig);

  // ConfigContext setters
  if (s.setCurrentTheme && appearance.theme) s.setCurrentTheme(appearance.theme);
  if (s.setLanguage && appearance.language)
    s.setLanguage(normalizeSnapshotLanguage(appearance.language));
  if (s.setAppFont && appearance.appFont) s.setAppFont(appearance.appFont);
  if (s.setUnitsMode && appearance.unitsMode) s.setUnitsMode(appearance.unitsMode);
  if (s.setBgMode && appearance.bgMode) s.setBgMode(appearance.bgMode);
  if (s.setBgColor && appearance.bgColor) s.setBgColor(appearance.bgColor);
  if (s.setBgGradient && appearance.bgGradient) s.setBgGradient(appearance.bgGradient);
  if (s.setBgImage && appearance.bgImage !== undefined) s.setBgImage(appearance.bgImage);
  if (s.setCardBgColor && appearance.cardBgColor !== undefined)
    s.setCardBgColor(appearance.cardBgColor);
  if (s.setCardTransparency && appearance.cardTransparency !== undefined)
    s.setCardTransparency(appearance.cardTransparency);
  if (s.setCardBorderOpacity && appearance.cardBorderOpacity !== undefined)
    s.setCardBorderOpacity(appearance.cardBorderOpacity);
  if (s.setInactivityTimeout && appearance.inactivityTimeout !== undefined)
    s.setInactivityTimeout(appearance.inactivityTimeout);
}

// ── validate ─────────────────────────────────────────────────────────

/**
 * Lightweight check that an object looks like a valid snapshot.
 */
export function isValidSnapshot(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  // Number.isInteger() is not a type guard; once it passes, `version` is a number.
  const version = candidate.version as number;
  if (!Number.isInteger(version) || version < 1 || version > SNAPSHOT_VERSION) return false;
  if (!candidate.layout || typeof candidate.layout !== 'object') return false;
  if (!candidate.appearance || typeof candidate.appearance !== 'object') return false;
  return true;
}
