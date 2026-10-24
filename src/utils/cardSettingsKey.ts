import type { VisibilityConditionInput } from './conditionUtils';

export type GetCardSettingsKey = (cardId: string, pageId?: string) => string;

export interface CardSettingsEntry {
  type?: string;
  size?: string;
  colSpan?: number | 'full';
  mobileWidth?: string;
  heightPx?: unknown;
  heightRows?: unknown;
  entityId?: string;
  sensorAction?: Record<string, unknown>;
  showControls?: boolean;
  mediaIds?: unknown;
  visibilityCondition?: VisibilityConditionInput | null;
  [key: string]: unknown;
}

export type CardSettingsMap = Record<string, CardSettingsEntry | undefined>;

/**
 * Card settings are stored per page, so the same card can be configured
 * differently on different pages. The key format lives here so every caller
 * builds the same string.
 */
export function getCardSettingsKey(cardId: string, pageId: string = 'home'): string {
  return `${pageId}::${cardId}`;
}
