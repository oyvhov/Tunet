import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAddCard } from '../hooks/useAddCard';

// Mock the service dependency
vi.mock('../services', () => ({
  handleAddSelected: vi.fn(),
}));

import { handleAddSelected } from '../services';

// ── Helpers ──────────────────────────────────────────────────────────────
const t = (key) => {
  const map = {
    'addCard.available.people': 'Available people',
    'addCard.available.allEntities': 'All entities',
    'addCard.available.vacuums': 'Vacuums',
    'addCard.available.climates': 'Climate devices',
    'addCard.available.costs': 'Cost sensors',
    'addCard.available.players': 'Media players',
    'addCard.available.cars': 'Cars',
    'addCard.available.sensors': 'Available sensors',
    'addCard.available.toggles': 'Toggles',
    'addCard.available.entities': 'Entities',
    'addCard.available.lights': 'Lights',
    'addCard.noneLeft': 'No more {item} to add',
    'addCard.item.people': 'people',
    'addCard.item.entities': 'entities',
    'addCard.item.vacuums': 'vacuums',
    'addCard.item.climates': 'climates',
    'addCard.item.costs': 'costs',
    'addCard.item.players': 'players',
    'addCard.item.cars': 'cars',
    'addCard.item.sensors': 'sensors',
    'addCard.item.toggles': 'toggles',
    'addCard.item.lights': 'lights',
  };
  return map[key] ?? key;
};

const makeProps = (overrides = {}) => ({
  showAddCardModal: false,
  activePage: 'home',
  isMediaPage: (id) => id === 'media',
  pagesConfig: { pages: ['home'], home: [] },
  persistConfig: vi.fn(),
  cardSettings: {},
  persistCardSettings: vi.fn(),
  getCardSettingsKey: vi.fn((id) => `settings_${id}`),
  saveCardSetting: vi.fn(),
  setShowAddCardModal: vi.fn(),
  setShowEditCardModal: vi.fn(),
  setEditCardSettingsKey: vi.fn(),
  t,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════
// Initial state & resets
// ═════════════════════════════════════════════════════════════════════════
describe('useAddCard › initial state', () => {
  it('starts with default values', () => {
    const { result } = renderHook(() => useAddCard(makeProps()));
    expect(result.current.addCardType).toBe('sensor');
    expect(result.current.searchTerm).toBe('');
    expect(result.current.selectedEntities).toEqual([]);
    expect(result.current.nordpoolDecimals).toBe(2);
  });
});

describe('useAddCard › modal open resets', () => {
  it('clears selections when modal opens', () => {
    const props = makeProps({ showAddCardModal: false });
    const { result, rerender } = renderHook((p) => useAddCard(p), {
      initialProps: props,
    });

    // simulate selecting entities while closed
    act(() => result.current.setSelectedEntities(['sensor.a']));
    act(() => result.current.setSelectedWeatherId('weather.home'));
    expect(result.current.selectedEntities).toEqual(['sensor.a']);

    // open modal
    rerender({ ...props, showAddCardModal: true });
    expect(result.current.selectedEntities).toEqual([]);
    expect(result.current.selectedWeatherId).toBeNull();
  });

  it('clears searchTerm when modal closes', () => {
    const props = makeProps({ showAddCardModal: true });
    const { result, rerender } = renderHook((p) => useAddCard(p), {
      initialProps: props,
    });

    act(() => result.current.setSearchTerm('light'));
    expect(result.current.searchTerm).toBe('light');

    rerender({ ...props, showAddCardModal: false });
    expect(result.current.searchTerm).toBe('');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Type inference from target page
// ═════════════════════════════════════════════════════════════════════════
describe('useAddCard › type inference', () => {
  it('sets type to "entity" for media pages', () => {
    const { result } = renderHook(() =>
      useAddCard(makeProps({ showAddCardModal: true, activePage: 'media' })),
    );
    expect(result.current.addCardType).toBe('entity');
  });

  it('sets type to "entity" for header target', () => {
    const props = makeProps({ showAddCardModal: true });
    const { result } = renderHook(() => useAddCard(props));

    act(() => result.current.setAddCardTargetPage('header'));
    expect(result.current.addCardType).toBe('entity');
  });

  it('sets type to "sensor" for normal pages', () => {
    const { result } = renderHook(() =>
      useAddCard(makeProps({ showAddCardModal: true, activePage: 'home' })),
    );
    expect(result.current.addCardType).toBe('sensor');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Label generators
// ═════════════════════════════════════════════════════════════════════════
describe('useAddCard › labels', () => {
  it('getAddCardAvailableLabel returns correct label for header', () => {
    const props = makeProps({ showAddCardModal: true });
    const { result } = renderHook(() => useAddCard(props));

    act(() => result.current.setAddCardTargetPage('header'));
    expect(result.current.getAddCardAvailableLabel()).toBe('Available people');
  });

  it('getAddCardAvailableLabel returns sensors for default sensor type', () => {
    const { result } = renderHook(() =>
      useAddCard(makeProps({ showAddCardModal: true })),
    );
    expect(result.current.getAddCardAvailableLabel()).toBe('Available sensors');
  });

  it('getAddCardAvailableLabel returns correct label for vacuum type', () => {
    const { result } = renderHook(() =>
      useAddCard(makeProps({ showAddCardModal: true })),
    );
    act(() => result.current.setAddCardType('vacuum'));
    expect(result.current.getAddCardAvailableLabel()).toBe('Vacuums');
  });

  it('getAddCardNoneLeftLabel includes the item type', () => {
    const { result } = renderHook(() =>
      useAddCard(makeProps({ showAddCardModal: true })),
    );
    act(() => result.current.setAddCardType('climate'));
    expect(result.current.getAddCardNoneLeftLabel()).toBe('No more climates to add');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Submit handler
// ═════════════════════════════════════════════════════════════════════════
describe('useAddCard › onAddSelected', () => {
  it('calls handleAddSelected with all selection state', () => {
    const props = makeProps({ showAddCardModal: true });
    const { result } = renderHook(() => useAddCard(props));

    act(() => result.current.onAddSelected());

    expect(handleAddSelected).toHaveBeenCalledTimes(1);
    expect(handleAddSelected).toHaveBeenCalledWith(
      expect.objectContaining({
        pagesConfig: props.pagesConfig,
        persistConfig: props.persistConfig,
        addCardTargetPage: expect.any(String),
        addCardType: expect.any(String),
        selectedEntities: [],
      }),
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Setters work correctly
// ═════════════════════════════════════════════════════════════════════════
describe('useAddCard › setters', () => {
  it('setSelectedNordpoolId updates state', () => {
    const { result } = renderHook(() => useAddCard(makeProps()));
    act(() => result.current.setSelectedNordpoolId('sensor.nordpool'));
    expect(result.current.selectedNordpoolId).toBe('sensor.nordpool');
  });

  it('setNordpoolDecimals updates state', () => {
    const { result } = renderHook(() => useAddCard(makeProps()));
    act(() => result.current.setNordpoolDecimals(3));
    expect(result.current.nordpoolDecimals).toBe(3);
  });

  it('setCostSelectionTarget updates state', () => {
    const { result } = renderHook(() => useAddCard(makeProps()));
    act(() => result.current.setCostSelectionTarget('month'));
    expect(result.current.costSelectionTarget).toBe('month');
  });
});
