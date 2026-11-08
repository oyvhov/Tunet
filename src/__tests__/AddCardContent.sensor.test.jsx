import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddCardContent from '../modals/AddCardContent';
import { getAreas, getEntitiesForArea } from '../services/haClient';

vi.mock('../services/haClient', () => ({
  getAreas: vi.fn(),
  getEntitiesForArea: vi.fn(),
}));

function makeProps(overrides = {}) {
  return {
    onClose: vi.fn(),
    addCardTargetPage: 'home',
    addCardType: 'sensor',
    setAddCardType: vi.fn(),
    searchTerm: '',
    setSearchTerm: vi.fn(),
    entities: {
      'scene.night': { attributes: { friendly_name: 'Night lights' } },
      'climate.aircondition': { attributes: { friendly_name: 'Aircondition' } },
      'light.hall': { attributes: { friendly_name: 'Hall light' } },
      'button.restart': { attributes: { friendly_name: 'Restart' } },
      'input_button.goodnight': { attributes: { friendly_name: 'Good night' } },
      'person.owner': { attributes: { friendly_name: 'Owner' } },
    },
    pagesConfig: { home: ['scene.night', 'climate.aircondition'], header: [], settings: [] },
    selectedEntities: [],
    setSelectedEntities: vi.fn(),
    onAddSelected: vi.fn(),
    getAddCardAvailableLabel: () => 'Available',
    getAddCardNoneLeftLabel: () => 'None left',
    t: (key) => key,
    ...overrides,
  };
}

describe('sensor card entity picker', () => {
  it('allows reusing an existing scene and includes climate, lights and HA buttons', () => {
    render(<AddCardContent {...makeProps()} />);
    for (const name of ['Night lights', 'Aircondition', 'Hall light', 'Restart', 'Good night']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /Owner/ })).not.toBeInTheDocument();
  });

  it('preserves duplicate filtering in the legacy entity picker', () => {
    render(<AddCardContent {...makeProps({ addCardType: 'entity' })} />);
    expect(screen.queryByRole('button', { name: /Night lights/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aircondition/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hall light/ })).toBeInTheDocument();
  });

  it('preserves the person-only header picker', () => {
    render(<AddCardContent {...makeProps({ addCardTargetPage: 'header' })} />);
    expect(screen.getByRole('button', { name: /Owner/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Night lights/ })).not.toBeInTheDocument();
  });
});

describe('leaving the add card popup', () => {
  it('closes at once when nothing is picked', async () => {
    const props = makeProps();
    render(<AddCardContent {...props} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('confirm.discardPicks.title')).not.toBeInTheDocument();
  });

  it('asks before a backdrop tap discards picks', async () => {
    const props = makeProps({ pendingAddCount: 2 });
    render(<AddCardContent {...props} />);

    const overlay = screen.getByRole('dialog').parentElement;
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);

    expect(await screen.findByText('confirm.discardPicks.title')).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'common.discard' }));
    });
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
  });
});

describe('add card footer', () => {
  it('has Cancel and a disabled Add when nothing is picked, and no OK button', () => {
    render(<AddCardContent {...makeProps()} />);
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeInTheDocument();
    expect(screen.getByTestId('add-card-submit')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
  });

  it('shows the number of cards picked across types', () => {
    render(<AddCardContent {...makeProps({ pendingAddCount: 3 })} />);
    const submit = screen.getByTestId('add-card-submit');
    expect(submit).toBeEnabled();
    expect(submit).toHaveTextContent('addCard.add 3 addCard.cards');
  });

  it('marks the active card type and picked rows as pressed', () => {
    render(
      <AddCardContent {...makeProps({ addCardType: 'light', selectedEntities: ['light.hall'] })} />
    );
    expect(screen.getByRole('button', { name: /addCard.type.light/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /addCard.type.sensor/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: /Hall light/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});

const makeAddingProps = (overrides = {}) => ({
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
    const props = makeAddingProps({ addCardType });
    render(<AddCardContent {...props} />);

    const submit = screen.getByTestId('add-card-submit');
    expect(submit).toBeEnabled();
    expect(submit).toHaveTextContent(label);

    fireEvent.click(submit);
    expect(props.onAddSelected).toHaveBeenCalledTimes(1);
  });

  it('counts the real picks instead of the visited type', () => {
    render(<AddCardContent {...makeAddingProps({ addCardType: 'todo', pendingAddCount: 1 })} />);

    expect(screen.getByTestId('add-card-submit')).toHaveTextContent('addCard.add 1 addCard.cards');
  });

  it('does not ask before leaving a type that was only visited', async () => {
    const props = makeAddingProps({ addCardType: 'todo' });
    render(<AddCardContent {...props} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
  });
});

describe('Add button for rooms', () => {
  const area = { area_id: 'kitchen', name: 'Kitchen' };
  const renderRooms = async () => {
    getAreas.mockResolvedValue([area]);
    render(<AddCardContent {...makeAddingProps({ addCardType: 'room', conn: {} })} />);
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
    makeAddingProps({
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

  it('asks before losing a lone Today pick', async () => {
    const props = costProps({ selectedCostTodayId: 'sensor.cost_today' });
    render(<AddCardContent {...props} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(await screen.findByText('confirm.discardPicks.title')).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('stays on Today when the pick is being cleared', () => {
    const props = costProps({ selectedCostTodayId: 'sensor.cost_today' });
    render(<AddCardContent {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Cost today/ }));

    expect(props.setCostSelectionTarget).not.toHaveBeenCalled();
  });
});
