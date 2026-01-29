import { useEffect, useState } from 'react';
import M3Slider from './M3Slider';
import {
  Music,
  Tv,
  Speaker,
  Shuffle,
  Repeat,
  Repeat1,
  SkipBack,
  Pause,
  Play,
  SkipForward,
  VolumeX,
  Volume1,
  Volume2,
  Link,
  Plus
} from '../icons';

export default function SonosPage({
  pageId,
  entities,
  sonosIds,
  pageSettings,
  isSonosActive,
  activeMediaId,
  setActiveMediaId,
  getA,
  getEntityImageUrl,
  callService,
  savePageSetting,
  formatDuration,
  t
}) {
  const sonosEntities = sonosIds.map(id => entities[id]).filter(Boolean);
  if (sonosEntities.length === 0) {
    return (
      <div key={pageId} className="rounded-3xl popup-surface p-8 text-center text-[var(--text-secondary)]">
        {t('media.noPlayersFound')}
      </div>
    );
  }

  const pageSetting = pageSettings[pageId] || {};
  const activeSonos = sonosEntities.filter(isSonosActive);
  let currentMp = sonosEntities.find(e => e.entity_id === pageSetting.activeId) || sonosEntities.find(e => e.entity_id === activeMediaId);
  if (!currentMp) currentMp = activeSonos[0] || sonosEntities[0];

  const mpId = currentMp.entity_id;
  const mpState = currentMp.state;
  const isPlaying = mpState === 'playing';
  const isLydplanke = mpId === 'media_player.sonos_lydplanke';
  const isTV = isLydplanke && (currentMp.attributes?.source === 'TV' || currentMp.attributes?.media_title === 'TV');

  let mpTitle = getA(mpId, 'media_title');
  if (isTV) mpTitle = t('media.tvAudio');
  let mpSeries = getA(mpId, 'media_artist') || getA(mpId, 'media_album_name');
  if (isTV) mpSeries = t('media.livingRoom');

  const mpPicture = !isTV ? getEntityImageUrl(currentMp.attributes?.entity_picture) : null;
  const duration = getA(mpId, 'media_duration');
  const position = getA(mpId, 'media_position');
  const positionUpdatedAt = getA(mpId, 'media_position_updated_at');
  const volume = getA(mpId, 'volume_level', 0);
  const isMuted = getA(mpId, 'is_volume_muted', false);
  const shuffle = getA(mpId, 'shuffle', false);
  const repeat = getA(mpId, 'repeat', 'off');

  const [playheadNow, setPlayheadNow] = useState(() => Date.now());

  useEffect(() => {
    setPlayheadNow(Date.now());
    if (!isPlaying) return;
    const intervalId = setInterval(() => setPlayheadNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [isPlaying, mpId]);

  const basePosition = typeof position === 'number' ? position : 0;
  const updatedAtMs = positionUpdatedAt ? new Date(positionUpdatedAt).getTime() : null;
  const elapsed = isPlaying && Number.isFinite(updatedAtMs)
    ? Math.max(0, (playheadNow - updatedAtMs) / 1000)
    : 0;
  const effectivePosition = Math.min(duration || basePosition, basePosition + elapsed);

  const rawMembers = getA(mpId, 'group_members');
  const groupMembers = Array.isArray(rawMembers) ? rawMembers : [];

  const listPlayers = sonosEntities
    .slice()
    .sort((a, b) => {
      const aActive = isSonosActive(a);
      const bActive = isSonosActive(b);
      if (aActive !== bActive) return aActive ? -1 : 1;
      return (a.attributes?.friendly_name || '').localeCompare(b.attributes?.friendly_name || '');
    });

  return (
    <div key={pageId} className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.85fr] gap-8 font-sans fade-in-anim items-start">
      <div className="rounded-3xl border border-[var(--glass-border)] popup-surface p-8 flex flex-col min-h-[480px]">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <Music className="w-4 h-4 text-[var(--text-primary)]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">SONOS</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-8 md:gap-12 items-center">
          <div className="flex-shrink-0 flex justify-center md:justify-start">
            {mpPicture ? (
              <img src={mpPicture} alt="" className="w-64 h-64 md:w-72 md:h-72 object-cover rounded-2xl shadow-2xl" />
            ) : (
              <div className="w-64 h-64 md:w-72 md:h-72 flex items-center justify-center rounded-2xl bg-[var(--glass-bg)]">
                {isTV ? <Tv className="w-24 h-24 text-gray-700" /> : <Speaker className="w-24 h-24 text-gray-700" />}
              </div>
            )}
          </div>

          <div className="flex-1 w-full flex flex-col justify-center md:justify-between md:h-72 gap-6 min-w-0">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] leading-none truncate">{mpTitle || t('common.unknown')}</h2>
              <p className="text-xl text-[var(--text-secondary)] font-medium truncate">{mpSeries || ''}</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-[var(--text-secondary)] tracking-widest">
                  <span>{formatDuration(effectivePosition)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
                <M3Slider variant="thin" min={0} max={duration || 100} step={1} value={effectivePosition || 0} disabled={!duration} onChange={(e) => callService('media_player', 'media_seek', { entity_id: mpId, seek_position: parseFloat(e.target.value) })} colorClass="bg-white" />
              </div>

              <div className="flex items-center justify-between gap-3">
                <button onClick={() => callService('media_player', 'shuffle_set', { entity_id: mpId, shuffle: !shuffle })} className={`p-2 rounded-full transition-all active:scale-95 ${shuffle ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`} title="Shuffle">
                  <Shuffle className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => callService('media_player', 'media_previous_track', { entity_id: mpId })} className="p-2 hover:bg-[var(--glass-bg-hover)] rounded-full transition-all active:scale-95"><SkipBack className="w-6 h-6 text-[var(--text-secondary)]" /></button>
                  <button onClick={() => callService('media_player', 'media_play_pause', { entity_id: mpId })} className="p-3 rounded-full transition-all active:scale-95 shadow-lg hover:shadow-xl hover:scale-105" style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                    {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
                  </button>
                  <button onClick={() => callService('media_player', 'media_next_track', { entity_id: mpId })} className="p-2 hover:bg-[var(--glass-bg-hover)] rounded-full transition-all active:scale-95"><SkipForward className="w-6 h-6 text-[var(--text-secondary)]" /></button>
                </div>
                <button onClick={() => { const modes = ['off', 'one', 'all']; const nextMode = modes[(modes.indexOf(repeat) + 1) % modes.length]; callService('media_player', 'repeat_set', { entity_id: mpId, repeat: nextMode }); }} className={`p-2 rounded-full transition-all active:scale-95 ${repeat !== 'off' ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`} title="Repeat">
                  {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => callService('media_player', 'volume_mute', { entity_id: mpId, is_volume_muted: !isMuted })} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-shrink-0 transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5" /> : (volume < 0.5 ? <Volume1 className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />)}
              </button>
              <M3Slider variant="volume" min={0} max={100} step={1} value={volume * 100} onChange={(e) => callService('media_player', 'volume_set', { entity_id: mpId, volume_level: parseFloat(e.target.value) / 100 })} colorClass="bg-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--glass-border)] popup-surface p-6 min-h-[480px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{t('media.group.sonosPlayers')}</h3>
          {listPlayers.length > 1 && (
            <button
              onClick={() => {
                const allIds = listPlayers.map(p => p.entity_id);
                const unjoined = allIds.filter(id => !groupMembers.includes(id));
                if (unjoined.length > 0) {
                  callService('media_player', 'join', { entity_id: mpId, group_members: unjoined });
                } else {
                  const others = groupMembers.filter(id => id !== mpId);
                  others.forEach(id => callService('media_player', 'unjoin', { entity_id: id }));
                }
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-white transition-colors"
            >
              {listPlayers.every(p => groupMembers.includes(p.entity_id)) ? t('sonos.ungroupAll') : t('sonos.groupAll')}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto flex-1">
          {listPlayers.map((p, idx) => {
            const pPic = getEntityImageUrl(p.attributes?.entity_picture);
            const isSelected = p.entity_id === mpId;
            const isMember = groupMembers.includes(p.entity_id);
            const isSelf = p.entity_id === mpId;
            const isActivePlayer = isSonosActive(p);
            const pTitle = getA(p.entity_id, 'media_title', t('common.unknown'));

            return (
              <div key={p.entity_id || idx} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${isSelected ? 'bg-[var(--glass-bg-hover)] border-[var(--glass-border)]' : 'hover:bg-[var(--glass-bg)] border-transparent'} ${isActivePlayer ? '' : 'opacity-70'}`}>
                <button onClick={() => { savePageSetting(pageId, 'activeId', p.entity_id); setActiveMediaId(p.entity_id); }} className="flex-1 flex items-center gap-4 text-left min-w-0 group">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--glass-bg)] flex-shrink-0 relative">
                    {pPic ? <img src={pPic} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Speaker className="w-5 h-5 text-gray-600" /></div>}
                    {p.state === 'playing' && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /></div>}
                  </div>
                  <div className="overflow-hidden">
                    <p className={`text-xs font-bold uppercase tracking-wider truncate ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{(p.attributes.friendly_name || '').replace(/^(Midttunet|Bibliotek|Sonos)\s*/i, '')}</p>
                    <p className="text-[10px] text-gray-600 truncate mt-0.5">{pTitle}</p>
                  </div>
                </button>
                {!isSelf && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMember) {
                        callService('media_player', 'unjoin', { entity_id: p.entity_id });
                      } else {
                        callService('media_player', 'join', { entity_id: mpId, group_members: [p.entity_id] });
                      }
                    }}
                    className={`p-2.5 rounded-full transition-all ${isMember ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--glass-bg)] text-gray-500 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    title={isMember ? t('tooltip.removeFromGroup') : t('tooltip.addToGroup')}
                  >
                    {isMember ? <Link className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                )}
                {isSelf && groupMembers.length > 1 && (
                  <div className="p-2.5 rounded-full bg-blue-500/20 text-blue-400" title="Linka">
                    <Link className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
