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
    expect(result.current.isEditSensor).toBe(true);
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
