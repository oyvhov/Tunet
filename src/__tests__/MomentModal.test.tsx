import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MomentModal from '../modals/MomentModal';
import type { ActiveMoment } from '../hooks/useMoments';
import type { EntityMap } from '../types/dashboard';

vi.mock('../contexts', () => ({ useConfig: () => ({ currentTheme: 'light' }) }));

vi.mock('../components/camera/CameraFeed', () => ({
  default: ({ entityId }: { entityId: string }) => <div data-testid="feed">{entityId}</div>,
}));

const song = (state = 'playing', attributes: Record<string, unknown> = {}) =>
  ({
    'media_player.kitchen': {
      state,
      attributes: {
        friendly_name: 'Kitchen',
        media_title: 'Blue in Green',
        media_artist: 'Miles Davis',
        media_album_name: 'Kind of Blue',
        entity_picture: '/cover.jpg',
        volume_level: 0.4,
        ...attributes,
      },
    },
  }) as EntityMap;

const musicMoment: ActiveMoment = {
  cardId: 'media_player.kitchen',
  kind: 'media',
  entityId: 'media_player.kitchen',
};

const renderMoment = (
  moment: ActiveMoment = musicMoment,
  entities: EntityMap = song(),
  props: Record<string, unknown> = {}
) => {
  const callService = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <MomentModal
      moment={moment}
      onClose={onClose}
      entities={entities}
      customNames={{}}
      customIcons={{}}
      conn={{}}
      callService={callService}
      getEntityImageUrl={(url: unknown) => (typeof url === 'string' ? `http://ha${url}` : null)}
      formatDuration={(seconds: number) => `${seconds}s`}
      t={(key: string) => key}
      {...props}
    />
  );
  return { ...utils, callService, onClose };
};

describe('MomentModal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows what is playing', () => {
    renderMoment();

    expect(screen.getByRole('heading', { name: 'Blue in Green' })).toBeInTheDocument();
    expect(screen.getByText('Miles Davis')).toBeInTheDocument();
    expect(screen.getByText('Kind of Blue')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
  });

  it('sends nothing to a player that has gone unavailable', () => {
    const { callService } = renderMoment(musicMoment, song('unavailable'));

    for (const name of ['media.previous', 'media.play', 'media.next']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }

    expect(screen.getByRole('slider')).toBeDisabled();
    expect(callService).not.toHaveBeenCalled();
  });

  it('gives the view the base colour of the theme', () => {
    renderMoment();

    expect(screen.getByRole('dialog').style.getPropertyValue('--moment-base')).toBe('#ffffff');
  });

  it('uses the panel animation shared by every popup', () => {
    renderMoment();

    expect(screen.getByRole('dialog')).toHaveClass('popup-anim');
  });

  it('shows the cover', () => {
    const { container } = renderMoment();

    expect(container.querySelector('.moment__cover img')).toHaveAttribute(
      'src',
      'http://ha/cover.jpg'
    );
  });

  it('drops the cover when it cannot be loaded', () => {
    const { container } = renderMoment();

    fireEvent.error(container.querySelector('.moment__cover img') as HTMLImageElement);

    expect(container.querySelector('.moment__cover img')).toBeNull();
    expect(container.querySelector('.moment__backdrop img')).toBeNull();
  });

  it('pauses the speaker being shown', () => {
    const { callService } = renderMoment();

    fireEvent.click(screen.getByRole('button', { name: 'media.pause' }));

    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', {
      entity_id: 'media_player.kitchen',
    });
  });

  it('offers play while paused', () => {
    renderMoment(musicMoment, song('paused'));

    expect(screen.getByRole('button', { name: 'media.play' })).toBeInTheDocument();
  });

  it('skips to the next track', () => {
    const { callService } = renderMoment();

    fireEvent.click(screen.getByRole('button', { name: 'media.next' }));

    expect(callService).toHaveBeenCalledWith('media_player', 'media_next_track', {
      entity_id: 'media_player.kitchen',
    });
  });

  it('sends nothing without a connection', () => {
    const { callService } = renderMoment(musicMoment, song(), { conn: null });

    fireEvent.click(screen.getByRole('button', { name: 'media.pause' }));

    expect(callService).not.toHaveBeenCalled();
  });

  it('shows progress only when the track has a length', () => {
    const { container } = renderMoment();

    expect(container.querySelector('.moment__progress')).toBeNull();
  });

  it('shows how far the track has come', () => {
    renderMoment(musicMoment, song('paused', { media_duration: 200, media_position: 50 }));

    expect(screen.getByText('50s')).toBeInTheDocument();
    expect(screen.getByText('200s')).toBeInTheDocument();
  });

  it('closes from the close button', () => {
    vi.useFakeTimers();
    const { onClose } = renderMoment();

    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('plays the closing animation when the rules end the moment', () => {
    vi.useFakeTimers();
    const { rerender, onClose } = renderMoment();

    rerender(
      <MomentModal
        moment={{ ...musicMoment, closing: true }}
        onClose={onClose}
        entities={song()}
        customNames={{}}
        customIcons={{}}
        conn={{}}
        callService={vi.fn()}
        getEntityImageUrl={() => null}
        formatDuration={(seconds: number) => `${seconds}s`}
        t={(key: string) => key}
      />
    );
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the camera for a camera moment', () => {
    renderMoment({ cardId: 'camera_card_door', kind: 'camera', entityId: 'camera.door' }, {
      'camera.door': { state: 'idle', attributes: { friendly_name: 'Door' } },
    } as EntityMap);

    expect(screen.getByTestId('feed')).toHaveTextContent('camera.door');
    expect(screen.getByRole('heading', { name: 'Door' })).toBeInTheDocument();
  });

  it('shows the message of a notice', () => {
    renderMoment(
      {
        cardId: 'entity_card_washer',
        kind: 'notice',
        entityId: 'sensor.washer',
        settings: { moment: { enabled: true, message: 'Washing is done' } },
      },
      {
        'sensor.washer': { state: 'finished', attributes: { friendly_name: 'Washer' } },
      } as EntityMap
    );

    expect(screen.getByRole('heading', { name: 'Washing is done' })).toBeInTheDocument();
    expect(screen.getByText('Washer')).toBeInTheDocument();
  });

  it('falls back to the state when a notice has no message', () => {
    renderMoment({ cardId: 'entity_card_washer', kind: 'notice', entityId: 'sensor.washer' }, {
      'sensor.washer': { state: 'finished', attributes: {} },
    } as EntityMap);

    expect(screen.getByRole('heading', { name: 'Finished' })).toBeInTheDocument();
  });

  it('prefers the name given to the card', () => {
    renderMoment(musicMoment, song(), { customNames: { 'media_player.kitchen': 'Downstairs' } });

    expect(screen.getByText('Downstairs')).toBeInTheDocument();
  });
});
