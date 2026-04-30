import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderLockCard } from '../rendering/cards/lockRenderer';

const t =
  (overrides = {}) =>
  (key) =>
    ({
      'common.missingEntity': 'Missing entity',
      'common.missingEntityId': 'Entity ID',
      'common.unknown': 'Unknown',
      'lock.state.locked': 'Locked',
      ...overrides,
    })[key] || key;

function makeCtx(overrides = {}) {
  return {
    entities: {},
    conn: {},
    editMode: false,
    cardSettings: {},
    customNames: {},
    customIcons: {},
    getA: (id, attr, fallback) => overrides.entities?.[id]?.attributes?.[attr] ?? fallback,
    callService: vi.fn(),
    setShowSensorInfoModal: vi.fn(),
    isMobile: false,
    t: t(),
    ...overrides,
  };
}

describe('renderLockCard', () => {
  it('renders a visible placeholder instead of disappearing when the lock entity is missing', () => {
    render(
      renderLockCard('lock.front_door', {}, vi.fn(() => null), {}, 'home::lock.front_door', makeCtx())
    );

    expect(screen.getByText('Missing entity')).toBeInTheDocument();
    expect(screen.getByText('lock.front_door')).toBeInTheDocument();
  });

  it('resolves composite lock cards through their stored lock entity id', () => {
    render(
      renderLockCard(
        'lock_card_1',
        {},
        vi.fn(() => null),
        {},
        'home::lock_card_1',
        makeCtx({
          entities: {
            'lock.front_door': {
              entity_id: 'lock.front_door',
              state: 'locked',
              attributes: { friendly_name: 'Front Door' },
            },
          },
          cardSettings: {
            'home::lock_card_1': { lockId: 'lock.front_door' },
          },
        })
      )
    );

    expect(screen.getByText('Front Door')).toBeInTheDocument();
    expect(screen.getAllByText('Locked').length).toBeGreaterThan(0);
  });
});