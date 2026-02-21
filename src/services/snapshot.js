/**
 * Config snapshot — collect/apply dashboard configuration.
 *
 * A snapshot captures layout, card settings, and appearance — everything
 * a user would want to back up or transfer.  Credentials (HA URL, token,
 * OAuth tokens) are intentionally excluded for security.
 */

import { DEFAULT_LANGUAGE, normalizeLanguage } from '../i18n';

const SNAPSHOT_VERSION = 1;

// ── helpers ──────────────────────────────────────────────────────────

const readJSON = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const readNumber = (key, fallback) => {
  const raw = localStorage.getItem(key);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const readBoolean = (key, fallback) => {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return fallback;
};

const normalizeSnapshotLanguage = (language) => normalizeLanguage(language);

// ── collect ──────────────────────────────────────────────────────────

/**
 * Read all relevant localStorage keys and return a versioned snapshot object.
 */
export function collectSnapshot() {
  return {
    version: SNAPSHOT_VERSION,
    layout: {
      pagesConfig:       readJSON('tunet_pages_config', { header: [], pages: ['home'], home: [] }),
      cardSettings:      readJSON('tunet_card_settings', {}),
      hiddenCards:        readJSON('tunet_hidden_cards', []),
      customNames:        readJSON('tunet_custom_names', {}),
      customIcons:        readJSON('tunet_custom_icons', {}),
      pageSettings:       readJSON('tunet_page_settings', {}),
      gridColumns:        readNumber('tunet_grid_columns', 4),
      dynamicGridColumns: readBoolean('tunet_grid_columns_dynamic', true),
      gridGapH:           readNumber('tunet_grid_gap_h', 20),
      gridGapV:           readNumber('tunet_grid_gap_v', 20),
      cardBorderRadius:   readNumber('tunet_card_border_radius', 16),
      headerSettings:     readJSON('tunet_header_settings', { showTitle: true, showClock: true, showDate: true }),
      headerTitle:        localStorage.getItem('tunet_header_title') || '',
      headerScale:        readNumber('tunet_header_scale', 1),
      sectionSpacing:     readJSON('tunet_section_spacing', { headerToStatus: 16, statusToNav: 24, navToGrid: 24 }),
      statusPillsConfig:  readJSON('tunet_status_pills_config', []),
    },
    appearance: {
      theme:              localStorage.getItem('tunet_theme') || 'dark',
      language:           normalizeSnapshotLanguage(localStorage.getItem('tunet_language') || DEFAULT_LANGUAGE),
      bgMode:             localStorage.getItem('tunet_bg_mode') || 'theme',
      bgColor:            localStorage.getItem('tunet_bg_color') || '#0f172a',
      bgGradient:         localStorage.getItem('tunet_bg_gradient') || 'midnight',
      bgImage:            localStorage.getItem('tunet_bg_image') || '',
      cardBgColor:        localStorage.getItem('tunet_card_bg_color') || '',
      cardTransparency:   readNumber('tunet_card_transparency', 40),
      cardBorderOpacity:  readNumber('tunet_card_border_opacity', 5),
      inactivityTimeout:  readNumber('tunet_inactivity_timeout', 60),
    },
  };
}

// ── apply ────────────────────────────────────────────────────────────

/**
 * Write a snapshot into localStorage AND update React context state via
 * the provided setter object.
 *
 * @param {object} snapshot           Versioned snapshot (from collectSnapshot or API)
 * @param {object} [contextSetters]   Object with setter functions from PageContext + ConfigContext
 */
export function applySnapshot(snapshot, contextSetters = {}) {
  if (!snapshot || typeof snapshot !== 'object') return;

  const { layout = {}, appearance = {} } = snapshot;

  // ── Layout → localStorage ──
  if (layout.pagesConfig)      localStorage.setItem('tunet_pages_config',       JSON.stringify(layout.pagesConfig));
  if (layout.cardSettings)     localStorage.setItem('tunet_card_settings',      JSON.stringify(layout.cardSettings));
  if (layout.hiddenCards)      localStorage.setItem('tunet_hidden_cards',       JSON.stringify(layout.hiddenCards));
  if (layout.customNames)      localStorage.setItem('tunet_custom_names',       JSON.stringify(layout.customNames));
  if (layout.customIcons)      localStorage.setItem('tunet_custom_icons',       JSON.stringify(layout.customIcons));
  if (layout.pageSettings)     localStorage.setItem('tunet_page_settings',      JSON.stringify(layout.pageSettings));
  if (layout.statusPillsConfig) localStorage.setItem('tunet_status_pills_config', JSON.stringify(layout.statusPillsConfig));
  if (layout.headerSettings)   localStorage.setItem('tunet_header_settings',    JSON.stringify(layout.headerSettings));
  if (layout.sectionSpacing)   localStorage.setItem('tunet_section_spacing',    JSON.stringify(layout.sectionSpacing));

  if (layout.gridColumns !== undefined)      localStorage.setItem('tunet_grid_columns',      String(layout.gridColumns));
  if (layout.dynamicGridColumns !== undefined) localStorage.setItem('tunet_grid_columns_dynamic', layout.dynamicGridColumns ? '1' : '0');
  if (layout.gridGapH !== undefined)         localStorage.setItem('tunet_grid_gap_h',        String(layout.gridGapH));
  if (layout.gridGapV !== undefined)         localStorage.setItem('tunet_grid_gap_v',        String(layout.gridGapV));
  if (layout.cardBorderRadius !== undefined) localStorage.setItem('tunet_card_border_radius', String(layout.cardBorderRadius));
  if (layout.headerScale !== undefined)      localStorage.setItem('tunet_header_scale',      String(layout.headerScale));
  if (layout.headerTitle !== undefined)      localStorage.setItem('tunet_header_title',      layout.headerTitle);

  // ── Appearance → localStorage ──
  if (appearance.theme)              localStorage.setItem('tunet_theme',              appearance.theme);
  if (appearance.language)           localStorage.setItem('tunet_language',           normalizeSnapshotLanguage(appearance.language));
  if (appearance.bgMode)             localStorage.setItem('tunet_bg_mode',            appearance.bgMode);
  if (appearance.bgColor)            localStorage.setItem('tunet_bg_color',           appearance.bgColor);
  if (appearance.bgGradient)         localStorage.setItem('tunet_bg_gradient',        appearance.bgGradient);
  if (appearance.bgImage !== undefined) localStorage.setItem('tunet_bg_image',        appearance.bgImage);
  if (appearance.cardBgColor !== undefined) {
    if (appearance.cardBgColor) {
      localStorage.setItem('tunet_card_bg_color', appearance.cardBgColor);
    } else {
      localStorage.removeItem('tunet_card_bg_color');
    }
  }
  if (appearance.cardTransparency !== undefined)  localStorage.setItem('tunet_card_transparency',  String(appearance.cardTransparency));
  if (appearance.cardBorderOpacity !== undefined) localStorage.setItem('tunet_card_border_opacity', String(appearance.cardBorderOpacity));
  if (appearance.inactivityTimeout !== undefined) localStorage.setItem('tunet_inactivity_timeout', String(appearance.inactivityTimeout));

  // ── Update React contexts (if setters provided) ──
  const s = contextSetters;

  // PageContext setters
  if (s.persistConfig && layout.pagesConfig)         s.persistConfig(layout.pagesConfig);
  if (s.persistCardSettings && layout.cardSettings)   s.persistCardSettings(layout.cardSettings);
  if (s.persistPageSettings && layout.pageSettings)   s.persistPageSettings(layout.pageSettings);
  if (s.persistCustomNames && layout.customNames)     s.persistCustomNames(layout.customNames);
  if (s.persistCustomIcons && layout.customIcons)     s.persistCustomIcons(layout.customIcons);
  if (s.persistHiddenCards && layout.hiddenCards)      s.persistHiddenCards(layout.hiddenCards);
  if (s.setGridColumns && layout.gridColumns !== undefined)       s.setGridColumns(layout.gridColumns);
  if (s.setDynamicGridColumns && layout.dynamicGridColumns !== undefined) s.setDynamicGridColumns(layout.dynamicGridColumns);
  if (s.setGridGapH && layout.gridGapH !== undefined)            s.setGridGapH(layout.gridGapH);
  if (s.setGridGapV && layout.gridGapV !== undefined)            s.setGridGapV(layout.gridGapV);
  if (s.setCardBorderRadius && layout.cardBorderRadius !== undefined) s.setCardBorderRadius(layout.cardBorderRadius);
  if (s.updateHeaderScale && layout.headerScale !== undefined)   s.updateHeaderScale(layout.headerScale);
  if (s.updateHeaderTitle && layout.headerTitle !== undefined)   s.updateHeaderTitle(layout.headerTitle);
  if (s.updateHeaderSettings && layout.headerSettings)           s.updateHeaderSettings(layout.headerSettings);
  if (s.updateSectionSpacing && layout.sectionSpacing)           s.updateSectionSpacing(layout.sectionSpacing);
  if (s.saveStatusPillsConfig && layout.statusPillsConfig)       s.saveStatusPillsConfig(layout.statusPillsConfig);

  // ConfigContext setters
  if (s.setCurrentTheme && appearance.theme)                     s.setCurrentTheme(appearance.theme);
  if (s.setLanguage && appearance.language)                      s.setLanguage(normalizeSnapshotLanguage(appearance.language));
  if (s.setBgMode && appearance.bgMode)                          s.setBgMode(appearance.bgMode);
  if (s.setBgColor && appearance.bgColor)                        s.setBgColor(appearance.bgColor);
  if (s.setBgGradient && appearance.bgGradient)                  s.setBgGradient(appearance.bgGradient);
  if (s.setBgImage && appearance.bgImage !== undefined)          s.setBgImage(appearance.bgImage);
  if (s.setCardBgColor && appearance.cardBgColor !== undefined)  s.setCardBgColor(appearance.cardBgColor);
  if (s.setCardTransparency && appearance.cardTransparency !== undefined)  s.setCardTransparency(appearance.cardTransparency);
  if (s.setCardBorderOpacity && appearance.cardBorderOpacity !== undefined) s.setCardBorderOpacity(appearance.cardBorderOpacity);
  if (s.setInactivityTimeout && appearance.inactivityTimeout !== undefined) s.setInactivityTimeout(appearance.inactivityTimeout);
}

// ── validate ─────────────────────────────────────────────────────────

/**
 * Lightweight check that an object looks like a valid snapshot.
 */
export function isValidSnapshot(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (!obj.version || typeof obj.version !== 'number') return false;
  if (!obj.layout || typeof obj.layout !== 'object') return false;
  if (!obj.appearance || typeof obj.appearance !== 'object') return false;
  return true;
}

// ── file export/import ───────────────────────────────────────────────

/**
 * Download the current dashboard config as a JSON file.
 */
export function exportToFile(filename = 'tunet-dashboard.json') {
  const snapshot = collectSnapshot();
  const blob = new window.Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a JSON file and return the parsed snapshot.
 * Rejects if the file doesn't look like a valid snapshot.
 *
 * @param {File} file
 * @returns {Promise<object>}
 */
export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!isValidSnapshot(parsed)) {
          reject(new Error('Invalid snapshot format'));
          return;
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
