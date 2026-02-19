/**
 * Pure utility functions for card type detection and visibility logic.
 * These are extracted from App.jsx to reduce file size and improve testability.
 */

import { evaluateVisibilityConditionConfig, isConditionConfigured, resolveConditionEntityId } from './conditionUtils';

/** Prefixes for card types that can always be removed from user pages. */
const REMOVABLE_PREFIXES = [
  'light_', 'light.', 'vacuum.', 'media_player.', 'media_group_',
  'weather_temp_', 'calendar_card_', 'climate_card_', 'cost_card_',
  'androidtv_card_', 'car_card_', 'nordpool_card_', 'todo_card_', 'room_card_',
  'cover_card_', 'camera_card_', 'spacer_card_', 'fan.',
];

/** Prefixes for "special" composite cards that don't map 1:1 to an entity. */
const SPECIAL_CARD_PREFIXES = [
  'media_group_', 'weather_temp_', 'calendar_card_', 'climate_card_',
  'cost_card_', 'androidtv_card_', 'car_card_', 'nordpool_card_',
  'todo_card_', 'room_card_', 'cover_card_', 'camera_card_', 'spacer_card_',
];

/**
 * Determine whether a card can be removed from a given page.
 */
export function isCardRemovable(cardId, pageId, { getCardSettingsKey, cardSettings }) {
  if (pageId === 'header') return cardId.startsWith('person.');
  if (pageId === 'settings') {
    if (['car'].includes(cardId)) return false;
    if (cardId.startsWith('media_player')) return false;
    return true;
  }
  const settingsKey = getCardSettingsKey(cardId, pageId);
  const typeSetting = cardSettings[settingsKey]?.type || cardSettings[cardId]?.type;
  if (typeSetting === 'entity' || typeSetting === 'toggle' || typeSetting === 'sensor') return true;
  if (cardId === 'media_player') return true;
  return REMOVABLE_PREFIXES.some(p => cardId.startsWith(p));
}

/**
 * Determine whether a card should be hidden in view mode based on entity availability.
 */
export function isCardHiddenByLogic(cardId, { activePage, getCardSettingsKey, cardSettings, entities }) {
  const settingsKey = getCardSettingsKey(cardId);
  const cardConfig = cardSettings[settingsKey] || cardSettings[cardId] || {};
  let hiddenByBaseLogic = false;

  if (cardId === 'media_player') {
    return true;
  }

  if (cardId.startsWith('media_group_')) {
    const groupSettings = cardConfig;
    const selectedIds = Array.isArray(groupSettings.mediaIds) ? groupSettings.mediaIds : [];
    const hasEntities = selectedIds.some(id => entities[id]);
    hiddenByBaseLogic = !hasEntities;
  }

  if (activePage === 'settings' && !['car'].includes(cardId) && !cardId.startsWith('light_') && !cardId.startsWith('media_player')) {
    hiddenByBaseLogic = hiddenByBaseLogic || !entities[cardId];
  }

  const isSpecialCard = cardId === 'car' || 
    SPECIAL_CARD_PREFIXES.some(p => cardId.startsWith(p));

  if (!isSpecialCard && !entities[cardId]) {
     if (cardId.startsWith('light_') || cardId.startsWith('light.')) return false;
     hiddenByBaseLogic = true;
  }

  if (hiddenByBaseLogic) {
    return true;
  }

  if (isConditionConfigured(cardConfig.visibilityCondition)) {
    const targetEntityId = resolveConditionEntityId(cardId, cardConfig, entities);
    if (!targetEntityId) return false;
    const targetEntity = entities[targetEntityId];
    if (!targetEntity) return false;

    const shouldShow = evaluateVisibilityConditionConfig({
      condition: cardConfig.visibilityCondition,
      entity: targetEntity,
      entities,
      fallbackEntityId: targetEntityId,
    });

    return !shouldShow;
  }

  return false;
}

/**
 * Check if a page is a media/sonos page.
 */
export function isMediaPage(pageId, pageSettings) {
  if (!pageId) return false;
  const settings = pageSettings[pageId];
  return settings?.type === 'media' || settings?.type === 'sonos' || pageId.startsWith('media') || pageId.startsWith('sonos');
}
