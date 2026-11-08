import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GenericAndroidTVCard from '../components/cards/GenericAndroidTVCard';

const renderCard = (state, overrides = {}) => {
  const callService = vi.fn(() => Promise.resolve());
  const onOpen = vi.fn();
  const utils = render(
    <GenericAndroidTVCard
      cardId="tv_card"
      entities={{
        'media_player.shield': {
          entity_id: 'media_player.shield',
          state,
          attributes: { friendly_name: 'Shield TV' },
        },
      }}
      mediaPlayerId="media_player.shield"
      getA={() => null}
      getEntityImageUrl={() => null}
      customNames={{}}
      onOpen={onOpen}
      callService={callService}
      t={(key) => key}
      {...overrides}
    />
  );
  return { ...utils, callService, onOpen };
};

describe('GenericAndroidTVCard off state', () => {
  it('renders the standby layout and turns the TV on via the remote', () => {
    const { container, callService, onOpen } = renderCard('off', { remoteId: 'remote.shield' });

    expect(container.querySelector('[data-tv-state="off"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'shield.turnOn: Shield TV' }));

    expect(callService).toHaveBeenCalledWith('remote', 'turn_on', { entity_id: 'remote.shield' });
    expect(onOpen).not.toHaveBeenCalled();
    expect(container.querySelector('[data-tv-state="waking"]')).not.toBeNull();
    expect(screen.getByText('tv.starting')).toBeInTheDocument();
  });

  it('keeps the regular compact layout on the small card', () => {
    const { container } = renderCard('off', { size: 'small' });
    expect(container.querySelector('[data-tv-state]')).toBeNull();
    expect(screen.getByText('common.off')).toBeInTheDocument();
  });

  it('falls back to media_player.turn_on without a remote', () => {
    const { callService } = renderCard('off');
    fireEvent.click(screen.getByRole('button', { name: 'shield.turnOn: Shield TV' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'turn_on', {
      entity_id: 'media_player.shield',
    });
  });

  it('hides the power button while unavailable', () => {
    const { container } = renderCard('unavailable');
    expect(container.querySelector('[data-tv-state="unavailable"]')).not.toBeNull();
    expect(screen.getByText('status.unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /shield.turnOn/ })).toBeNull();
  });

  it('keeps the regular layout when the TV is on', () => {
    const { container } = renderCard('idle');
    expect(container.querySelector('[data-tv-state]')).toBeNull();
  });

  it('treats standby as off', () => {
    const { container } = renderCard('standby');
    expect(container.querySelector('[data-tv-state="off"]')).not.toBeNull();
  });
});

describe('GenericAndroidTVCard controls', () => {
  it.each(['large', 'small'])('turns the TV off from the %s card', (size) => {
    const { callService, onOpen } = renderCard('idle', { size, remoteId: 'remote.shield' });

    fireEvent.click(screen.getByRole('button', { name: 'shield.turnOff' }));

    expect(callService).toHaveBeenCalledWith('media_player', 'turn_off', {
      entity_id: 'media_player.shield',
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('wakes the small card through the remote like the popup', () => {
    const { callService } = renderCard('off', { size: 'small', remoteId: 'remote.shield' });

    fireEvent.click(screen.getByRole('button', { name: 'shield.turnOn' }));

    expect(callService).toHaveBeenCalledWith('remote', 'turn_on', { entity_id: 'remote.shield' });
  });

  it('says the small card is unavailable and offers no power button', () => {
    renderCard('unavailable', { size: 'small' });

    expect(screen.getAllByText('status.unavailable').length).toBeGreaterThan(0);
    expect(screen.queryByText('status.off')).not.toBeInTheDocument();
    expect(screen.queryByText('common.off')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'shield.turnOn' })).toBeNull();
  });

  it('resumes a paused linked player from the card', () => {
    const entities = {
      'media_player.shield': {
        entity_id: 'media_player.shield',
        state: 'idle',
        attributes: { friendly_name: 'Shield TV' },
      },
      'media_player.emby': {
        entity_id: 'media_player.emby',
        state: 'paused',
        attributes: { friendly_name: 'Emby' },
      },
    };
    const { callService } = renderCard('idle', {
      entities,
      linkedMediaPlayers: ['media_player.emby'],
    });

    fireEvent.click(screen.getByRole('button', { name: 'shield.playPause' }));

    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', {
      entity_id: 'media_player.emby',
    });
  });
});
