import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/haClient', () => ({
  getAreas: vi.fn(),
  getEntitiesForArea: vi.fn(),
}));

import AddCardContent from '../modals/AddCardContent';
import { getAreas, getEntitiesForArea } from '../services/haClient';

const makeProps = (overrides = {}) => ({
  onClose: vi.fn(),
  addCardTargetPage: 'home',
  addCardType: 'light',
  setAddCardType: vi.fn(),
  searchTerm: '',
  setSearchTerm: vi.fn(),
  entities: {
    'sensor.cost_today': { attributes: { friendly_name: 'Cost today' } },
  },
  pagesConfig: { home: [], header: [], settings: [] },
  selectedEntities: [],
  setSelectedEntities: vi.fn(),
  onAddSelected: vi.fn(),
  getAddCardAvailableLabel: () => 'Available',
  getAddCardNoneLeftLabel: () => 'None left',
  t: (key) => key,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Add button for a type without picks', () => {
  it.each([
    ['todo', 'addCard.add addCard.type.todo'],
    ['car', 'addCard.add addCard.type.car'],
    ['spacer', 'addCard.add addCard.type.spacer'],
  ])('names %s and is enabled when nothing else is picked', (addCardType, label) => {
    const props = makeProps({ addCardType });
    render(<AddCardContent {...props} />);

    const submit = screen.getByTestId('add-card-submit');
    expect(submit).toBeEnabled();
    expect(submit).toHaveTextContent(label);

    fireEvent.click(submit);
    expect(props.onAddSelected).toHaveBeenCalledTimes(1);
  });

  it('counts the real picks instead of the visited type', () => {
    render(<AddCardContent {...makeProps({ addCardType: 'todo', pendingAddCount: 1 })} />);

    expect(screen.getByTestId('add-card-submit')).toHaveTextContent('addCard.add 1 addCard.cards');
  });

  it('does not ask before leaving a type that was only visited', async () => {
    const props = makeProps({ addCardType: 'todo' });
    render(<AddCardContent {...props} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
  });
});

describe('Add button for rooms', () => {
  const area = { area_id: 'kitchen', name: 'Kitchen' };
  const renderRooms = async () => {
    getAreas.mockResolvedValue([area]);
    render(<AddCardContent {...makeProps({ addCardType: 'room', conn: {} })} />);
    return screen.findByRole('button', { name: /Kitchen/ });
  };

  it('stays disabled until the room entities have loaded', async () => {
    let finish = () => {};
    getEntitiesForArea.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const room = await renderRooms();

    fireEvent.click(room);
    await waitFor(() => expect(getEntitiesForArea).toHaveBeenCalled());
    expect(screen.getByTestId('add-card-submit')).toBeDisabled();

    await act(async () => finish(['light.kitchen']));
    expect(screen.getByTestId('add-card-submit')).toBeEnabled();
  });

  it('drops the room again when its entities cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getEntitiesForArea.mockRejectedValue(new Error('offline'));
    const room = await renderRooms();

    fireEvent.click(room);

    await waitFor(() => expect(room).toHaveAttribute('aria-pressed', 'false'));
    expect(screen.getByTestId('add-card-submit')).toBeDisabled();
  });
});

describe('cost card picker', () => {
  const costProps = (overrides = {}) =>
    makeProps({
      addCardType: 'cost',
      costSelectionTarget: 'today',
      setCostSelectionTarget: vi.fn(),
      setSelectedCostTodayId: vi.fn(),
      setSelectedCostMonthId: vi.fn(),
      ...overrides,
    });

  it('moves on to Month after Today is picked', () => {
    const props = costProps();
    render(<AddCardContent {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Cost today/ }));

    expect(props.setSelectedCostTodayId).toHaveBeenCalledTimes(1);
    expect(props.setCostSelectionTarget).toHaveBeenCalledWith('month');
  });

  it('stays on Today when the pick is being cleared', () => {
    const props = costProps({ selectedCostTodayId: 'sensor.cost_today' });
    render(<AddCardContent {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Cost today/ }));

    expect(props.setCostSelectionTarget).not.toHaveBeenCalled();
  });
});
