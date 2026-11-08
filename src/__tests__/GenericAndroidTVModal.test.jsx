import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GenericAndroidTVModal from '../modals/GenericAndroidTVModal';

vi.mock('../components/ui/AccessibleModalShell', () => ({
  useModalShell: () => null,
  default: ({ open, children, size }) =>
    open ? (
      <div data-testid="tv-modal-shell" data-size={size}>
        {children()}
      </div>
    ) : null,
}));

const props = {
  show: true,
  onClose: vi.fn(),
  entities: {
    'media_player.living_room_tv': {
      entity_id: 'media_player.living_room_tv',
      state: 'playing',
      attributes: { friendly_name: 'Living room TV' },
    },
  },
  mediaPlayerId: 'media_player.living_room_tv',
  remoteId: 'remote.living_room_tv',
  linkedMediaPlayers: [],
  callService: vi.fn(),
  getA: vi.fn((_entityId, _attribute, fallback) => fallback),
  getEntityImageUrl: vi.fn(() => null),
  customNames: {},
  t: (key) =>
    ({
      'common.close': 'Close',
      'status.statusLabel': 'Status',
      'media.homeScreen': 'Home screen',
      'media.noneMedia': 'No media',
      'shield.back': 'Back',
      'shield.home': 'Home',
      'shield.turnOff': 'Turn off',
      'shield.turnOn': 'Turn on',
      'state.playing': 'Playing',
      'remote.up': 'Up',
      'remote.select': 'Select',
    })[key] || key,
};

describe('GenericAndroidTVModal mobile layout', () => {
  it('uses the shared two-column popup and keeps compact remote sizing', () => {
    render(<GenericAndroidTVModal {...props} />);

    expect(screen.getByTestId('tv-modal-shell').dataset.size).toBe('l');
    expect(screen.getByRole('heading', { name: 'Living room TV' })).toBeInTheDocument();
    expect(screen.getByText('Playing')).toBeInTheDocument();
    expect(screen.queryByText(/Status:/)).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Up' })).toHaveClass(
      'h-11',
      'w-11',
      'sm:h-14',
      'sm:w-14'
    );
    expect(screen.getByRole('button', { name: 'Select' })).toHaveClass(
      'h-10',
      'w-10',
      'sm:h-12',
      'sm:w-12'
    );
  });
});

const tv = (state, attributes = {}) => ({
  'media_player.living_room_tv': {
    entity_id: 'media_player.living_room_tv',
    state,
    attributes: { friendly_name: 'Living room TV', ...attributes },
  },
});

const renderTv = (overrides = {}) => {
  const callService = vi.fn();
  render(<GenericAndroidTVModal {...props} callService={callService} {...overrides} />);
  return callService;
};

describe('GenericAndroidTVModal controls', () => {
  it('keeps volume, mute and power when the card has no remote', () => {
    const callService = renderTv({ remoteId: null, entities: tv('idle') });

    expect(screen.queryByRole('button', { name: 'Up' })).not.toBeInTheDocument();
    expect(screen.queryByText('Back')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'media.volume.up' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_up', {
      entity_id: 'media_player.living_room_tv',
    });
    fireEvent.click(screen.getByRole('button', { name: 'media.volume.mute' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_mute', {
      entity_id: 'media_player.living_room_tv',
      is_volume_muted: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_off', {
      entity_id: 'media_player.living_room_tv',
    });
  });

  it('launches an app from the source list', () => {
    const callService = renderTv({ entities: tv('idle', { source_list: ['Netflix', 'YouTube'] }) });

    fireEvent.click(screen.getByRole('button', { name: 'YouTube' }));

    expect(callService).toHaveBeenCalledWith('media_player', 'select_source', {
      entity_id: 'media_player.living_room_tv',
      source: 'YouTube',
    });
  });

  it('treats standby as off and wakes through the remote like the card', () => {
    const callService = renderTv({ entities: tv('standby') });

    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));

    expect(callService).toHaveBeenCalledWith('remote', 'turn_on', {
      entity_id: 'remote.living_room_tv',
    });
  });

  it('wakes the media player when there is no remote', () => {
    const callService = renderTv({ remoteId: null, entities: tv('off') });

    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));

    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', {
      entity_id: 'media_player.living_room_tv',
    });
  });

  it('does not offer to turn on a TV that is unavailable', () => {
    renderTv({ entities: tv('unavailable') });

    expect(screen.queryByRole('button', { name: 'Turn on' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'status.unavailable' })).toBeDisabled();
  });

  it('keeps playback on a linked player while the TV itself is unavailable', () => {
    const entities = {
      ...tv('unavailable'),
      'media_player.emby': {
        entity_id: 'media_player.emby',
        state: 'paused',
        attributes: { friendly_name: 'Emby' },
      },
    };
    const callService = renderTv({ entities, linkedMediaPlayers: ['media_player.emby'] });

    fireEvent.click(screen.getByRole('button', { name: 'media.play' }));

    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', {
      entity_id: 'media_player.emby',
    });
    expect(screen.getByRole('button', { name: 'media.volume.up' })).toBeDisabled();
  });
});
