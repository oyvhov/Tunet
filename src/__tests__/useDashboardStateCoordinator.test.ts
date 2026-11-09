import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboardStateCoordinator } from '../hooks/useDashboardStateCoordinator';
import type { DashboardStateCoordinatorDeps } from '../hooks/useDashboardStateCoordinator';

const noop = vi.fn();
const entityModalActions = new Proxy(
  {},
  { get: () => noop }
) as DashboardStateCoordinatorDeps['entityModalActions'];
const mediaModalActions = new Proxy(
  {},
  { get: () => noop }
) as DashboardStateCoordinatorDeps['mediaModalActions'];
const managementModalActions = new Proxy(
  {},
  { get: () => noop }
) as DashboardStateCoordinatorDeps['managementModalActions'];

const light = (state: string) => ({
  entity_id: 'light.a',
  state,
  attributes: {},
});
const update = (state: string) => ({
  entity_id: 'update.core',
  state,
  attributes: {},
});

const t = (key: string) => key;
const baseDeps: DashboardStateCoordinatorDeps = {
  entities: { 'light.a': light('on'), 'update.core': update('on') },
  pagesConfig: { pages: ['home', 'stue'] },
  pageSettings: { stue: { type: 'media' } },
  activePage: 'home',
  setActivePage: noop,
  cardSettings: {},
  hasOpenModal: () => false,
  closeAllModals: noop,
  editingPage: null,
  setEditingPage: noop,
  editMode: false,
  setEditMode: noop,
  setActiveVacuumId: noop,
  setEditCardSettingsKey: noop,
  entityModalActions,
  mediaModalActions,
  managementModalActions,
  t,
};

const setup = () =>
  renderHook((deps: DashboardStateCoordinatorDeps) => useDashboardStateCoordinator(deps), {
    initialProps: baseDeps,
  });

describe('useDashboardStateCoordinator identity', () => {
  it('keeps every helper when nothing it reads has changed', () => {
    const { result, rerender } = setup();
    const before = result.current;

    rerender({ ...baseDeps });

    expect(result.current.getCardSettingsKey).toBe(before.getCardSettingsKey);
    expect(result.current.isCardRemovable).toBe(before.isCardRemovable);
    expect(result.current.isCardHiddenByLogic).toBe(before.isCardHiddenByLogic);
    expect(result.current.isMediaPage).toBe(before.isMediaPage);
    expect(result.current.isSonosPage).toBe(before.isSonosPage);
    expect(result.current.isLightsPage).toBe(before.isLightsPage);
    expect(result.current.isBatteryPage).toBe(before.isBatteryPage);
    expect(result.current.isRoomExplorerPage).toBe(before.isRoomExplorerPage);
    expect(result.current.pageDefaults).toBe(before.pageDefaults);
    expect(result.current.pages).toBe(before.pages);
  });

  it('keeps the page and removal helpers through an entity update', () => {
    const { result, rerender } = setup();
    const before = result.current;

    rerender({ ...baseDeps, entities: { ...baseDeps.entities, 'light.a': light('off') } });

    expect(result.current.isCardRemovable).toBe(before.isCardRemovable);
    expect(result.current.isMediaPage).toBe(before.isMediaPage);
    expect(result.current.pages).toBe(before.pages);
  });

  it('sees new entities through a new isCardHiddenByLogic', () => {
    const { result, rerender } = setup();
    expect(result.current.isCardHiddenByLogic('sensor.b')).toBe(true);
    const before = result.current.isCardHiddenByLogic;

    rerender({
      ...baseDeps,
      entities: {
        ...baseDeps.entities,
        'sensor.b': { entity_id: 'sensor.b', state: '1', attributes: {} },
      },
    });

    expect(result.current.isCardHiddenByLogic).not.toBe(before);
    expect(result.current.isCardHiddenByLogic('sensor.b')).toBe(false);
  });

  it('builds settings keys for the current page', () => {
    const { result, rerender } = setup();
    expect(result.current.getCardSettingsKey('light.a')).toBe('home::light.a');

    rerender({ ...baseDeps, activePage: 'stue' });

    expect(result.current.getCardSettingsKey('light.a')).toBe('stue::light.a');
  });

  it('follows page settings and translations', () => {
    const { result, rerender } = setup();
    expect(result.current.isMediaPage('stue')).toBe(true);
    expect(result.current.pages[0].label).toBe('page.home');

    rerender({
      ...baseDeps,
      pageSettings: {},
      t: (key: string) => `nn:${key}`,
    });

    expect(result.current.isMediaPage('stue')).toBe(false);
    expect(result.current.pages[0].label).toBe('nn:page.home');
  });

  it('recounts available updates when entities change', () => {
    const { result, rerender } = setup();
    expect(result.current.updateCount).toBe(1);

    rerender({
      ...baseDeps,
      entities: { 'light.a': light('on'), 'update.core': update('off') },
    });

    expect(result.current.updateCount).toBe(0);
  });
});
