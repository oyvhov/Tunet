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
});
