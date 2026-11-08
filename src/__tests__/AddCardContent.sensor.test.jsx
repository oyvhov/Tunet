import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddCardContent from '../modals/AddCardContent';

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
