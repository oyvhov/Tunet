import { describe, expect, it } from 'vitest';
import { buildRoomCardsPayload } from '../rendering/modalSlices/roomCardUtils';

describe('buildRoomCardsPayload', () => {
  it('returns null when no areas are provided', () => {
    const result = buildRoomCardsPayload({
      areas: [],
      areaEntitiesById: {},
      pagesConfig: {},
      addCardTargetPage: 'home',
      cardSettings: {},
      getCardSettingsKey: () => 'settings::x',
      timestamp: 111,
    });

    expect(result).toBeNull();
  });

  it('builds config/settings payload and first-card pointers', () => {
    const result = buildRoomCardsPayload({
      areas: [
        { area_id: 'kitchen', name: 'Kitchen', icon: 'mdi:fridge' },
        { area_id: 'hall', name: 'Hall' },
      ],
      areaEntitiesById: {
        kitchen: ['light.kitchen', 'sensor.kitchen_temp'],
      },
      pagesConfig: { home: ['sensor_card_1'] },
      addCardTargetPage: 'home',
      cardSettings: {},
      getCardSettingsKey: (cardId, page) => `${page}::${cardId}`,
      timestamp: 123,
    });

    expect(result.newConfig.home).toEqual([
      'sensor_card_1',
      'room_card_123_0',
      'room_card_123_1',
    ]);
    expect(result.firstCardId).toBe('room_card_123_0');
    expect(result.firstSettingsKey).toBe('home::room_card_123_0');
    expect(result.customNames).toEqual([
      { cardId: 'room_card_123_0', name: 'Kitchen' },
      { cardId: 'room_card_123_1', name: 'Hall' },
    ]);

    const firstSettings = result.newSettings['home::room_card_123_0'];
    expect(firstSettings.areaId).toBe('kitchen');
    expect(firstSettings.entityIds).toEqual(['light.kitchen', 'sensor.kitchen_temp']);
    expect(firstSettings.showPopupMedia).toBe(true);
    expect(firstSettings.size).toBe('large');
  });
});
