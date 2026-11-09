import { useEffect, useState } from 'react';
import { Music, Pause, Play, SkipBack, SkipForward } from '../../icons';
import M3Slider from '../ui/M3Slider';
import MomentBar, { type MomentViewProps } from './MomentBar';
import { isUnavailableState } from '../../utils/entityState';

const text = (value: unknown) => (typeof value === 'string' ? value : '');

export default function MediaMoment({
  titleId,
  name,
  entity,
  entityId,
  conn,
  callService,
  getEntityImageUrl,
  formatDuration,
  t,
}: MomentViewProps) {
  const attrs = entity?.attributes ?? {};
  const isPlaying = entity?.state === 'playing';
  const isUnavailable = !entity || isUnavailableState(entity.state);
  const duration = Number(attrs.media_duration) || 0;
  const artwork = getEntityImageUrl(attrs.entity_picture) || null;
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const cover = artwork && artwork !== failedArtwork ? artwork : null;

  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (!isPlaying || duration <= 0) return undefined;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isPlaying, duration]);

  const send = (service: string, data: Record<string, unknown> = {}) => {
    if (!conn || isUnavailable) return;
    callService('media_player', service, { entity_id: entityId, ...data });
  };

  const basePosition = Number(attrs.media_position) || 0;
  const updatedAt = new Date(text(attrs.media_position_updated_at)).getTime();
  const elapsed =
    isPlaying && Number.isFinite(updatedAt) ? Math.max(0, (clock - updatedAt) / 1000) : 0;
  const position = Math.min(duration || basePosition, basePosition + elapsed);
  const playPauseLabel = isPlaying ? t('media.pause') : t('media.play');
  const title = text(attrs.media_title) || name;
  const artist = text(attrs.media_artist);
  const album = text(attrs.media_album_name);

  return (
    <>
      <div className="moment__backdrop" aria-hidden="true">
        {cover && <img key={cover} src={cover} alt="" />}
        <div className="moment__tone" />
        <div className="moment__grain" />
      </div>

      <MomentBar label={name} t={t} />

      <div className="moment__stage" data-paused={isPlaying ? undefined : 'true'}>
        <div className="moment__cover">
          {cover ? (
            <img key={cover} src={cover} alt="" onError={() => setFailedArtwork(cover)} />
          ) : (
            <Music aria-hidden="true" />
          )}
        </div>

        <div className="moment__details">
          <h2 id={titleId} className="moment__title">
            {title}
          </h2>
          {artist && <p className="moment__artist">{artist}</p>}
          {album && <p className="moment__album">{album}</p>}

          {duration > 0 && (
            <div className="moment__progress">
              <div className="moment__progress-track">
                <div
                  className="moment__progress-fill"
                  style={{ width: `${Math.min(100, (position / duration) * 100)}%` }}
                />
              </div>
              <div className="moment__progress-times">
                <span>{formatDuration(Math.floor(position))}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
          )}

          <div className="moment__controls">
            <button
              type="button"
              disabled={isUnavailable}
              onClick={() => send('media_previous_track')}
              aria-label={t('media.previous')}
            >
              <SkipBack aria-hidden="true" />
            </button>
            <button
              type="button"
              className="moment__play"
              disabled={isUnavailable}
              onClick={() => send('media_play_pause')}
              aria-label={playPauseLabel}
            >
              {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </button>
            <button
              type="button"
              disabled={isUnavailable}
              onClick={() => send('media_next_track')}
              aria-label={t('media.next')}
            >
              <SkipForward aria-hidden="true" />
            </button>
          </div>

          <div className="moment__volume">
            <M3Slider
              min={0}
              max={100}
              step={1}
              variant="thinLg"
              disabled={isUnavailable}
              value={Math.round((Number(attrs.volume_level) || 0) * 100)}
              onChange={(event) =>
                send('volume_set', { volume_level: Number(event.target.value) / 100 })
              }
              ariaLabel={t('moment.volume')}
            />
          </div>
        </div>
      </div>
    </>
  );
}
