import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderAutomationCard } from '../rendering/cards/automationRenderer';

const cardStyle = { borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' };

const renderCard = (state: string) =>
  render(
    renderAutomationCard('automation.lys', {}, () => null, cardStyle, 'k', {
      entities: { 'automation.lys': { state, attributes: {} } },
      editMode: false,
      customNames: {},
      customIcons: {},
      getA: () => 'Morgonlys',
      callService: vi.fn(),
      t: (key: string) => key,
      cardSettings: {},
    })
  );

describe('automation card', () => {
  it.each(['on', 'off'])('has the border of every other card when %s', (state) => {
    renderCard(state);
    expect(screen.getByRole('button', { name: 'Morgonlys' }).style.borderColor).toBe(
      'var(--card-border)'
    );
  });

  it('has the background of every other card when off', () => {
    renderCard('off');
    expect(screen.getByRole('button', { name: 'Morgonlys' }).style.backgroundColor).toBe(
      'var(--card-bg)'
    );
  });
});
