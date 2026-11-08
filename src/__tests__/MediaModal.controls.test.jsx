import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MediaModal from '../modals/MediaModal';

vi.mock('../components/ui/AccessibleModalShell', () => ({
  useModalShell: () => null,
  default: ({ open, children }) => (open ? <div role="dialog">{children()}</div> : null),
}));

const SEEK = 2;
const VOLUME_SET = 4;
const VOLUME_MUTE = 8;
const PLAY_MEDIA = 512;
const SHUFFLE = 32768;
const REPEAT = 262144;
const ALL_FEATURES = SEEK | VOLUME_SET | VOLUME_MUTE | PLAY_MEDIA | SHUFFLE | REPEAT;

const player = (state, attributes = {}) => ({
  entity_id: 'media_player.stue',
  state,
  attributes: {
    friendly_name: 'Stue',
    media_title: 'Song',
    media_duration: 200,
    media_position: 10,
    volume_level: 0.2,
    supported_features: ALL_FEATURES,
    ...attributes,
  },
});

function renderModal(entity, extraEntities = {}) {
  const callService = vi.fn();
  const entities = { 'media_player.stue': entity, ...extraEntities };
  const view = render(
    <MediaModal
      show
      onClose={() => {}}
      activeMediaModal="media"
      activeMediaId="media_player.stue"
      setActiveMediaId={vi.fn()}
      activeMediaGroupIds={Object.keys(entities)}
      entities={entities}
      cardSettings={{}}
      customNames={{}}
      mediaTick={0}
      callService={callService}
      getA={(id, attr, fallback = null) => entities[id]?.attributes?.[attr] ?? fallback}
      getEntityImageUrl={() => null}
      isMediaActive={(e) => e?.state === 'playing'}
      isSonosActive={(e) => e?.state === 'playing'}
      t={(key) => key}
      formatDuration={(seconds) => `t${Math.round(seconds ?? 0)}`}
      getServerInfo={() => ({})}
      conn={null}
    />
  );
  return { callService, entities, ...view };
}

const showImmersive = () => fireEvent.click(screen.getByRole('button', { name: 'common.hide' }));

const sliders = () => screen.getAllByRole('slider');

describe('MediaModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe.each([
    ['sidebar', () => {}],
    ['immersive', showImmersive],
  ])('%s sliders', (_name, prepare) => {
    it('seeks once when the finger lifts and follows the finger locally', () => {
      const { callService } = renderModal(player('paused'));
      prepare();
      const [seek] = sliders();

      fireEvent.pointerDown(seek);
      fireEvent.change(seek, { target: { value: '50' } });
      act(() => vi.advanceTimersByTime(50));
      fireEvent.change(seek, { target: { value: '90' } });
      act(() => vi.advanceTimersByTime(50));

      expect(callService).not.toHaveBeenCalled();
      expect(screen.getByText('t90')).toBeInTheDocument();

      fireEvent.pointerUp(seek);
      act(() => vi.advanceTimersByTime(500));

      expect(callService).toHaveBeenCalledTimes(1);
      expect(callService).toHaveBeenCalledWith('media_player', 'media_seek', {
        entity_id: 'media_player.stue',
        seek_position: 90,
      });
      expect(seek).toHaveValue('90');
    });

    it('sends only the last volume after a pause', () => {
      const { callService } = renderModal(player('paused'));
      prepare();
      const volume = sliders()[1];

      fireEvent.pointerDown(volume);
      fireEvent.change(volume, { target: { value: '30' } });
      act(() => vi.advanceTimersByTime(50));
      fireEvent.change(volume, { target: { value: '60' } });
      act(() => vi.advanceTimersByTime(50));
      expect(callService).not.toHaveBeenCalled();

      fireEvent.pointerUp(volume);
      act(() => vi.advanceTimersByTime(500));

      expect(callService).toHaveBeenCalledTimes(1);
      expect(callService).toHaveBeenCalledWith('media_player', 'volume_set', {
        entity_id: 'media_player.stue',
        volume_level: 0.6,
      });
      expect(volume).toHaveValue('60');
    });
  });

  describe.each([
    ['sidebar', () => {}],
    ['immersive', showImmersive],
  ])('%s actions', (_name, prepare) => {
    it('offers every action the player supports', () => {
      const { callService } = renderModal(player('paused'));
      prepare();

      fireEvent.click(screen.getByRole('button', { name: 'media.shuffle' }));
      expect(callService).toHaveBeenLastCalledWith('media_player', 'shuffle_set', {
        entity_id: 'media_player.stue',
        shuffle: true,
      });
      fireEvent.click(screen.getByRole('button', { name: 'media.repeat' }));
      expect(callService).toHaveBeenLastCalledWith('media_player', 'repeat_set', {
        entity_id: 'media_player.stue',
        repeat: 'one',
      });
      fireEvent.click(screen.getByRole('button', { name: 'media.volume.up' }));
      expect(callService).toHaveBeenLastCalledWith(
        'media_player',
        'volume_set',
        expect.objectContaining({ entity_id: 'media_player.stue' })
      );
      expect(screen.getByRole('button', { name: 'media.volume.down' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'media.volume.mute' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'media.chooseMedia' })).toBeInTheDocument();
    });

    it('hides what the player cannot do', () => {
      renderModal(player('paused', { supported_features: 1 }));
      prepare();

      for (const name of [
        'media.shuffle',
        'media.repeat',
        'media.volume.up',
        'media.volume.down',
        'media.volume.mute',
        'media.chooseMedia',
      ]) {
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
      }
      expect(sliders()).toHaveLength(1);
    });

    it('disables every control while the player is unavailable', () => {
      const { callService } = renderModal(player('unavailable'), {
        'media_player.kjokken': {
          entity_id: 'media_player.kjokken',
          state: 'idle',
          attributes: { friendly_name: 'Kjokken' },
        },
      });
      prepare();

      for (const name of [
        'media.shuffle',
        'media.previousTrack',
        'media.play',
        'media.nextTrack',
        'media.repeat',
        'media.volume.up',
        'media.volume.down',
        'media.volume.mute',
        'media.chooseMedia',
      ]) {
        expect(screen.getByRole('button', { name })).toBeDisabled();
      }
      sliders().forEach((slider) => expect(slider).toBeDisabled());
      expect(callService).not.toHaveBeenCalled();
    });
  });

  it('gives the immersive shuffle, repeat and mute a 44 px hit area', () => {
    renderModal(player('paused'));
    showImmersive();

    for (const name of ['media.shuffle', 'media.repeat', 'media.volume.mute']) {
      expect(screen.getByRole('button', { name })).toHaveClass('h-11', 'w-11');
    }
  });

  it('still lets you switch to another player when the current one is unavailable', () => {
    renderModal(player('unavailable'), {
      'media_player.kjokken': {
        entity_id: 'media_player.kjokken',
        state: 'idle',
        attributes: { friendly_name: 'Kjokken' },
      },
    });

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('button', { name: /Kjokken/i })).toBeEnabled();
  });
});
