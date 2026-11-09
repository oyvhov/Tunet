import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PersonStatus from '../components/cards/PersonStatus';

const baseProps = {
  id: 'person.ola',
  entities: {
    'person.ola': {
      state: 'home',
      attributes: { friendly_name: 'Ola Nordmann' },
    },
  },
  editMode: false,
  customNames: {},
  customIcons: {},
  cardSettings: {},
  getCardSettingsKey: () => 'person.ola_header',
  getEntityImageUrl: () => '',
  getS: () => 'Heime',
  onOpenPerson: vi.fn(),
  onEditCard: vi.fn(),
  onRemoveCard: vi.fn(),
  t: (key) => key,
};

describe('PersonStatus edit controls', () => {
  it.each([['tooltip.editCard'], ['tooltip.removeCard']])('%s has a 44 px hit area', (name) => {
    render(<PersonStatus {...baseProps} editMode />);

    expect(screen.getByRole('button', { name })).toHaveClass('h-11', 'w-11');
  });

  it('removes only through the trash button', () => {
    const onRemoveCard = vi.fn();
    render(<PersonStatus {...baseProps} editMode onRemoveCard={onRemoveCard} />);

    fireEvent.click(screen.getByRole('button', { name: 'tooltip.removeCard' }));

    expect(onRemoveCard).toHaveBeenCalledWith('person.ola', 'header');
  });
});

describe('PersonStatus', () => {
  it('shows the configured person name and state on phones while preserving the desktop layout', () => {
    render(<PersonStatus {...baseProps} />);

    const name = screen.getByText('Ola Nordmann');
    expect(name.parentElement?.parentElement).toHaveClass('flex');
    expect(name).toHaveClass('truncate', 'text-xs', 'sm:text-sm');
    expect(screen.getByText('Heime')).toHaveClass('text-[10px]', 'sm:text-xs');
  });

  it('falls back to the initial when the photo cannot be loaded', () => {
    render(<PersonStatus {...baseProps} getEntityImageUrl={() => '/api/image/ola.jpg'} />);

    fireEvent.error(screen.getByRole('img', { name: 'Ola Nordmann' }));

    expect(screen.queryByRole('img', { name: 'Ola Nordmann' })).not.toBeInTheDocument();
    expect(screen.getByText('O')).toBeInTheDocument();
  });

  it('shows state by itself on mobile when the name is disabled', () => {
    render(
      <PersonStatus
        {...baseProps}
        cardSettings={{ person_ola_header: { showName: false, showState: true } }}
        getCardSettingsKey={() => 'person_ola_header'}
      />
    );

    expect(screen.queryByText('Ola Nordmann')).not.toBeInTheDocument();
    expect(screen.getByText('Heime').parentElement).toHaveClass('flex');
  });

  it('keeps state hidden when showState is disabled', () => {
    render(
      <PersonStatus
        {...baseProps}
        cardSettings={{ person_ola_header: { showName: true, showState: false } }}
        getCardSettingsKey={() => 'person_ola_header'}
      />
    );

    expect(screen.getByText('Ola Nordmann')).toBeInTheDocument();
    expect(screen.queryByText('Heime')).not.toBeInTheDocument();
  });
});
