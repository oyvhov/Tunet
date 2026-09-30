import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEditModalProps } from '../rendering/useEditModalProps';

const makeBase = (overrides = {}) => ({
  showEditCardModal: null,
  editCardSettingsKey: null,
  getCardSettingsKey: (id) => `settings::${id}`,
  cardSettings: {},
  entities: {},
  resolveCarSettings: (_id, settings = {}) => settings,
  ...overrides,
});

describe('useEditModalProps', () => {
  it('returns empty object when edit modal is closed', () => {
    const { result } = renderHook(() => useEditModalProps(makeBase()));
    expect(result.current).toEqual({});
  });

  it('derives icon/status capabilities and settings key for open entity modal', () => {
    const entityId = 'light.kitchen';
    const { result } = renderHook(() =>
      useEditModalProps(
        makeBase({
          showEditCardModal: entityId,
          cardSettings: {
            'settings::light.kitchen': { type: 'sensor' },
          },
          entities: {
            [entityId]: { entity_id: entityId, state: 'on' },
          },
        })
      )
    );

    expect(result.current.editSettingsKey).toBe('settings::light.kitchen');
    expect(result.current.canEditIcon).toBe(true);
    expect(result.current.canEditStatus).toBe(true);
    expect(result.current.isEditLight).toBe(true);
    expect(result.current.isEditSensor).toBe(false);
  });

  it('resolves sensor instances through their source entity while editing the instance', () => {
    const cardId = 'entity_card_1';
    const entityId = 'climate.living_room';
    const { result } = renderHook(() =>
      useEditModalProps(
        makeBase({
          showEditCardModal: cardId,
          editCardSettingsKey: `home::${cardId}`,
          cardSettings: { [`home::${cardId}`]: { type: 'sensor', entityId } },
          entities: { [entityId]: { entity_id: entityId, state: 'cool' } },
        })
      )
    );
    expect(result.current).toMatchObject({
      editSettingsKey: `home::${cardId}`,
      nameFallbackEntityId: entityId,
      isEditSensor: true,
      isEditClimate: false,
      canEditName: true,
      canEditIcon: true,
      canEditStatus: true,
      canEditMobileWidth: true,
    });
  });

  it('keeps sensor instance settings editable when its entity is missing', () => {
    const { result } = renderHook(() =>
      useEditModalProps(
        makeBase({
          showEditCardModal: 'entity_card_missing',
          cardSettings: {
            'settings::entity_card_missing': { type: 'sensor', entityId: 'sensor.missing' },
          },
        })
      )
    );
    expect(result.current.canEditIcon).toBe(true);
    expect(result.current.isEditSensor).toBe(true);
    expect(result.current.nameFallbackEntityId).toBe('sensor.missing');
  });

  it('uses an overridden source for an existing sensor card without changing its edit ID', () => {
    const { result } = renderHook(() =>
      useEditModalProps(
        makeBase({
          showEditCardModal: 'sensor.kitchen',
          editCardSettingsKey: 'home::sensor.kitchen',
          cardSettings: { 'home::sensor.kitchen': { type: 'sensor', entityId: 'sensor.hall' } },
          entities: { 'sensor.hall': { entity_id: 'sensor.hall', state: '20' } },
        })
      )
    );
    expect(result.current.nameFallbackEntityId).toBe('sensor.hall');
    expect(result.current.editSettingsKey).toBe('home::sensor.kitchen');
    expect(result.current.canEditIcon).toBe(true);
    expect(result.current.canEditStatus).toBe(true);
  });

  it.each([
    'light.hall',
    'lock.front_door',
    'vacuum.robot',
    'lawn_mower.robot',
    'fan.bedroom',
    'media_player.tv',
  ])('keeps specialized legacy editor controls for %s with sensor type', (cardId) => {
    const { result } = renderHook(() =>
      useEditModalProps(
        makeBase({
          showEditCardModal: cardId,
          cardSettings: { [`settings::${cardId}`]: { type: 'sensor' } },
          entities: { [cardId]: { entity_id: cardId, state: 'on' } },
        })
      )
    );
    expect(result.current.isEditSensor).toBe(false);
    expect(result.current.canEditName).toBe(true);
    expect(result.current.canEditIcon).toBe(true);
  });

  it('derives edit capabilities for composite lock cards', () => {
    const { result } = renderHook(() =>
      useEditModalProps(
        makeBase({
          showEditCardModal: 'lock_card_1',
          cardSettings: {
            'settings::lock_card_1': { lockId: 'lock.front_door' },
          },
          entities: {
            'lock.front_door': { entity_id: 'lock.front_door', state: 'locked' },
          },
        })
      )
    );

    expect(result.current.editSettingsKey).toBe('settings::lock_card_1');
    expect(result.current.canEditIcon).toBe(true);
    expect(result.current.isEditLock).toBe(true);
    expect(result.current.nameFallbackEntityId).toBe('lock.front_door');
  });

  it('uses the mapped cover entity as the fallback name source', () => {
    const { result } = renderHook(() =>
      useEditModalProps(
        makeBase({
          showEditCardModal: 'cover_card_1',
          cardSettings: {
            'settings::cover_card_1': { coverId: 'cover.front_door' },
          },
          entities: {
            'cover.front_door': {
              entity_id: 'cover.front_door',
              state: 'closed',
              attributes: { friendly_name: 'Door' },
            },
          },
        })
      )
    );

    expect(result.current.nameFallbackEntityId).toBe('cover.front_door');
  });

  it('identifies climate cards and uses their mapped entity as the name source', () => {
    const { result } = renderHook(() =>
      useEditModalProps(
        makeBase({
          showEditCardModal: 'climate_card_1',
          cardSettings: {
            'settings::climate_card_1': { climateId: 'climate.living_room' },
          },
        })
      )
    );

    expect(result.current.isEditClimate).toBe(true);
    expect(result.current.nameFallbackEntityId).toBe('climate.living_room');
  });

  it('identifies apple tv cards and uses their mapped entity as the name source', () => {
    const { result } = renderHook(() =>
      useEditModalProps(
        makeBase({
          showEditCardModal: 'appletv_card_1',
          cardSettings: {
            'settings::appletv_card_1': { mediaPlayerId: 'media_player.apple_tv' },
          },
        })
      )
    );

    expect(result.current.isEditAppleTV).toBe(true);
    expect(result.current.nameFallbackEntityId).toBe('media_player.apple_tv');
    expect(result.current.canEditIcon).toBe(false);
  });

  it.each([
    'weather_temp_home',
    'cost_card_home',
    'nordpool_card_home',
    'climate_card_living_room',
    'media_player.living_room',
    'media_group_downstairs',
  ])('allows mobile width control for %s', (cardId) => {
    const { result } = renderHook(() => useEditModalProps(makeBase({ showEditCardModal: cardId })));

    expect(result.current.canEditMobileWidth).toBe(true);
  });
});
