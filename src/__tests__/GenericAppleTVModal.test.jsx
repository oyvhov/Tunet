import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GenericAppleTVModal from '../modals/GenericAppleTVModal';

vi.mock('../components/ui/AccessibleModalShell', () => ({
  default: ({ open, children, overlayClassName, panelClassName }) =>
    open ? (
      <div
        data-testid="tv-modal-shell"
        data-overlay-class={overlayClassName}
        data-panel-class={panelClassName}
      >
        {children()}
      </div>
    ) : null,
}));

const baseEntities = {
  'media_player.apple_tv': {
    entity_id: 'media_player.apple_tv',
    state: 'playing',
    attributes: {
      friendly_name: 'Living Room Apple TV',
      app_name: 'Netflix',
      media_title: 'Stranger Things',
      source_list: ['Netflix', 'YouTube', 'Plex', 'Apple TV'],
      source: 'Netflix',
    },
  },
};

const baseProps = (overrides = {}) => ({
  show: true,
  onClose: vi.fn(),
  entities: baseEntities,
  mediaPlayerId: 'media_player.apple_tv',
  remoteId: 'remote.apple_tv',
  linkedMediaPlayers: [],
  callService: vi.fn(),
  getA: (id, attr) =>
    overrides.entities?.[id]?.attributes?.[attr] ?? baseEntities[id]?.attributes?.[attr],
  getEntityImageUrl: vi.fn(() => null),
  customNames: {},
  t: (key) =>
    ({
      'common.close': 'Close',
      'status.statusLabel': 'Status',
      'media.homeScreen': 'Home screen',
      'media.noneMedia': 'No media',
      'shield.turnOff': 'Turn off',
      'shield.turnOn': 'Turn on',
      'appletv.menu': 'Back',
      'appletv.tvHome': 'TV / Home',
      'appletv.apps': 'Apps',
      'shield.playPause': 'Play/Pause',
      'media.volume.mute': 'Mute',
      'media.volume.unmute': 'Unmute',
    })[key] || key,
  ...overrides,
});

describe('GenericAppleTVModal', () => {
  it('renders modal shell and device header info', () => {
    render(<GenericAppleTVModal {...baseProps()} />);

    expect(screen.getByTestId('tv-modal-shell')).toBeInTheDocument();
    expect(screen.getByText('Living Room Apple TV')).toBeInTheDocument();
    expect(screen.getByText('Status: playing')).toBeInTheDocument();
  });

  it('sends remote D-pad commands up, down, left, right, select', () => {
    const callService = vi.fn();
    render(<GenericAppleTVModal {...baseProps({ callService })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Up' }));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: 'remote.apple_tv',
      command: 'up',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Down' }));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: 'remote.apple_tv',
      command: 'down',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Left' }));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: 'remote.apple_tv',
      command: 'left',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Right' }));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: 'remote.apple_tv',
      command: 'right',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: 'remote.apple_tv',
      command: 'select',
    });
  });

  it('sends remote menu and home commands', () => {
    const callService = vi.fn();
    render(<GenericAppleTVModal {...baseProps({ callService })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: 'remote.apple_tv',
      command: 'menu',
    });

    fireEvent.click(screen.getByRole('button', { name: 'TV / Home' }));
    expect(callService).toHaveBeenCalledWith('remote', 'send_command', {
      entity_id: 'remote.apple_tv',
      command: 'home',
    });
  });

  it('controls media playback and volume', () => {
    const callService = vi.fn();
    render(<GenericAppleTVModal {...baseProps({ callService })} />);

    const playPauseButtons = screen.getAllByRole('button', { name: 'Play/Pause' });
    fireEvent.click(playPauseButtons[0]);
    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', {
      entity_id: 'media_player.apple_tv',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Volume up' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_up', {
      entity_id: 'media_player.apple_tv',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Volume down' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_down', {
      entity_id: 'media_player.apple_tv',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_mute', {
      entity_id: 'media_player.apple_tv',
      is_volume_muted: true,
    });
  });

  it('unmutes with the explicit Home Assistant mute state when already muted', () => {
    const callService = vi.fn();
    const mutedEntities = {
      'media_player.apple_tv': {
        ...baseEntities['media_player.apple_tv'],
        attributes: { ...baseEntities['media_player.apple_tv'].attributes, is_volume_muted: true },
      },
    };
    render(<GenericAppleTVModal {...baseProps({ callService, entities: mutedEntities })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Unmute' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'volume_mute', {
      entity_id: 'media_player.apple_tv',
      is_volume_muted: false,
    });
  });

  it('hides the remote controls when the card has no remote entity', () => {
    render(<GenericAppleTVModal {...baseProps({ remoteId: null })} />);

    expect(screen.queryByRole('button', { name: 'Up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'TV / Home' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volume up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turn off' })).toBeInTheDocument();
  });

  it('titles the popup with the name given to the card', () => {
    render(
      <GenericAppleTVModal
        {...baseProps({ cardId: 'appletv_card_1', customNames: { appletv_card_1: 'Bedroom TV' } })}
      />
    );

    expect(screen.getByText('Bedroom TV')).toBeInTheDocument();
  });

  it('toggles power on and off', () => {
    const callService = vi.fn();
    const { rerender } = render(<GenericAppleTVModal {...baseProps({ callService })} />);

    // Active -> Turn off
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_off', {
      entity_id: 'media_player.apple_tv',
    });

    // Inactive -> Turn on
    const offEntities = {
      'media_player.apple_tv': {
        entity_id: 'media_player.apple_tv',
        state: 'off',
        attributes: { friendly_name: 'Living Room Apple TV' },
      },
    };
    rerender(<GenericAppleTVModal {...baseProps({ entities: offEntities, callService })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Turn on' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', {
      entity_id: 'media_player.apple_tv',
    });
  });

  it('allows launching sources from source_list', () => {
    const callService = vi.fn();
    render(<GenericAppleTVModal {...baseProps({ callService })} />);

    const youtubeBtn = screen.getByRole('button', { name: 'YouTube' });
    fireEvent.click(youtubeBtn);

    expect(callService).toHaveBeenCalledWith('media_player', 'select_source', {
      entity_id: 'media_player.apple_tv',
      source: 'YouTube',
    });
  });
});
