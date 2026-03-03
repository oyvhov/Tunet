import { createElement } from 'react';
import { MissingEntityCard } from '../components';

/**
 * @param {Record<string, any>} cardSettings
 * @param {string} settingsKey
 * @param {string} cardId
 */
export function getSettings(cardSettings, settingsKey, cardId) {
  return cardSettings?.[settingsKey] || cardSettings?.[cardId] || {};
}

/**
 * @param {any} event
 */
export function stopPropagation(event) {
  event?.stopPropagation?.();
}

/**
 * @param {boolean} editMode
 * @param {() => void} callback
 */
export function withEditModeGuard(editMode, callback) {
  return () => {
    if (editMode) return;
    callback?.();
  };
}

/**
 * @param {Record<string, any>} ctx
 * @param {Record<string, any>} props
 */
export function renderMissingEntityWhenReady(ctx, props) {
  if (!ctx?.entitiesMissingReady) return null;
  return createElement(MissingEntityCard, props);
}
