import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePopupTriggers } from '../hooks/usePopupTriggers';

describe('sensor card popup triggers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T20:00:00Z'));
  });

  afterEach(() => vi.useRealTimers());

  function renderTrigger({ cardId, entityId, mapped = false, editMode = false }) {
    const modalActions = { closeAllModals: vi.fn(), setShowSensorInfoModal: vi.fn() };
    const settings = {
      type: 'sensor',
      ...(mapped ? { entityId } : {}),
      popupTrigger: { enabled: true, condition: { type: 'state', states: ['on'] } },
    };
    const hook = renderHook(
      ({ state }) =>
        usePopupTriggers({
          entities: { [entityId]: { entity_id: entityId, state } },
          entitiesLoaded: true,
          pagesConfig: { home: [cardId] },
          activePage: 'home',
          cardSettings: { [`home::${cardId}`]: settings },
          getCardSettingsKey: (id, page) => `${page}::${id}`,
          editMode,
          modalActions,
        }),
      { initialProps: { state: 'off' } }
    );
    act(() => vi.advanceTimersByTime(15001));
    hook.rerender({ state: 'on' });
    return modalActions;
  }

  it('opens the mapped entity with its instance identity when a condition becomes true', () => {
    const actions = renderTrigger({
      cardId: 'entity_card_1',
      entityId: 'switch.hall',
      mapped: true,
    });
    expect(actions.closeAllModals).toHaveBeenCalledOnce();
    expect(actions.setShowSensorInfoModal).toHaveBeenCalledWith({
      entityId: 'switch.hall',
      cardId: 'entity_card_1',
    });
  });

  it('preserves legacy string payloads for existing direct entity cards', () => {
    const actions = renderTrigger({ cardId: 'switch.hall', entityId: 'switch.hall' });
    expect(actions.setShowSensorInfoModal).toHaveBeenCalledWith('switch.hall');
  });

  it('opens an overridden source with the existing card name identity', () => {
    const actions = renderTrigger({
      cardId: 'sensor.old',
      entityId: 'binary_sensor.door',
      mapped: true,
    });
    expect(actions.setShowSensorInfoModal).toHaveBeenCalledWith({
      entityId: 'binary_sensor.door',
      cardId: 'sensor.old',
    });
  });

  it('does not open sensor card popups while editing', () => {
    const actions = renderTrigger({
      cardId: 'entity_card_1',
      entityId: 'switch.hall',
      mapped: true,
      editMode: true,
    });
    expect(actions.closeAllModals).not.toHaveBeenCalled();
    expect(actions.setShowSensorInfoModal).not.toHaveBeenCalled();
  });
});
