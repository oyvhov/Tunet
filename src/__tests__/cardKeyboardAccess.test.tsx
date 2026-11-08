import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import FanCard from '../components/cards/FanCard';
import { renderAutomationCard } from '../rendering/cards/automationRenderer';
import { cardButtonProps } from '../utils/keyboard';

afterEach(cleanup);

describe('cardButtonProps', () => {
  const Harness = ({ editMode, onCard }: { editMode: boolean; onCard: () => void }) => (
    <div {...cardButtonProps(editMode, 'Stue')} onClick={onCard}>
      <button type="button">Inner</button>
    </div>
  );

  it('activates the card with Enter and Space through its click handler', () => {
    const onCard = vi.fn();
    render(<Harness editMode={false} onCard={onCard} />);
    const card = screen.getByRole('button', { name: 'Stue' });
    expect(card).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(onCard).toHaveBeenCalledTimes(2);
  });

  it('ignores keys pressed on a nested control', () => {
    const onCard = vi.fn();
    render(<Harness editMode={false} onCard={onCard} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Inner' }), { key: 'Enter' });
    expect(onCard).not.toHaveBeenCalled();
  });

  it('is out of the tab order and inert in edit mode', () => {
    const onCard = vi.fn();
    render(<Harness editMode onCard={onCard} />);
    const card = screen.getByRole('button', { name: 'Stue' });
    expect(card).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onCard).not.toHaveBeenCalled();
  });
});

describe('FanCard root', () => {
  const props = (overrides: Record<string, unknown> = {}) => {
    const entities = {
      'fan.stue': {
        entity_id: 'fan.stue',
        state: 'on',
        attributes: { friendly_name: 'Stue', supported_features: 63, percentage: 40 },
      },
    };
    return {
      fanId: 'fan.stue',
      entities,
      dragProps: {},
      controls: null,
      cardStyle: {},
      editMode: false,
      cardSettings: {},
      settingsKey: 'home::fan.stue',
      customNames: {},
      customIcons: {},
      getA: (id: string, attr: string, fallback: unknown = null) =>
        entities[id as 'fan.stue']?.attributes?.[attr as 'percentage'] ?? fallback,
      callService: vi.fn(async () => ({})),
      onOpen: vi.fn(),
      isMobile: false,
      t: (key: string) => key,
      ...overrides,
    } as unknown as ComponentProps<typeof FanCard>;
  };

  it('opens from the keyboard', () => {
    const cardProps = props();
    render(<FanCard {...cardProps} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Stue' }), { key: 'Enter' });
    expect(cardProps.onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('automation card root', () => {
  const ctx = (overrides: Record<string, unknown> = {}) => ({
    entities: { 'automation.lys': { state: 'on', attributes: {} } },
    editMode: false,
    customNames: {},
    customIcons: {},
    getA: () => 'Morgonlys',
    callService: vi.fn(),
    t: (key: string) => key,
    cardSettings: {},
    ...overrides,
  });

  it('toggles from the keyboard', () => {
    const context = ctx();
    render(renderAutomationCard('automation.lys', {}, () => null, {}, 'k', context));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Morgonlys' }), { key: ' ' });
    expect(context.callService).toHaveBeenCalledWith('automation', 'toggle', {
      entity_id: 'automation.lys',
    });
  });

  it('is not a button when it cannot be toggled', () => {
    render(
      renderAutomationCard(
        'automation.lys',
        {},
        () => null,
        {},
        'k',
        ctx({ entities: { 'automation.lys': { state: 'unavailable', attributes: {} } } })
      )
    );
    expect(screen.queryByRole('button', { name: 'Morgonlys' })).toBeNull();
  });
});
