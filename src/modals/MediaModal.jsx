import { useEffect, useState } from 'react';
import {
  X,
  Music,
  Tv,
  Speaker,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Shuffle,
  Repeat,
  Repeat1,
  VolumeX,
  Volume1,
  Volume2,
  Link,
  Plus
} from '../icons';
import M3Slider from '../components/M3Slider';

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write ${key} to localStorage:`, error);
  }
};

/**
 * MediaModal - Unified media/sonos modal
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Close handler
 * @param {string|null} props.activeMediaModal - 'media' | 'sonos'
 * @param {string|null} props.activeMediaGroupKey - Group settings key
 * @param {string[]|null} props.activeMediaGroupIds - Optional media ids override
 * @param {string[]|null} props.activeMediaSessionSensorIds - Optional session sensor ids override
 * @param {string|null} props.activeMediaId - Active media player id
 * @param {Function} props.setActiveMediaId - Update active media id
 * @param {Object} props.entities - HA entities
 * @param {Object} props.cardSettings - Card settings map
 * @param {Object} props.customNames - Custom names map
 * @param {number} props.mediaTick - Tick for media position updates
 * @param {Function} props.callService - HA service call
 * @param {Function} props.getA - Get entity attribute
 * @param {Function} props.getEntityImageUrl - Resolve entity image URL
 * @param {Function} props.isMediaActive - Is media active
 * @param {Function} props.isSonosActive - Is Sonos active
 * @param {Function} props.t - Translation function
 * @param {Function} props.formatDuration - Format seconds to duration
 * @param {Function} props.getServerInfo - Media server metadata
 */
export default function MediaModal({
  show,
  onClose,
  activeMediaModal,
  activeMediaGroupKey,
  activeMediaGroupIds,
  activeMediaSessionSensorIds,
  activeMediaId,
  setActiveMediaId,
  entities,
  cardSettings,
  customNames,
  mediaTick,
  callService,
  getA,
  getEntityImageUrl,
  isMediaActive,
  isSonosActive,
  t,
  formatDuration,
  getServerInfo
}) {
  if (!show) return null;

  const [sessionSensorIds, setSessionSensorIds] = useState(() => readJSON('tunet_media_session_sensors', []));
  useEffect(() => {
    if (Array.isArray(activeMediaSessionSensorIds)) {
      setSessionSensorIds(activeMediaSessionSensorIds);
      writeJSON('tunet_media_session_sensors', activeMediaSessionSensorIds);
    }
  }, [activeMediaSessionSensorIds]);

  useEffect(() => {
    writeJSON('tunet_media_session_sensors', sessionSensorIds);
  }, [sessionSensorIds]);

  const isSonosEntity = (entity) => {
    if (!entity) return false;
    const id = entity.entity_id || '';
    const name = (entity.attributes?.friendly_name || '').toLowerCase();
    const manufacturer = (entity.attributes?.manufacturer || '').toLowerCase();
    const platform = (entity.attributes?.platform || '').toLowerCase();
    return id.includes('sonos') || name.includes('sonos') || manufacturer.includes('sonos') || platform.includes('sonos');
  };

  const sonosIds = Object.keys(entities)
    .filter(id => id.startsWith('media_player.'))
    .filter(id => isSonosEntity(entities[id]));

  const isSonos = activeMediaModal === 'sonos';
  const allMediaIds = Object.keys(entities).filter(id => id.startsWith('media_player.'));
  const fallbackId = allMediaIds.map(id => entities[id]).find(isMediaActive)?.entity_id;
  const groupSettings = activeMediaGroupKey ? cardSettings[activeMediaGroupKey] : null;
  const groupIds = Array.isArray(activeMediaGroupIds) && activeMediaGroupIds.length > 0
    ? activeMediaGroupIds
    : (Array.isArray(groupSettings?.mediaIds) ? groupSettings.mediaIds : []);
  const mediaIds = isSonos ? sonosIds : (groupIds.length > 0 ? groupIds : (activeMediaId ? [activeMediaId] : (fallbackId ? [fallbackId] : [])));
  const mediaEntities = mediaIds.map(id => entities[id]).filter(Boolean);
  const isAllSonos = !activeMediaGroupIds && !isSonos && mediaEntities.length > 0 && mediaEntities.every(p => p.entity_id.startsWith('media_player.sonos'));
  const isGenericMedia = !isSonos;
  const treatAsSonos = isSonos || isAllSonos;

  const sessions = sessionSensorIds
    .map((id) => getA(id, 'sessions', []))
    .filter((arr) => Array.isArray(arr))
    .flat();

  const listPlayers = mediaEntities
    .filter((entity) => ['playing', 'paused'].includes(entity?.state))
    .slice()
    .sort((a, b) => {
      const aActive = treatAsSonos ? isSonosActive(a) : isMediaActive(a);
      const bActive = treatAsSonos ? isSonosActive(b) : isMediaActive(b);
      if (aActive !== bActive) return aActive ? -1 : 1;
      return (a.attributes?.friendly_name || '').localeCompare(b.attributes?.friendly_name || '');
    });

  let currentMp = mediaEntities.find(e => e.entity_id === activeMediaId);
  if (!currentMp) {
    const activePlayers = mediaEntities.filter(e => treatAsSonos ? isSonosActive(e) : isMediaActive(e));
    if (activePlayers.length > 0) currentMp = activePlayers[0];
    else currentMp = mediaEntities[0];
  }

  if (!currentMp) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 font-sans" style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} onClick={onClose}>
        <div className="w-full max-w-2xl rounded-3xl md:rounded-[4rem] p-6 md:p-12 shadow-2xl relative border backdrop-blur-xl popup-anim" style={{background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)'}} onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 modal-close z-20"><X className="w-4 h-4" /></button>
          <div className="text-[var(--text-primary)] text-center">{t('media.noPlayerFound')}</div>
        </div>
      </div>
    );
  }

  const mpId = currentMp.entity_id;
  const mpState = currentMp.state;
  const contentType = getA(mpId, 'media_content_type');
  const isChannel = contentType === 'channel';
  const isPlaying = mpState === 'playing';

  let mpTitle = getA(mpId, 'media_title');

  let mpSeries = getA(mpId, 'media_series_title');
  if (contentType === 'episode') {
    const season = getA(mpId, 'media_season');
    if (mpSeries && season) mpSeries = `${mpSeries} • ${season}`;
    else if (!mpSeries && season) mpSeries = season;
  }
  if (!mpSeries) mpSeries = getA(mpId, 'media_artist') || getA(mpId, 'media_season');

  const mpPicture = getEntityImageUrl(currentMp.attributes?.entity_picture);
  const activeUser = (() => {
    const match = Array.isArray(sessions)
      ? sessions.find((entry) => {
          const device = entry?.device_name || '';
          const name = currentMp?.attributes?.friendly_name || '';
          if (!device || !name) return false;
          return name.toLowerCase().includes(device.toLowerCase());
        })
      : null;
    return match?.user_name || '';
  })();
  const duration = getA(mpId, 'media_duration');
  const position = getA(mpId, 'media_position');
  const positionUpdatedAt = getA(mpId, 'media_position_updated_at');
  const serverInfo = getServerInfo(mpId);
  const serverLabel = isGenericMedia ? (serverInfo.name || t('addCard.type.media')) : 'SONOS';
  const ServerBadgeIcon = isGenericMedia ? (serverInfo.icon || Music) : Music;
  const groupCardId = (activeMediaGroupKey && activeMediaGroupKey.includes('::'))
    ? activeMediaGroupKey.split('::').slice(1).join('::')
    : null;
  const popupHeading = (isGenericMedia && groupCardId && customNames[groupCardId])
    ? customNames[groupCardId]
    : serverLabel;

  const basePosition = typeof position === 'number' ? position : 0;
  const updatedAtMs = positionUpdatedAt ? new Date(positionUpdatedAt).getTime() : null;
  const elapsed = isPlaying && Number.isFinite(updatedAtMs)
    ? Math.max(0, (mediaTick - updatedAtMs) / 1000)
    : 0;
  const effectivePosition = Math.min(duration || basePosition, basePosition + elapsed);

  const volume = getA(mpId, 'volume_level', 0);
  const isMuted = getA(mpId, 'is_volume_muted', false);
  const shuffle = getA(mpId, 'shuffle', false);
  const repeat = getA(mpId, 'repeat', 'off');
  const rawMembers = getA(mpId, 'group_members');
  const groupMembers = Array.isArray(rawMembers) ? rawMembers : [];
  const canGroup = treatAsSonos;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 font-sans" style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} onClick={onClose}>
      <div className="w-full max-w-5xl rounded-3xl md:rounded-[4rem] p-6 md:p-12 shadow-2xl relative max-h-[95vh] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row gap-6 md:gap-12 border backdrop-blur-xl popup-anim" style={{background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)'}} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 modal-close z-20"><X className="w-4 h-4" /></button>

        <div className="flex-1 flex flex-col justify-center relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 rounded-2xl transition-all duration-500" style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-secondary)' }}>
              {isChannel ? <Tv className="w-8 h-8" /> : (isSonos ? <Speaker className="w-8 h-8" /> : <Music className="w-8 h-8" />)}
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none truncate">
                {activeUser ? `${activeUser} - ${currentMp.attributes?.friendly_name || mpId}` : (currentMp.attributes?.friendly_name || mpId)}
              </h3>
              <div className="mt-2 px-3 py-1 rounded-full border inline-flex items-center gap-2" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>
                <div className={`w-1.5 h-1.5 rounded-full ${mpState === 'playing' ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : (mpState === 'paused' ? 'bg-amber-400' : 'bg-slate-600')}`} />
                <span className="text-[10px] uppercase font-bold italic tracking-widest">
                  {popupHeading || mpState}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border self-start ${treatAsSonos ? 'bg-[var(--glass-bg)] border-[var(--glass-border)]' : (serverInfo.bg + ' ' + serverInfo.border)} `}>
              {treatAsSonos ? <Music className="w-4 h-4 text-[var(--text-primary)]" /> : <ServerBadgeIcon className={`w-4 h-4 ${serverInfo.color}`} />}
              <span className={`text-xs font-bold uppercase tracking-widest ${treatAsSonos ? 'text-[var(--text-primary)]' : serverInfo.color}`}>{treatAsSonos ? 'SONOS' : serverLabel}</span>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="aspect-[16/9] w-full rounded-3xl overflow-hidden border border-[var(--glass-border)] shadow-2xl bg-[var(--glass-bg)] relative group">
              {mpPicture ? <img src={mpPicture} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{isChannel ? <Tv className="w-20 h-20 text-gray-700" /> : (isSonos ? <Speaker className="w-20 h-20 text-gray-700" /> : <Music className="w-20 h-20 text-gray-700" />)}</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-0 left-0 w-full p-8">
                <p className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-2">
                  {activeUser ? `${activeUser} - ${currentMp.attributes?.friendly_name || mpId}` : (currentMp.attributes?.friendly_name || mpId)}
                </p>
                <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-2 line-clamp-2">{mpTitle || t('common.unknown')}</h2>
                <p className="text-xl text-gray-300 font-medium">{mpSeries}</p>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between text-xs font-bold text-gray-500 tracking-widest px-1">
                <span>{formatDuration(effectivePosition)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
              <M3Slider variant="thin" min={0} max={duration || 100} step={1} value={effectivePosition || 0} disabled={!duration} onChange={(e) => callService("media_player", "media_seek", { entity_id: mpId, seek_position: parseFloat(e.target.value) })} colorClass="bg-white" />

              {isSonos ? (
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex items-center justify-center gap-6">
                    <button onClick={() => callService("media_player", "shuffle_set", { entity_id: mpId, shuffle: !shuffle })} className={`p-2 rounded-full transition-colors ${shuffle ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}><Shuffle className="w-4 h-4" /></button>

                    <button onClick={() => callService("media_player", "media_previous_track", { entity_id: mpId })} className="p-2 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95"><SkipBack className="w-5 h-5 text-[var(--text-secondary)]" /></button>
                    <button onClick={() => callService("media_player", "media_play_pause", { entity_id: mpId })} className="p-3 rounded-full transition-colors active:scale-95 shadow-lg bg-[var(--text-primary)]">
                      {isPlaying ? <Pause className="w-6 h-6" color="var(--bg-primary)" fill="var(--bg-primary)" /> : <Play className="w-6 h-6 ml-0.5" color="var(--bg-primary)" fill="var(--bg-primary)" />}
                    </button>
                    <button onClick={() => callService("media_player", "media_next_track", { entity_id: mpId })} className="p-2 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95"><SkipForward className="w-5 h-5 text-[var(--text-secondary)]" /></button>

                    <button onClick={() => { const modes = ['off', 'one', 'all']; const nextMode = modes[(modes.indexOf(repeat) + 1) % modes.length]; callService("media_player", "repeat_set", { entity_id: mpId, repeat: nextMode }); }} className={`p-2 rounded-full transition-colors ${repeat !== 'off' ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                      {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 px-2 pt-2 border-t border-[var(--glass-border)]">
                    <button onClick={() => callService("media_player", "volume_mute", { entity_id: mpId, is_volume_muted: !isMuted })} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      {isMuted ? <VolumeX className="w-4 h-4" /> : (volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />)}
                    </button>
                    <M3Slider variant="volume" min={0} max={100} step={1} value={volume * 100} onChange={(e) => callService("media_player", "volume_set", { entity_id: mpId, volume_level: parseFloat(e.target.value) / 100 })} colorClass="bg-white" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex items-center justify-center gap-8">
                    <button onClick={() => callService("media_player", "media_previous_track", { entity_id: mpId })} className="p-4 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95"><SkipBack className="w-8 h-8 text-[var(--text-secondary)]" /></button>
                    <button onClick={() => callService("media_player", "media_play_pause", { entity_id: mpId })} className="p-6 rounded-full transition-colors active:scale-95 shadow-lg bg-[var(--text-primary)]">
                      {isPlaying ? <Pause className="w-8 h-8" color="var(--bg-primary)" fill="var(--bg-primary)" /> : <Play className="w-8 h-8 ml-1" color="var(--bg-primary)" fill="var(--bg-primary)" />}
                    </button>
                    <button onClick={() => callService("media_player", "media_next_track", { entity_id: mpId })} className="p-4 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95"><SkipForward className="w-8 h-8 text-[var(--text-secondary)]" /></button>
                  </div>
                  <div className="flex items-center gap-3 px-2 pt-2 border-t border-[var(--glass-border)]">
                    <button onClick={() => callService("media_player", "volume_mute", { entity_id: mpId, is_volume_muted: !isMuted })} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                      {isMuted ? <VolumeX className="w-4 h-4" /> : (volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />)}
                    </button>
                    <M3Slider variant="volume" min={0} max={100} step={1} value={volume * 100} onChange={(e) => callService("media_player", "volume_set", { entity_id: mpId, volume_level: parseFloat(e.target.value) / 100 })} colorClass="bg-white" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[var(--glass-border)] pt-6 md:pt-24 pl-0 md:pl-12 flex flex-col gap-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">{(isSonos || isAllSonos) ? t('media.group.sonosPlayers') : t('media.group.selectedPlayers')}</h3>
            {canGroup && listPlayers.length > 1 && (
              <button
                onClick={() => {
                  const allIds = listPlayers.map(p => p.entity_id);
                  const unjoined = allIds.filter(id => !groupMembers.includes(id));
                  if (unjoined.length > 0) {
                    callService("media_player", "join", { entity_id: mpId, group_members: unjoined });
                  } else {
                    const others = groupMembers.filter(id => id !== mpId);
                    others.forEach(id => callService("media_player", "unjoin", { entity_id: id }));
                  }
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-white transition-colors"
              >
                {listPlayers.every(p => groupMembers.includes(p.entity_id)) ? t('sonos.ungroupAll') : t('sonos.groupAll')}
              </button>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {listPlayers.length === 0 && <p className="text-gray-600 italic text-sm">{t('media.noPlayersFound')}</p>}
            {listPlayers.map((p, idx) => {
              const pPic = getEntityImageUrl(p.attributes?.entity_picture);
              const isSelected = p.entity_id === mpId;
              const isMember = groupMembers.includes(p.entity_id);
              const isSelf = p.entity_id === mpId;
              const isActivePlayer = treatAsSonos ? isSonosActive(p) : isMediaActive(p);
              const pTitle = getA(p.entity_id, 'media_title', t('common.unknown'));
              const pUser = (() => {
                const s = Array.isArray(sessions) ? sessions.find(s => s.device_name && (p.attributes?.friendly_name || '').toLowerCase().includes(s.device_name.toLowerCase())) : null;
                return s?.user_name || '';
              })();

              return (
                <div key={p.entity_id || idx} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${isSelected ? 'bg-[var(--glass-bg-hover)] border-[var(--glass-border)]' : 'hover:bg-[var(--glass-bg)] border-transparent'} ${isActivePlayer ? '' : 'opacity-70'}`}>
                  <button onClick={() => setActiveMediaId(p.entity_id)} className="flex-1 flex items-center gap-4 text-left min-w-0 group">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--glass-bg)] flex-shrink-0 relative">
                      {pPic ? <img src={pPic} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{isSonos ? <Speaker className="w-5 h-5 text-gray-600" /> : <Music className="w-5 h-5 text-gray-600" />}</div>}
                      {p.state === 'playing' && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /></div>}
                    </div>
                    <div className="overflow-hidden">
                      <p className={`text-xs font-bold uppercase tracking-wider truncate ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{p.attributes.friendly_name || p.entity_id}</p>
                      <p className="text-[10px] text-gray-600 truncate mt-0.5">{pTitle}</p>
                      {pUser && <p className="text-[10px] text-gray-500 truncate">{pUser}</p>}
                    </div>
                  </button>
                  {canGroup && !isSelf && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMember) {
                          callService("media_player", "unjoin", { entity_id: p.entity_id });
                        } else {
                          callService("media_player", "join", { entity_id: mpId, group_members: [p.entity_id] });
                        }
                      }}
                      className={`p-2.5 rounded-full transition-all ${isMember ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--glass-bg)] text-gray-500 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                      title={isMember ? t('tooltip.removeFromGroup') : t('tooltip.addToGroup')}
                    >
                      {isMember ? <Link className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  )}
                  {canGroup && isSelf && groupMembers.length > 1 && (
                    <div className="p-2.5 rounded-full bg-blue-500/20 text-blue-400" title={t('tooltip.linked')}>
                      <Link className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
