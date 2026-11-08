import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCardRendering } from '../hooks/useCardRendering';

const entity = {
  entity_id: 'light.kjokken',
  state: 'on',
  attributes: { friendly_name: 'Kjokken', brightness: 128, supported_color_modes: ['brightness'] },
};
const setters = () => new Proxy({}, { get: () => vi.fn() });

function setup(editMode) {
  const callService = vi.fn(async () => ({}));
  const { result } = renderHook(() =>
    useCardRendering({
      editMode,
      pagesConfig: { home: ['light.kjokken'] },
      setPagesConfig: vi.fn(),
      persistConfig: vi.fn(),
      activePage: 'home',
      setActivePage: vi.fn(),
      hiddenCards: [],
      isCardHiddenByLogic: () => false,
      gridColCount: 4,
      viewportWidth: 1280,
      gridGapH: 20,
      gridGapV: 20,
      cardSettings: {},
      getCardSettingsKey: (id) => `home::${id}`,
      entities: { 'light.kjokken': entity },
      entitiesLoaded: true,
      conn: {},
      customNames: {},
      customIcons: {},
      getA: (id, attr, fallback = null) => entity.attributes[attr] ?? fallback,
      getS: () => 'on',
      getEntityImageUrl: (url) => url,
      callService,
      isMediaActive: () => false,
      saveCardSetting: vi.fn(),
      language: 'nn',
      isMobile: false,
      t: (key) => key,
      optimisticLightBrightness: {},
      setOptimisticLightBrightness: vi.fn(),
      tempHistoryById: {},
      forecastsById: {},
      entityModalActions: setters(),
      mediaModalActions: setters(),
      setActiveVacuumId: vi.fn(),
      setActiveMowerId: vi.fn(),
      setShowAlarmActionModal: vi.fn(),
      setShowEditCardModal: vi.fn(),
      setEditCardSettingsKey: vi.fn(),
      removeCard: vi.fn(),
      isCardRemovable: () => true,
    })
  );
  render(result.current.renderCard('light.kjokken', 0));
  return { callService };
}

describe('useCardRendering in edit mode', () => {
  it('does not let a card control the house while it is being edited', () => {
    const { callService } = setup(true);
    fireEvent.click(screen.getByRole('button', { name: 'Kjokken: common.off' }));
    expect(callService).not.toHaveBeenCalled();
  });

  it('controls the house outside edit mode', () => {
    const { callService } = setup(false);
    fireEvent.click(screen.getByRole('button', { name: 'Kjokken: common.off' }));
    expect(callService).toHaveBeenCalledWith('light', 'toggle', { entity_id: 'light.kjokken' });
  });
});
