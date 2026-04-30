import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleAddSelected } from '../services/cardActions';

function makeCtx(overrides = {}) {
  return {
    pagesConfig: { home: [] },
    persistConfig: vi.fn(),
    addCardTargetPage: 'home',
    addCardType: 'lock',
    selectedEntities: ['lock.front_door', 'sensor.temperature'],
    selectedWeatherId: null,
    selectedTempId: null,
    selectedAndroidTVMediaId: null,
    selectedAndroidTVRemoteId: null,
    selectedCostTodayId: null,
    selectedCostMonthId: null,
    selectedNordpoolId: null,
    nordpoolDecimals: 2,
    selectedSpacerVariant: 'divider',
    cardSettings: {},
    persistCardSettings: vi.fn(),
    hiddenCards: [],
    persistHiddenCards: vi.fn(),
    getCardSettingsKey: vi.fn((id) => id),
    setSelectedEntities: vi.fn(),
    setShowAddCardModal: vi.fn(),
    setSelectedWeatherId: vi.fn(),
    setSelectedTempId: vi.fn(),
    setSelectedAndroidTVMediaId: vi.fn(),
    setSelectedAndroidTVRemoteId: vi.fn(),
    setSelectedCostTodayId: vi.fn(),
    setSelectedCostMonthId: vi.fn(),
    setCostSelectionTarget: vi.fn(),
    setSelectedNordpoolId: vi.fn(),
    setNordpoolDecimals: vi.fn(),
    setShowEditCardModal: vi.fn(),
    setEditCardSettingsKey: vi.fn(),
    ...overrides,
  };
}

describe('handleAddSelected lock cards', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds only selected lock entities as composite lock cards', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const ctx = makeCtx();

    handleAddSelected(ctx);

    const cardId = 'lock_card_1234_i';
    expect(ctx.persistConfig).toHaveBeenCalledWith({ home: [cardId] });
    expect(ctx.persistCardSettings).toHaveBeenCalledWith({ [cardId]: { lockId: 'lock.front_door' } });
    expect(ctx.setSelectedEntities).toHaveBeenCalledWith([]);
    expect(ctx.setShowAddCardModal).toHaveBeenCalledWith(false);
  });

  it('does not add a card when no lock entity is selected', () => {
    const ctx = makeCtx({ selectedEntities: ['sensor.temperature'] });

    handleAddSelected(ctx);

    expect(ctx.persistConfig).not.toHaveBeenCalled();
  });

  it('unhides a direct lock entity when it is explicitly added again', () => {
    const ctx = makeCtx({
      addCardType: 'entity',
      selectedEntities: ['lock.front_door'],
      hiddenCards: ['lock.front_door', 'sensor.hidden'],
    });

    handleAddSelected(ctx);

    expect(ctx.persistConfig).toHaveBeenCalledWith({ home: ['lock.front_door'] });
    expect(ctx.persistHiddenCards).toHaveBeenCalledWith(['sensor.hidden']);
  });
});
