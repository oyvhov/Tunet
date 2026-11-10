import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCardRendering } from '../hooks/useCardRendering';
import type { UseCardRenderingParams } from '../hooks/useCardRendering';

const setters = () => new Proxy({}, { get: () => vi.fn() });

const params = {
  editMode: false,
  pagesConfig: { home: ['light.a', 'light.b'] },
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
  getCardSettingsKey: (id: string) => `home::${id}`,
  entities: {},
  entitiesLoaded: true,
  conn: null,
  customNames: {},
  customIcons: {},
  getA: vi.fn(),
  getS: vi.fn(),
  getEntityImageUrl: vi.fn(),
  callService: vi.fn(),
  isMediaActive: () => false,
  saveCardSetting: vi.fn(),
  language: 'nn',
  isMobile: false,
  t: (key: string) => key,
  optimisticLightBrightness: {},
  setOptimisticLightBrightness: vi.fn(),
  tempHistoryById: {},
  forecastsById: {},
  entityModalActions: setters(),
  mediaModalActions: setters(),
  setActiveVacuumId: vi.fn(),
  setShowAlarmActionModal: vi.fn(),
  setShowEditCardModal: vi.fn(),
  setEditCardSettingsKey: vi.fn(),
  removeCard: vi.fn(),
  isCardRemovable: () => true,
} as unknown as UseCardRenderingParams;

const setup = () =>
  renderHook((props: UseCardRenderingParams) => useCardRendering(props), {
    initialProps: params,
  });

describe('useCardRendering grid layout', () => {
  it('keeps the layout when an update leaves the same cards visible', () => {
    const { result, rerender } = setup();
    const before = result.current.gridLayout;

    rerender({ ...params, isCardHiddenByLogic: () => false });

    expect(result.current.gridLayout).toBe(before);
  });

  it('rebuilds the layout when a card is hidden', () => {
    const { result, rerender } = setup();
    expect(Object.keys(result.current.gridLayout)).toEqual(['light.a', 'light.b']);

    rerender({ ...params, isCardHiddenByLogic: (id: string) => id === 'light.b' });

    expect(Object.keys(result.current.gridLayout)).toEqual(['light.a']);
  });

  it('pairs small cards on a phone while a large card keeps the whole row', () => {
    const { result, rerender } = setup();

    rerender({
      ...params,
      isMobile: true,
      gridColCount: 2,
      viewportWidth: 390,
      gridGapH: 12,
      pagesConfig: { home: ['light.big', 'light.s1', 'light.s2'] },
      cardSettings: { 'home::light.s1': { size: 'small' }, 'home::light.s2': { size: 'small' } },
    });

    const layout = result.current.gridLayout;
    expect(layout['light.big']).toMatchObject({ row: 1, col: 1, colSpan: 2 });
    expect(layout['light.s1']).toMatchObject({ row: 3, col: 1, colSpan: 1 });
    expect(layout['light.s2']).toMatchObject({ row: 3, col: 2, colSpan: 1 });
  });

  it('lays out nothing for an empty page', () => {
    const { result, rerender } = setup();

    rerender({ ...params, pagesConfig: { home: [] } });

    expect(result.current.gridLayout).toEqual({});
  });
});
