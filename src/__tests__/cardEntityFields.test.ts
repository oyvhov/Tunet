import { describe, expect, it } from 'vitest';
import { getCardEntityFields, getCardEntityValue } from '../modals/editCard/cardEntityFields';

const keysFor = (cardId: string, settings = {}) =>
  getCardEntityFields(cardId, settings).map((field) => field.settingKey);

describe('getCardEntityFields', () => {
  it.each([
    ['cover_card_1', ['coverId'], ['cover']],
    ['climate_card_1', ['climateId'], ['climate']],
    ['alarm_card_1', ['alarmId'], ['alarm_control_panel']],
    ['camera_card_1', ['cameraId'], ['camera']],
    ['nordpool_card_1', ['nordpoolId'], ['sensor']],
    ['light.desk', ['entityId'], ['light']],
    ['fan.bedroom', ['entityId'], ['fan']],
    ['fan_card_1', ['entityId'], ['fan']],
    ['vacuum.robot', ['entityId'], ['vacuum']],
    ['lawn_mower.bob', ['entityId'], ['lawn_mower']],
    ['media_player.tv', ['entityId'], ['media_player']],
  ])('maps %s to the key its renderer reads', (cardId, keys, domains) => {
    const fields = getCardEntityFields(cardId, {});
    expect(fields.map((field) => field.settingKey)).toEqual(keys);
    expect(fields[0].domains).toEqual(domains);
    expect(fields[0].required).toBe(true);
  });

  it('offers both entities for weather and TV cards, with the second optional', () => {
    expect(
      getCardEntityFields('weather_temp_1', {}).map((f) => [f.settingKey, f.required])
    ).toEqual([
      ['weatherId', true],
      ['tempId', false],
    ]);
    for (const cardId of ['androidtv_card_1', 'appletv_card_1']) {
      expect(getCardEntityFields(cardId, {}).map((f) => [f.settingKey, f.required])).toEqual([
        ['mediaPlayerId', true],
        ['remoteId', false],
      ]);
    }
  });

  it('writes a lock to the key the renderer prefers', () => {
    expect(keysFor('lock_card_1', { lockId: 'lock.a' })).toEqual(['lockId']);
    expect(keysFor('lock_card_1', { entityId: 'lock.a', lockId: 'lock.b' })).toEqual(['entityId']);
  });

  it('leaves out cards with their own entity settings', () => {
    for (const cardId of ['entity_card_1', 'todo_card_1', 'cost_card_1', 'car', 'media_group_1']) {
      expect(keysFor(cardId)).toEqual([]);
    }
  });

  it('does not offer the picker for a sensor shown on a direct card', () => {
    expect(keysFor('sensor.temperature')).toEqual([]);
  });
});

describe('getCardEntityValue', () => {
  const field = (cardId: string, settings = {}) => getCardEntityFields(cardId, settings)[0];

  it('reads the saved value', () => {
    expect(getCardEntityValue(field('cover_card_1'), 'cover_card_1', { coverId: 'cover.a' })).toBe(
      'cover.a'
    );
  });

  it('falls back to a direct card id', () => {
    expect(getCardEntityValue(field('light.desk'), 'light.desk', {})).toBe('light.desk');
    expect(getCardEntityValue(field('fan_card_1'), 'fan_card_1', {})).toBeNull();
  });

  it('reads a lock from either key', () => {
    expect(getCardEntityValue(field('lock_card_1'), 'lock_card_1', { lockId: 'lock.a' })).toBe(
      'lock.a'
    );
  });
});
