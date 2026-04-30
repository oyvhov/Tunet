import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LockCard from '../components/cards/LockCard';

const t = (key) =>
  ({
    'common.missing': 'Missing',
    'common.unknown': 'Unknown',
    'lock.action.confirmUnlock': 'Confirm unlock',
    'lock.action.lock': 'Lock',
    'lock.action.open': 'Open',
    'lock.action.unlock': 'Unlock',
    'lock.code.prompt': 'Enter lock code',
    'lock.state.locked': 'Locked',
    'lock.state.open': 'Open',
    'lock.state.opening': 'Opening',
    'lock.state.unlocked': 'Unlocked',
    'lock.state.unavailable': 'Unavailable',
  })[key] || key;

function baseProps(overrides = {}) {
  const callService = vi.fn();
  const onOpen = vi.fn();
  const props = {
    lockId: 'lock.front_door',
    dragProps: {},
    controls: null,
    cardStyle: {},
    entities: {
      'lock.front_door': {
        entity_id: 'lock.front_door',
        state: 'locked',
        attributes: { friendly_name: 'Front Door' },
      },
    },
    conn: {},
    editMode: false,
    cardSettings: {},
    settingsKey: 'lock.front_door',
    customNames: {},
    customIcons: {},
    getA: (id, attr, fallback) => props.entities[id]?.attributes?.[attr] ?? fallback,
    callService,
    onOpen,
    isMobile: false,
    t,
    ...overrides,
  };
  return { props, callService, onOpen };
}

describe('LockCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the lock name and state', () => {
    const { props } = baseProps();

    render(<LockCard {...props} />);

    expect(screen.getByText('Front Door')).toBeInTheDocument();
    expect(screen.getAllByText('Locked').length).toBeGreaterThan(0);
  });

  it('requires a second tap before unlocking a physical lock', () => {
    const { props, callService } = baseProps();

    render(<LockCard {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(callService).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm unlock' }));
    expect(callService).toHaveBeenCalledWith('lock', 'unlock', { entity_id: 'lock.front_door' });
  });

  it('locks an unlocked entity directly', () => {
    const { props, callService } = baseProps({
      entities: {
        'lock.front_door': {
          entity_id: 'lock.front_door',
          state: 'unlocked',
          attributes: { friendly_name: 'Front Door' },
        },
      },
    });

    render(<LockCard {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Lock' }));
    expect(callService).toHaveBeenCalledWith('lock', 'lock', { entity_id: 'lock.front_door' });
  });

  it('renders HA open states and allows locking an open lock', () => {
    const { props, callService } = baseProps({
      entities: {
        'lock.front_door': {
          entity_id: 'lock.front_door',
          state: 'open',
          attributes: { friendly_name: 'Front Door' },
        },
      },
    });

    render(<LockCard {...props} />);

    expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }));
    expect(callService).toHaveBeenCalledWith('lock', 'lock', { entity_id: 'lock.front_door' });
  });

  it('exposes the HA open service for locks with latch support', () => {
    const { props, callService } = baseProps({
      entities: {
        'lock.front_door': {
          entity_id: 'lock.front_door',
          state: 'unlocked',
          attributes: {
            friendly_name: 'Front Door',
            supported_features: 1,
          },
        },
      },
    });

    render(<LockCard {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(callService).toHaveBeenCalledWith('lock', 'open', { entity_id: 'lock.front_door' });
  });

  it('includes a user code when Home Assistant advertises a lock code format', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('2468');
    const { props, callService } = baseProps({
      entities: {
        'lock.front_door': {
          entity_id: 'lock.front_door',
          state: 'locked',
          attributes: {
            friendly_name: 'Front Door',
            code_format: '^\\d+$',
          },
        },
      },
    });

    render(<LockCard {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm unlock' }));
    expect(window.prompt).toHaveBeenCalledWith('Enter lock code');
    expect(callService).toHaveBeenCalledWith('lock', 'unlock', {
      entity_id: 'lock.front_door',
      code: '2468',
    });
  });

  it('does not call services without a Home Assistant connection', () => {
    const { props, callService } = baseProps({ conn: null });

    render(<LockCard {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(callService).not.toHaveBeenCalled();
  });
});
