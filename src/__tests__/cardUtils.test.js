import { describe, it, expect } from 'vitest';
import { isCardRemovable, isCardHiddenByLogic, isMediaPage } from '../utils/cardUtils';

// ═════════════════════════════════════════════════════════════════════════
// isCardRemovable
// ═════════════════════════════════════════════════════════════════════════
describe('isCardRemovable', () => {
  const identity = (id) => id;

  it('allows person entities to be removed from header', () => {
    expect(isCardRemovable('person.john', 'header', { getCardSettingsKey: identity, cardSettings: {} })).toBe(true);
  });

  it('disallows non-person entities from header', () => {
    expect(isCardRemovable('sensor.temp', 'header', { getCardSettingsKey: identity, cardSettings: {} })).toBe(false);
  });

  it('disallows car removal from settings page', () => {
    expect(isCardRemovable('car', 'settings', { getCardSettingsKey: identity, cardSettings: {} })).toBe(false);
  });

  it('disallows media_player removal from settings', () => {
    expect(isCardRemovable('media_player.speaker', 'settings', { getCardSettingsKey: identity, cardSettings: {} })).toBe(false);
  });

  it('allows other cards to be removed from settings', () => {
    expect(isCardRemovable('sensor.temp', 'settings', { getCardSettingsKey: identity, cardSettings: {} })).toBe(true);
  });

  it('allows removable-prefix cards on any page', () => {
    const prefixes = ['light_', 'vacuum.', 'fan.', 'media_player.', 'weather_temp_', 'calendar_card_', 'climate_card_', 'cover_card_', 'camera_card_'];
    prefixes.forEach(prefix => {
      expect(isCardRemovable(`${prefix}test`, 'home', { getCardSettingsKey: identity, cardSettings: {} })).toBe(true);
    });
  });

  it('allows entity-type cards via settings', () => {
    const settings = { 'sensor.temp': { type: 'entity' } };
    expect(isCardRemovable('sensor.temp', 'home', { getCardSettingsKey: identity, cardSettings: settings })).toBe(true);
  });

  it('allows toggle-type cards via settings', () => {
    const settings = { 'switch.lamp': { type: 'toggle' } };
    expect(isCardRemovable('switch.lamp', 'home', { getCardSettingsKey: identity, cardSettings: settings })).toBe(true);
  });

  it('allows media_player card to be removed from non-settings pages', () => {
    expect(isCardRemovable('media_player', 'home', { getCardSettingsKey: identity, cardSettings: {} })).toBe(true);
  });

  it('disallows generic cards without removable prefix', () => {
    expect(isCardRemovable('binary_sensor.door', 'home', { getCardSettingsKey: identity, cardSettings: {} })).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// isCardHiddenByLogic
// ═════════════════════════════════════════════════════════════════════════
describe('isCardHiddenByLogic', () => {
  const identity = (id) => id;

  it('hides media_player (singular) always', () => {
    expect(isCardHiddenByLogic('media_player', {
      activePage: 'home', getCardSettingsKey: identity, cardSettings: {}, entities: {}
    })).toBe(true);
  });

  it('hides media_group_ with no valid entities', () => {
    const settings = { 'media_group_1': { mediaIds: ['player.a'] } };
    expect(isCardHiddenByLogic('media_group_1', {
      activePage: 'home', getCardSettingsKey: identity, cardSettings: settings, entities: {}
    })).toBe(true);
  });

  it('shows media_group_ with valid entities', () => {
    const settings = { 'media_group_1': { mediaIds: ['player.a'] } };
    const entities = { 'player.a': { state: 'playing' } };
    expect(isCardHiddenByLogic('media_group_1', {
      activePage: 'home', getCardSettingsKey: identity, cardSettings: settings, entities
    })).toBe(false);
  });

  it('applies visibilityCondition to media_group_ cards', () => {
    const settings = {
      'media_group_1': {
        mediaIds: ['media_player.living_room'],
        visibilityCondition: { type: 'state', states: ['off'] },
      },
    };
    const entities = {
      'media_player.living_room': {
        entity_id: 'media_player.living_room',
        state: 'playing',
        attributes: {},
      },
    };
    expect(isCardHiddenByLogic('media_group_1', {
      activePage: 'home', getCardSettingsKey: identity, cardSettings: settings, entities
    })).toBe(true);
  });

  it('hides non-existent entities on settings page', () => {
    expect(isCardHiddenByLogic('sensor.temp', {
      activePage: 'settings', getCardSettingsKey: identity, cardSettings: {}, entities: {}
    })).toBe(true);
  });

  it('shows existing entities on settings page', () => {
    expect(isCardHiddenByLogic('sensor.temp', {
      activePage: 'settings', getCardSettingsKey: identity, cardSettings: {},
      entities: { 'sensor.temp': { state: '22' } }
    })).toBe(false);
  });

  it('does not hide special cards even if no entity exists', () => {
    expect(isCardHiddenByLogic('calendar_card_1', {
      activePage: 'home', getCardSettingsKey: identity, cardSettings: {}, entities: {}
    })).toBe(false);
  });

  it('does not hide camera cards even if no direct entity matches card id', () => {
    expect(isCardHiddenByLogic('camera_card_1', {
      activePage: 'home', getCardSettingsKey: identity, cardSettings: {}, entities: {}
    })).toBe(false);
  });

  it('does not hide light cards even without entity', () => {
    expect(isCardHiddenByLogic('light_abc', {
      activePage: 'home', getCardSettingsKey: identity, cardSettings: {}, entities: {}
    })).toBe(false);
  });

  it('hides non-special cards without entity', () => {
    expect(isCardHiddenByLogic('switch.unknown', {
      activePage: 'home', getCardSettingsKey: identity, cardSettings: {}, entities: {}
    })).toBe(true);
  });

  it('shows non-special cards with entity', () => {
    expect(isCardHiddenByLogic('switch.lamp', {
      activePage: 'home', getCardSettingsKey: identity, cardSettings: {},
      entities: { 'switch.lamp': { state: 'on' } }
    })).toBe(false);
  });

  it('hides card when visibilityCondition does not match', () => {
    expect(isCardHiddenByLogic('switch.lamp', {
      activePage: 'home',
      getCardSettingsKey: identity,
      cardSettings: {
        'switch.lamp': {
          visibilityCondition: { type: 'state', states: ['off'] },
        },
      },
      entities: { 'switch.lamp': { entity_id: 'switch.lamp', state: 'on', attributes: {} } },
    })).toBe(true);
  });

  it('shows card when visibilityCondition matches', () => {
    expect(isCardHiddenByLogic('switch.lamp', {
      activePage: 'home',
      getCardSettingsKey: identity,
      cardSettings: {
        'switch.lamp': {
          visibilityCondition: { type: 'state', states: ['on'] },
        },
      },
      entities: { 'switch.lamp': { entity_id: 'switch.lamp', state: 'on', attributes: {} } },
    })).toBe(false);
  });

  it('uses mapped entityId for visibilityCondition checks', () => {
    expect(isCardHiddenByLogic('weather_temp_1', {
      activePage: 'home',
      getCardSettingsKey: identity,
      cardSettings: {
        'weather_temp_1': {
          entityId: 'weather.home',
          visibilityCondition: { type: 'state', states: ['sunny'] },
        },
      },
      entities: {
        'weather.home': { entity_id: 'weather.home', state: 'rainy', attributes: {} },
      },
    })).toBe(true);
  });

  it('uses configured entity key mappings for special cards', () => {
    expect(isCardHiddenByLogic('climate_card_living', {
      activePage: 'home',
      getCardSettingsKey: identity,
      cardSettings: {
        'climate_card_living': {
          climateId: 'climate.living_room',
          visibilityCondition: { type: 'state', states: ['heat'] },
        },
      },
      entities: {
        'climate.living_room': { entity_id: 'climate.living_room', state: 'off', attributes: {} },
      },
    })).toBe(true);
  });

  it('applies AND logic across two visibility rules', () => {
    expect(isCardHiddenByLogic('switch.lamp', {
      activePage: 'home',
      getCardSettingsKey: identity,
      cardSettings: {
        'switch.lamp': {
          visibilityCondition: {
            logic: 'AND',
            rules: [
              { type: 'state', states: ['on'] },
              { type: 'attribute', attribute: 'friendly_name', value: 'Desk Lamp' },
            ],
          },
        },
      },
      entities: { 'switch.lamp': { entity_id: 'switch.lamp', state: 'on', attributes: { friendly_name: 'Desk Lamp' } } },
    })).toBe(false);
  });

  it('applies OR logic across two visibility rules', () => {
    expect(isCardHiddenByLogic('switch.lamp', {
      activePage: 'home',
      getCardSettingsKey: identity,
      cardSettings: {
        'switch.lamp': {
          visibilityCondition: {
            logic: 'OR',
            rules: [
              { type: 'state', states: ['off'] },
              { type: 'attribute', attribute: 'friendly_name', value: 'Desk Lamp' },
            ],
          },
        },
      },
      entities: { 'switch.lamp': { entity_id: 'switch.lamp', state: 'on', attributes: { friendly_name: 'Desk Lamp' } } },
    })).toBe(false);
  });

  it('supports duration in seconds for rule matching', () => {
    expect(isCardHiddenByLogic('switch.lamp', {
      activePage: 'home',
      getCardSettingsKey: identity,
      cardSettings: {
        'switch.lamp': {
          visibilityCondition: {
            rules: [
              { type: 'state', states: ['off'], forSeconds: 10 },
            ],
          },
        },
      },
      entities: {
        'switch.lamp': {
          entity_id: 'switch.lamp',
          state: 'off',
          last_changed: '2020-01-01T00:00:00Z',
          attributes: {},
        },
      },
    })).toBe(false);
  });

  it('supports different entity on second rule', () => {
    expect(isCardHiddenByLogic('switch.lamp', {
      activePage: 'home',
      getCardSettingsKey: identity,
      cardSettings: {
        'switch.lamp': {
          visibilityCondition: {
            logic: 'AND',
            rules: [
              { type: 'state', states: ['on'] },
              { type: 'state', states: ['home'], entityId: 'person.me' },
            ],
          },
        },
      },
      entities: {
        'switch.lamp': { entity_id: 'switch.lamp', state: 'on', attributes: {} },
        'person.me': { entity_id: 'person.me', state: 'home', attributes: {} },
      },
    })).toBe(false);
  });

  it('ignores stored visibilityCondition when enabled is false', () => {
    expect(isCardHiddenByLogic('switch.lamp', {
      activePage: 'home',
      getCardSettingsKey: identity,
      cardSettings: {
        'switch.lamp': {
          visibilityCondition: {
            enabled: false,
            rules: [
              { type: 'state', states: ['off'] },
            ],
          },
        },
      },
      entities: { 'switch.lamp': { entity_id: 'switch.lamp', state: 'on', attributes: {} } },
    })).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// isMediaPage
// ═════════════════════════════════════════════════════════════════════════
describe('isMediaPage', () => {
  it('returns false for null pageId', () => {
    expect(isMediaPage(null, {})).toBe(false);
  });

  it('returns true for media type page', () => {
    expect(isMediaPage('myPage', { myPage: { type: 'media' } })).toBe(true);
  });

  it('returns true for sonos type page', () => {
    expect(isMediaPage('sonosPage', { sonosPage: { type: 'sonos' } })).toBe(true);
  });

  it('returns true for pageId starting with media', () => {
    expect(isMediaPage('media_room', {})).toBe(true);
  });

  it('returns true for pageId starting with sonos', () => {
    expect(isMediaPage('sonos_1', {})).toBe(true);
  });

  it('returns false for regular page', () => {
    expect(isMediaPage('home', { home: {} })).toBe(false);
  });
});
