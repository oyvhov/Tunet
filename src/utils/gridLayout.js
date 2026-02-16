/**
 * Grid layout algorithm – computes card positions & spans for the dashboard grid.
 * Pure functions with zero React / UI dependencies.
 */

/**
 * Determine how many grid rows a card should span.
 *
 * @param {string} cardId
 * @param {Function} getCardSettingsKey  (cardId) => settingsKey
 * @param {Object}  cardSettings         Full card-settings map
 * @param {string}  activePage           Current active page id
 * @returns {number} 1 | 2 | 4
 */
// Size-to-span mappings per card type category
const SPAN_TABLE = {
  // { small, medium, large } → row count
  triSize:  { small: 1, medium: 2, default: 4 },   // calendar, todo
  dualSize: { small: 1, default: 2 },               // light, car, room
};

const CARD_SPAN_RULES = [
  // prefix match → category  (checked in order)
  { prefix: 'calendar_card_', category: 'triSize' },
  { prefix: 'todo_card_',     category: 'triSize' },
  { prefix: 'light_',         category: 'dualSize' },
  { prefix: 'light.',         category: 'dualSize' },
  { prefix: 'car_card_',      category: 'dualSize' },
  { prefix: 'room_card_',     category: 'dualSize' },
  { prefix: 'spacer_card_',   category: 'dualSize' },
];

export const getCardGridSpan = (cardId, getCardSettingsKey, cardSettings, activePage) => {
  // Automations have their own logic based on type sub-setting
  if (cardId.startsWith('automation.')) {
    const settings = cardSettings[getCardSettingsKey(cardId)] || cardSettings[cardId] || {};
    if (['sensor', 'entity', 'toggle'].includes(settings.type)) {
      return settings.size === 'small' ? 1 : 2;
    }
    return 1;
  }

  // Exact-match for legacy 'car' id
  if (cardId === 'car') {
    const sizeSetting = cardSettings[getCardSettingsKey(cardId)]?.size || cardSettings[cardId]?.size;
    return sizeSetting === 'small' ? 1 : 2;
  }

  // Table-driven lookup for prefix-matched card types
  for (const rule of CARD_SPAN_RULES) {
    if (cardId.startsWith(rule.prefix)) {
      const sizeSetting = cardSettings[getCardSettingsKey(cardId)]?.size || cardSettings[cardId]?.size;
      const mapping = SPAN_TABLE[rule.category];
      return mapping[sizeSetting] ?? mapping.default;
    }
  }

  // Default behaviour for all other cards
  const sizeSetting = cardSettings[getCardSettingsKey(cardId)]?.size || cardSettings[cardId]?.size;
  if (sizeSetting === 'small') return 1;
  if (cardId.startsWith('weather_temp_')) return 2;
  if (activePage === 'settings' && cardId !== 'car' && !cardId.startsWith('media_player')) return 1;

  return 2;
};

/**
 * Determine how many grid columns a card should span (width).
 * Reads the `colSpan` setting from card settings; defaults to 1.
 *
 * @param {string}   cardId
 * @param {Function} getCardSettingsKey
 * @param {Object}   cardSettings
 * @returns {number}
 */
export const getCardColSpan = (cardId, getCardSettingsKey, cardSettings) => {
  const settings = cardSettings[getCardSettingsKey(cardId)] || cardSettings[cardId] || {};
  return settings.colSpan || 1;
};

/**
 * Build a position map for a list of card ids.
 *
 * @param {string[]}  ids        Ordered card ids
 * @param {number}    columns    Number of grid columns
 * @param {Function}  spanFn     (cardId) => number  – row span
 * @param {Function}  [colSpanFn]  (cardId) => number  – column span (default 1)
 * @returns {Object}  { [cardId]: { row, col, span, colSpan } }
 */
export const buildGridLayout = (ids, columns, spanFn, colSpanFn) => {
  if (!columns || columns < 1) return {};
  const occupancy = [];
  const positions = {};

  const ensureRow = (row) => {
    if (!occupancy[row]) occupancy[row] = Array(columns).fill(false);
  };

  const canPlace = (row, col, rowSpan, colSpan) => {
    if (col + colSpan > columns) return false;
    for (let r = row; r < row + rowSpan; r += 1) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c += 1) {
        if (occupancy[r][c]) return false;
      }
    }
    return true;
  };

  const place = (row, col, rowSpan, colSpan) => {
    for (let r = row; r < row + rowSpan; r += 1) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c += 1) {
        occupancy[r][c] = true;
      }
    }
  };

  const placeSingle = (id, rowSpan, colSpan) => {
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
