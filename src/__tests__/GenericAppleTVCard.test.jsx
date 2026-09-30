import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GenericAppleTVCard from '../components/cards/GenericAppleTVCard';

const baseEntities = {
  'media_player.apple_tv': {
    entity_id: 'media_player.apple_tv',
    state: 'playing',
    attributes: {
      friendly_name: 'Living Room Apple TV',
      app_name: 'Netflix',
      media_title: 'Stranger Things',
      entity_picture: '/api/media_player_proxy/stranger_things.jpg',
    },
  },
};

const baseProps = (overrides = {}) => ({
  cardId: 'appletv_card_1',
  dragProps: {},
  controls: null,
  cardStyle: {},
  editMode: false,
  entities: baseEntities,
  mediaPlayerId: 'media_player.apple_tv',
  remoteId: 'remote.apple_tv',
  linkedMediaPlayers: [],
  size: 'large',
  getA: (id, attr) =>
    overrides.entities?.[id]?.attributes?.[attr] ?? baseEntities[id]?.attributes?.[attr],
  getEntityImageUrl: (url) => url,
  onOpen: vi.fn(),
  customNames: {},
  isMobile: false,
  t: (key) => key,
  callService: vi.fn(),
  settings: {},
  ...overrides,
});

describe('GenericAppleTVCard', () => {
  it('renders media title and app name when playing', () => {
    render(<GenericAppleTVCard {...baseProps()} />);

    expect(screen.getByText('Stranger Things')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('renders device name when off/idle', () => {
    const entities = {
      'media_player.apple_tv': {
        entity_id: 'media_player.apple_tv',
        state: 'off',
        attributes: {
          friendly_name: 'Living Room Apple TV',
        },
      },
    };

    render(<GenericAppleTVCard {...baseProps({ entities })} />);

    expect(screen.getByText('Living Room Apple TV')).toBeInTheDocument();
    expect(screen.getByText('common.off')).toBeInTheDocument();
  });

  it('calls turn_off when direct power button is clicked while playing', () => {
    const callService = vi.fn();
    render(<GenericAppleTVCard {...baseProps({ callService })} />);

    const powerBtn = screen.getByRole('button', { name: 'shield.turnOff' });
    fireEvent.click(powerBtn);

    expect(callService).toHaveBeenCalledWith('media_player', 'turn_off', {
      entity_id: 'media_player.apple_tv',
    });
  });

  it('calls turn_on when direct power button is clicked while off', () => {
    const callService = vi.fn();
    const entities = {
      'media_player.apple_tv': {
        entity_id: 'media_player.apple_tv',
        state: 'off',
        attributes: {
          friendly_name: 'Living Room Apple TV',
        },
      },
    };

    render(<GenericAppleTVCard {...baseProps({ entities, callService })} />);

    const powerBtn = screen.getByRole('button', { name: 'shield.turnOn' });
    fireEvent.click(powerBtn);

    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', {
      entity_id: 'media_player.apple_tv',
    });
  });

  it('calls media_play_pause when play/pause button is clicked', () => {
    const callService = vi.fn();
    render(<GenericAppleTVCard {...baseProps({ callService })} />);

    const playPauseBtn = screen.getByRole('button', { name: 'shield.playPause' });
    fireEvent.click(playPauseBtn);

    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', {
      entity_id: 'media_player.apple_tv',
    });
  });

  it('opens modal on card click by default', () => {
    const onOpen = vi.fn();
    const { container } = render(<GenericAppleTVCard {...baseProps({ onOpen })} />);

    fireEvent.click(container.firstChild);

    expect(onOpen).toHaveBeenCalled();
  });

  it('toggles power on card click when tapAction is toggle', () => {
    const onOpen = vi.fn();
    const callService = vi.fn();
    const { container } = render(
      <GenericAppleTVCard
        {...baseProps({
          onOpen,
          callService,
          settings: { tapAction: 'toggle' },
        })}
      />
    );

    fireEvent.click(container.firstChild);

    expect(callService).toHaveBeenCalledWith('media_player', 'turn_off', {
      entity_id: 'media_player.apple_tv',
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('renders small layout properly', () => {
    const onOpen = vi.fn();
    render(<GenericAppleTVCard {...baseProps({ size: 'small', onOpen })} />);

    expect(screen.getByText('Stranger Things')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'shield.turnOff' })).toBeInTheDocument();
  });

  it.each(['small', 'large'])(
    'shows pending feedback until HA confirms power in %s layout',
    (size) => {
      const callService = vi.fn().mockResolvedValue(undefined);
      const props = baseProps({ size, callService, settings: { tapAction: 'toggle' } });
      const { rerender, container } = render(<GenericAppleTVCard {...props} />);
      const button = screen.getByRole('button', { name: 'shield.turnOff' });
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
      fireEvent.click(container.firstChild);
      expect(callService).toHaveBeenCalledTimes(1);
      rerender(
        <GenericAppleTVCard
          {...props}
          entities={{
            'media_player.apple_tv': { ...baseEntities['media_player.apple_tv'], state: 'off' },
          }}
        />
      );
      expect(button).toHaveAttribute('aria-busy', 'false');
      expect(button).toHaveAccessibleName('shield.turnOn');
      expect(button).not.toHaveAttribute('aria-pressed');
      expect(button).toBeEnabled();
    }
  );
  it('controls a paused linked player instead of the Apple TV itself', () => {
    const callService = vi.fn();
    const entities = {
      ...baseEntities,
      'media_player.speaker': {
        entity_id: 'media_player.speaker',
        state: 'paused',
        attributes: { friendly_name: 'Soundbar', media_title: 'Song' },
      },
    };
    render(
      <GenericAppleTVCard
        {...baseProps({
          entities,
          callService,
          linkedMediaPlayers: ['media_player.speaker'],
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'shield.playPause' }));

    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', {
      entity_id: 'media_player.speaker',
    });
  });

  it('keeps details reachable by keyboard when tapping the card toggles power', () => {
    const onOpen = vi.fn();
    const callService = vi.fn();
    render(
      <GenericAppleTVCard
        {...baseProps({ onOpen, callService, settings: { tapAction: 'toggle' } })}
      />
    );

    const details = screen.getByRole('button', { name: /editCard\.tapActionModal/ });
    fireEvent.keyDown(details, { key: 'Enter' });

    expect(onOpen).toHaveBeenCalledOnce();
    expect(callService).not.toHaveBeenCalled();
  });
});
