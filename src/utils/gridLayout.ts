/**
 * Grid layout algorithm – computes card positions & spans for the dashboard grid.
 * Pure functions with zero React / UI dependencies.
 */

import { getSensorAutomaticActionType, SENSOR_ACTION_TYPES } from './sensorCardConfig';
import type { CardSettingsEntry, CardSettingsMap, GetCardSettingsKey } from './cardSettingsKey';

export interface LayoutMetrics {
  rowPx?: number;
  gapPx?: number;
}

export interface ColSpanOptions {
  isMobile?: boolean;
  gridColumns?: number;
  viewportWidth?: number;
  gridGapH?: number;
}

export interface GridPosition {
  row: number;
  col: number;
  span: number;
  colSpan: number;
}

/**
 * Determine how many grid columns a card should span.
 *
 * @param {string} cardId
 * @param {Function} getCardSettingsKey  (cardId) => settingsKey
 * @param {Object}  cardSettings         Full card-settings map
 * @param {string}  activePage           Current active page id
 * @param {{rowPx?: number, gapPx?: number}} [layoutMetrics] Runtime layout metrics
 * @returns {number} 1+
 */
// Size-to-span mappings per card type category
const SPAN_TABLE: Record<string, { default: number; [size: string]: number }> = {
  // { small, medium, large } → row span
  triSize: { small: 1, medium: 2, default: 4 }, // calendar, todo
  dualSize: { small: 1, default: 2 }, // light, car, room
};

const CARD_SPAN_RULES = [
  // prefix match → category  (checked in order)
  { prefix: 'entity_card_', category: 'dualSize' },
  { prefix: 'calendar_card_', category: 'triSize' },
  { prefix: 'todo_card_', category: 'triSize' },
  { prefix: 'light_', category: 'dualSize' },
  { prefix: 'light.', category: 'dualSize' },
  { prefix: 'lock_card_', category: 'dualSize' },
  { prefix: 'lock.', category: 'dualSize' },
  { prefix: 'car_card_', category: 'dualSize' },
  { prefix: 'room_card_', category: 'dualSize' },
  { prefix: 'camera_card_', category: 'dualSize' },
  { prefix: 'spacer_card_', category: 'dualSize' },
];

export const getCardGridSpan = (
  cardId: string,
  getCardSettingsKey: GetCardSettingsKey,
  cardSettings: CardSettingsMap,
  activePage: string | null | undefined,
  layoutMetrics: LayoutMetrics = {}
): number => {
  const settings: CardSettingsEntry =
    cardSettings[getCardSettingsKey(cardId)] || cardSettings[cardId] || {};
  // Number.isFinite is not a type guard; it guarantees a number here.
  const rowPx = Number.isFinite(layoutMetrics?.rowPx) ? (layoutMetrics.rowPx as number) : 100;
  const gapPx = Number.isFinite(layoutMetrics?.gapPx) ? (layoutMetrics.gapPx as number) : 20;

  if (cardId.startsWith('spacer_card_')) {
    const rawHeightPx = Number(settings.heightPx);
    if (Number.isFinite(rawHeightPx) && rawHeightPx > 0) {
      const estimatedRows = Math.ceil((rawHeightPx + gapPx) / (rowPx + gapPx));
      return Math.max(1, estimatedRows);
    }

    const rawHeightRows = Number(settings.heightRows);
    if (Number.isFinite(rawHeightRows) && rawHeightRows >= 1) {
      return Math.max(1, Math.round(rawHeightRows));
    }
  }

  // Automations have their own logic based on type sub-setting
  if (cardId.startsWith('automation.')) {
    // Widened so includes() accepts a missing type, as it did in JS.
    if ((['sensor', 'entity', 'toggle'] as readonly unknown[]).includes(settings.type)) {
      return settings.size === 'small' ? 1 : 2;
    }
    return 1;
  }

  // Exact-match for legacy 'car' id
  if (cardId === 'car') {
    const sizeSetting = settings?.size;
    return sizeSetting === 'small' ? 1 : 2;
  }

  // Table-driven lookup for prefix-matched card types
  for (const rule of CARD_SPAN_RULES) {
    if (cardId.startsWith(rule.prefix)) {
      const sizeSetting = settings?.size;
      const mapping = SPAN_TABLE[rule.category];
      // A missing size indexes as "undefined" and falls back to default, as in JS.
      return mapping[sizeSetting as string] ?? mapping.default;
    }
  }

  // Default behaviour for all other cards
  const sizeSetting = settings?.size;
  if (sizeSetting === 'small') return 1;
  if (cardId.startsWith('weather_temp_')) return 2;
  if (activePage === 'settings' && cardId !== 'car' && !cardId.startsWith('media_player')) return 1;

  return 2;
};

/**
 * Determine how many grid columns a card should occupy horizontally.
 *
 * @param {string}   cardId
 * @param {Function} getCardSettingsKey  (cardId) => settingsKey
 * @param {Object}   cardSettings        Full card-settings map
 * @returns {number} 1–4
 */
const MOBILE_GRID_HORIZONTAL_PADDING = 16;

const getAutomaticMobileMinWidth = (cardId: string, settings: CardSettingsEntry): number | null => {
  if (cardId.startsWith('entity_card_')) {
    const sourceId = typeof settings.entityId === 'string' ? settings.entityId : '';
    const storedAction: Record<string, unknown> = settings.sensorAction || {};
    const targetId =
      typeof storedAction.entityId === 'string' && storedAction.entityId
        ? storedAction.entityId
        : sourceId;
    const configuredType = (SENSOR_ACTION_TYPES as readonly unknown[]).includes(storedAction.type)
      ? storedAction.type
      : 'auto';
    const actionType =
      configuredType === 'auto'
        ? getSensorAutomaticActionType({ entity_id: targetId })
        : configuredType;
    const hasButtonAction =
      settings.showControls !== false &&
      !(['icon', 'card'] as readonly unknown[]).includes(storedAction.trigger) &&
      actionType !== 'none';
    const usesPrimaryButton =
      configuredType !== 'auto' ||
      Boolean(
        storedAction.label || storedAction.labelOn || storedAction.labelOff || storedAction.icon
      ) ||
      targetId !== sourceId ||
      ['scene', 'script', 'button', 'input_button', 'climate'].includes(sourceId.split('.')[0]);
    if (hasButtonAction && settings.size === 'small' && usesPrimaryButton) return 280;
    if (settings.size === 'small') return 150;
    return sourceId.startsWith('climate.') ? 280 : 160;
  }
  if (settings.size === 'small') return 150;
  if (
    cardId.startsWith('media_player.') ||
    cardId.startsWith('media_group_') ||
    cardId.startsWith('sonos_group_') ||
    cardId.startsWith('climate_card_')
  ) {
    return 280;
  }
  if (
    cardId.startsWith('weather_temp_') ||
    cardId.startsWith('cost_card_') ||
    cardId.startsWith('nordpool_card_')
  ) {
    return 160;
  }
  return null;
};

export const supportsMobileCardWidth = (cardId: unknown): boolean =>
  typeof cardId === 'string' && getAutomaticMobileMinWidth(cardId, {}) !== null;

export const getCardColSpan = (
  cardId: string,
  getCardSettingsKey: GetCardSettingsKey,
  cardSettings: CardSettingsMap,
  { isMobile = false, gridColumns = 1, viewportWidth = 0, gridGapH = 0 }: ColSpanOptions = {}
): number => {
  const settings: CardSettingsEntry =
    cardSettings[getCardSettingsKey(cardId)] || cardSettings[cardId] || {};
  const configuredColSpan =
    settings.colSpan === 'full' ? Number.MAX_SAFE_INTEGER : settings.colSpan || 1;

  if (!isMobile || !supportsMobileCardWidth(cardId)) return configuredColSpan;
  if (settings.mobileWidth === 'compact') return 1;
  if (settings.mobileWidth === 'full') return Number.MAX_SAFE_INTEGER;
  if (configuredColSpan === Number.MAX_SAFE_INTEGER) return configuredColSpan;

  const minWidth = getAutomaticMobileMinWidth(cardId, settings);
  const columns = Math.max(1, gridColumns);
  const availableWidth = Math.max(0, viewportWidth - MOBILE_GRID_HORIZONTAL_PADDING);
  if (!availableWidth) return configuredColSpan;

  const columnWidth = (availableWidth - Math.max(0, columns - 1) * gridGapH) / columns;
  if (columnWidth <= 0) return configuredColSpan;

  // supportsMobileCardWidth() above guarantees a non-null min width for this card id.
  const automaticSpan = Math.ceil((minWidth! + gridGapH) / (columnWidth + gridGapH));
  return Math.max(configuredColSpan, Math.min(columns, automaticSpan));
};

/**
 * Build a position map for a list of card ids.
 *
 * @param {string[]}  ids       Ordered card ids
 * @param {number}    columns   Number of grid columns
 * @param {Function}  spanFn    (cardId) => number  – pre-bound getCardGridSpan (row span)
 * @param {Function}  [colSpanFn] (cardId) => number  – pre-bound getCardColSpan
 * @returns {Object}  { [cardId]: { row, col, span, colSpan } }
 */
export const buildGridLayout = (
  ids: readonly string[],
  columns: number,
  spanFn: (cardId: string) => number,
  colSpanFn?: ((cardId: string) => number) | null
): Record<string, GridPosition> => {
  if (!columns || columns < 1) return {};
  const occupancy: boolean[][] = [];
  const positions: Record<string, GridPosition> = {};

  const ensureRow = (row: number) => {
    if (!occupancy[row]) occupancy[row] = Array(columns).fill(false);
  };

  const canPlace = (row: number, col: number, rowSpan: number, colSpan: number) => {
    if (col + colSpan > columns) return false;
    for (let r = row; r < row + rowSpan; r += 1) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c += 1) {
        if (occupancy[r][c]) return false;
      }
    }
    return true;
  };

  const place = (row: number, col: number, rowSpan: number, colSpan: number) => {
    for (let r = row; r < row + rowSpan; r += 1) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c += 1) {
        occupancy[r][c] = true;
      }
    }
  };

  const placeSingle = (id: string, rowSpan: number, colSpan: number) => {
    let placed = false;
    let row = 0;
    while (!placed) {
      ensureRow(row);
      for (let col = 0; col < columns; col += 1) {
        if (canPlace(row, col, rowSpan, colSpan)) {
          place(row, col, rowSpan, colSpan);
          positions[id] = { row: row + 1, col: col + 1, span: rowSpan, colSpan };
          placed = true;
          break;
        }
      }
      if (!placed) row += 1;
    }
  };

  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const rowSpan = spanFn(id);
    const colSpan = colSpanFn ? Math.min(colSpanFn(id), columns) : 1;
    placeSingle(id, rowSpan, colSpan);
  }

  return positions;
};
