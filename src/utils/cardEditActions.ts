export interface CardEditSettings {
  type?: string;
  size?: string;
}

/** Prefixes for cards that support size toggling. */
const RESIZABLE_PREFIXES = [
  'light_',
  'light.',
  'lock_card_',
  'lock.',
  'vacuum.',
  'lawn_mower.',
  'automation.',
  'climate_card_',
  'cost_card_',
  'weather_temp_',
  'androidtv_card_',
  'appletv_card_',
  'calendar_card_',
  'todo_card_',
  'nordpool_card_',
  'car_card_',
  'cover_card_',
  'camera_card_',
  'fan.',
  'fan_card_',
  'alarm_card_',
];

/** Prefixes that cycle through 3 sizes (small → medium → large). */
const TRIPLE_SIZE_PREFIXES = ['calendar_card_', 'todo_card_'];

export function canResizeCard(editId: string, settings?: CardEditSettings | null): boolean {
  if (editId === 'car') return true;
  if (['entity', 'toggle', 'sensor', 'fan'].includes(settings?.type ?? '')) return true;
  return RESIZABLE_PREFIXES.some((prefix) => editId.startsWith(prefix));
}

export function isTripleSizeCard(editId: string): boolean {
  return TRIPLE_SIZE_PREFIXES.some((prefix) => editId.startsWith(prefix));
}

export function getNextCardSize(editId: string, currentSize?: string): string {
  if (isTripleSizeCard(editId)) {
    return currentSize === 'small' ? 'medium' : currentSize === 'medium' ? 'large' : 'small';
  }
  return currentSize === 'small' ? 'large' : 'small';
}

export type CardMoveDirection = 'left' | 'right';

/** Returns the config with the card swapped one step, or null when it cannot move. */
export function moveCardInPage<T extends Record<string, unknown>>(
  pagesConfig: T,
  pageId: string,
  cardId: string,
  direction: CardMoveDirection
): T | null {
  // Page entries in the pages config are card-id arrays; its index signature is untyped.
  const cards = [...((pagesConfig[pageId] as string[] | undefined) || [])];
  const index = cards.indexOf(cardId);
  if (index === -1) return null;
  const target = direction === 'left' ? index - 1 : index + 1;
  if (target < 0 || target >= cards.length) return null;
  [cards[index], cards[target]] = [cards[target], cards[index]];
  return { ...pagesConfig, [pageId]: cards };
}
