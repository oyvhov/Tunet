import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
