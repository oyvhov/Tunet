/**
 * Card settings are stored per page, so the same card can be configured
 * differently on different pages. The key format lives here so every caller
 * builds the same string.
 */
export function getCardSettingsKey(cardId, pageId = 'home') {
  return `${pageId}::${cardId}`;
}
