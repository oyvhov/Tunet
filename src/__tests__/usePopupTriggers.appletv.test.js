import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePopupTriggers } from '../hooks/usePopupTriggers';

describe('Apple TV card popup triggers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T20:00:00Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('opens the Apple TV popup with the card id when its rule becomes true', () => {
    const cardId = 'appletv_card_1';
    const modalActions = { closeAllModals: vi.fn(), setShowAppleTVModal: vi.fn() };
    const hook = renderHook(
      ({ state }) =>
        usePopupTriggers({
          entities: { 'media_player.tv': { entity_id: 'media_player.tv', state } },
          entitiesLoaded: true,
          pagesConfig: { home: [cardId] },
          activePage: 'home',
          cardSettings: {
            [`home::${cardId}`]: {
              mediaPlayerId: 'media_player.tv',
              popupTrigger: { enabled: true, condition: { type: 'state', states: ['playing'] } },
            },
          },
          getCardSettingsKey: (id, page) => `${page}::${id}`,
          editMode: false,
          modalActions,
        }),
      { initialProps: { state: 'idle' } }
    );
    act(() => vi.advanceTimersByTime(15001));
    hook.rerender({ state: 'playing' });

    expect(modalActions.closeAllModals).toHaveBeenCalledOnce();
    expect(modalActions.setShowAppleTVModal).toHaveBeenCalledWith(cardId);
  });
});
