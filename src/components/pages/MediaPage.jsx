import { useCallback, useEffect, useState } from 'react';
import M3Slider from '../ui/M3Slider';
import {
  Music,
  Tv,
  Speaker,
  Check,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Repeat,
  Repeat1,
  SkipBack,
  Pause,
  Play,
  SkipForward,
  Power,
  VolumeX,
  Volume1,
  Volume2,
  Link,
  Plus,
  Heart
} from '../../icons';
import { getMediaPlayerPowerAction } from '../../utils/mediaPlayerFeatures';

export default function MediaPage({
  pageId,
  entities,
  conn,
  pageSettings,
  editMode,
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
  const [mediaSearch, setMediaSearch] = useState('');
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [rightPanelView, setRightPanelView] = useState('players');
  const [chooseQuery, setChooseQuery] = useState('');
  const [favoritesByPlayer, setFavoritesByPlayer] = useState({});
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const pageSetting = pageSettings[pageId] || {};
  const allMediaIds = Object.keys(entities).filter(id => id.startsWith('media_player.'));
  const showAll = !Array.isArray(pageSetting.mediaIds);
  const selectedIds = showAll ? allMediaIds : pageSetting.mediaIds;
  const visibleIds = selectedIds.length > 0 ? selectedIds : [];
  const mediaEntities = visibleIds.map(id => entities[id]).filter(Boolean);

  const isSonosEntity = (entity) => {
    if (!entity) return false;
    const manufacturer = (entity.attributes?.manufacturer || '').toLowerCase();
    const platform = (entity.attributes?.platform || '').toLowerCase();
    if (manufacturer.includes('sonos') || platform.includes('sonos')) return true;
    const entityId = (entity.entity_id || '').toLowerCase();
    const friendlyName = (entity.attributes?.friendly_name || '').toLowerCase();
    return entityId.includes('sonos') || friendlyName.includes('sonos');
  };

  const sonosEntities = mediaEntities.filter(isSonosEntity);
  const filteredMediaIds = allMediaIds.filter((id) => {
    if (!mediaSearch) return true;
    const lower = mediaSearch.toLowerCase();
    const name = entities[id]?.attributes?.friendly_name || id;
    return id.toLowerCase().includes(lower) || name.toLowerCase().includes(lower);
  });

  const activeSonos = sonosEntities.filter(isSonosActive);
  let currentMp = mediaEntities.find(e => e.entity_id === pageSetting.activeId) || mediaEntities.find(e => e.entity_id === activeMediaId);
  if (!currentMp) currentMp = activeSonos[0] || mediaEntities[0];

  const mpId = currentMp?.entity_id || null;
  const mpState = currentMp?.state || null;
  const isPlaying = mpState === 'playing';
  const mpTitle = mpId ? getA(mpId, 'media_title') : null;
  const mpSeries = mpId ? (getA(mpId, 'media_artist') || getA(mpId, 'media_album_name')) : null;
  const mpName = currentMp?.attributes?.friendly_name || mpId || '';
  const isTV = mpId ? (getA(mpId, 'media_content_type') === 'channel' || getA(mpId, 'device_class') === 'tv') : false;
  const powerAction = currentMp ? getMediaPlayerPowerAction(currentMp) : null;
  const canTogglePower = Boolean(powerAction);
  const isPowerOffAction = powerAction === 'turn_off';

  const mpPicture = currentMp ? getEntityImageUrl(currentMp.attributes?.entity_picture) : null;
  const duration = mpId ? getA(mpId, 'media_duration') : null;
  const position = mpId ? getA(mpId, 'media_position') : null;
  const positionUpdatedAt = mpId ? getA(mpId, 'media_position_updated_at') : null;
  const volume = mpId ? getA(mpId, 'volume_level', 0) : 0;
  const isMuted = mpId ? getA(mpId, 'is_volume_muted', false) : false;
  const shuffle = mpId ? getA(mpId, 'shuffle', false) : false;
  const repeat = mpId ? getA(mpId, 'repeat', 'off') : 'off';

  const [playheadNow, setPlayheadNow] = useState(() => Date.now());

  useEffect(() => {
    setPlayheadNow(Date.now());
    if (!mpId || !isPlaying) return;
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
  const groupedOthers = groupMembers.filter((id) => id !== mpId);
  const hasGroupedOthers = groupedOthers.length > 0;

  const normalizeChoice = useCallback((item, fallbackType) => {
    if (!item) return null;
    if (typeof item === 'string') {
      const value = item.trim();
      if (!value) return null;
      return {
        id: value,
        label: value,
        type: fallbackType,
      };
    }
    if (typeof item !== 'object') return null;

    const id = item.media_content_id || item.id || item.uri || item.url || item.value;
    if (!id || typeof id !== 'string') return null;

    const label = item.title || item.name || item.friendly_name || item.label || id;
    const type = item.media_content_type || item.type || fallbackType;
    const source = item.provider || item.source || item.app_name || item.domain || '';
    const image = item.thumbnail || item.thumb || item.image || item.icon || null;
    return { id, label: String(label), type: String(type), source, image };
  }, []);

  const normalizeChoiceArray = useCallback((raw, fallbackType) => {
    const array = Array.isArray(raw) ? raw : [];
    const deduped = new Map();
    array.forEach((item) => {
      const normalized = normalizeChoice(item, fallbackType);
      if (!normalized) return;
      const key = `${normalized.type}::${normalized.id}`;
      if (!deduped.has(key)) deduped.set(key, normalized);
    });
    return [...deduped.values()];
  }, [normalizeChoice]);

  const attrFavoriteChoices = normalizeChoiceArray(getA(mpId, 'sonos_favorites', []), 'music');
  const sourceListChoices = normalizeChoiceArray(
    (Array.isArray(getA(mpId, 'source_list', [])) ? getA(mpId, 'source_list', []) : [])
      .map((source) => ({ title: source, id: source, media_content_type: 'music' })),
    'music'
  );
  const playlistFallbackChoices = normalizeChoiceArray(getA(mpId, 'sonos_playlists', []), 'playlist');
  const favoriteChoices = favoritesByPlayer[mpId] || attrFavoriteChoices;
  const loweredChooseQuery = chooseQuery.trim().toLowerCase();
  const filteredChooseChoices = loweredChooseQuery
    ? favoriteChoices.filter((choice) => choice.label.toLowerCase().includes(loweredChooseQuery) || choice.id.toLowerCase().includes(loweredChooseQuery))
    : favoriteChoices;

  const sonosAllIds = allMediaIds.filter((id) => isSonosEntity(entities[id]));
  const manageablePlayerIds = sonosAllIds
    .slice()
    .sort((a, b) => {
      const aName = entities[a]?.attributes?.friendly_name || a;
      const bName = entities[b]?.attributes?.friendly_name || b;
      return aName.localeCompare(bName);
    });

  const isPlayerAdded = (id) => (showAll ? allMediaIds.includes(id) : selectedIds.includes(id));

  const removePlayerSelection = (id) => {
    if (showAll) {
      const next = allMediaIds.filter(item => item !== id);
      savePageSetting(pageId, 'mediaIds', next);
      if (id === mpId && next.length > 0) setActiveMediaId(next[0]);
      return;
    }

    const next = selectedIds.filter(item => item !== id);
    savePageSetting(pageId, 'mediaIds', next);
    if (id === mpId && next.length > 0) setActiveMediaId(next[0]);
  };

  const addPlayerSelection = (id) => {
    if (showAll) return;
    if (selectedIds.includes(id)) return;
    savePageSetting(pageId, 'mediaIds', [...selectedIds, id]);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchFavorites = async () => {
      if (rightPanelView !== 'choose' || !mpId) return;
      if (favoritesByPlayer[mpId]?.length > 0) return;

      setFavoritesLoading(true);
      try {
        if (!conn || typeof conn.sendMessagePromise !== 'function') {
          if (!cancelled) {
            setFavoritesByPlayer((prev) => ({
              ...prev,
              [mpId]: normalizeChoiceArray([
                ...attrFavoriteChoices,
                ...sourceListChoices,
                ...playlistFallbackChoices,
              ], 'music')
            }));
          }
          return;
        }

        const rootResp = await conn.sendMessagePromise({ type: 'media_player/browse_media', entity_id: mpId });
        const root = rootResp?.result || rootResp || null;
        const rootChildren = Array.isArray(root?.children) ? root.children : [];
        const favoritesDir = rootChildren.find((child) => {
          const type = String(child?.media_content_type || '').toLowerCase();
          const id = String(child?.media_content_id || '').toLowerCase();
          const title = String(child?.title || '').toLowerCase();
          return type === 'favorites' || id === 'favorites' || title.includes('favorite');
        });

        if (!favoritesDir) {
          if (!cancelled) {
            setFavoritesByPlayer((prev) => ({
              ...prev,
              [mpId]: normalizeChoiceArray([
                ...attrFavoriteChoices,
                ...sourceListChoices,
                ...playlistFallbackChoices,
              ], 'music')
            }));
          }
          return;
        }

        const allFavorites = [];
        const browseFavDir = async (dir) => {
          const resp = await conn.sendMessagePromise({
            type: 'media_player/browse_media',
            entity_id: mpId,
            media_content_type: dir.media_content_type,
            media_content_id: dir.media_content_id,
          });
          const detail = resp?.result || resp || null;
          const children = Array.isArray(detail?.children) ? detail.children : [];
          for (const child of children) {
            if (child?.can_play) {
              allFavorites.push({
                id: child.media_content_id || child.title,
                label: child.title || child.media_content_id,
                type: child.media_content_type || 'music',
                source: detail?.title || 'Favorites',
                image: child.thumbnail || null,
              });
            } else if (child?.can_expand) {
              await browseFavDir(child);
            }
          }
        };

        await browseFavDir(favoritesDir);
        const merged = normalizeChoiceArray([
          ...allFavorites,
          ...attrFavoriteChoices,
          ...sourceListChoices,
          ...playlistFallbackChoices,
        ], 'music');
        if (!cancelled) setFavoritesByPlayer((prev) => ({ ...prev, [mpId]: merged }));
      } catch {
        if (!cancelled) {
          setFavoritesByPlayer((prev) => ({
            ...prev,
            [mpId]: normalizeChoiceArray([
              ...attrFavoriteChoices,
              ...sourceListChoices,
              ...playlistFallbackChoices,
            ], 'music')
          }));
        }
      } finally {
        if (!cancelled) setFavoritesLoading(false);
      }
    };

    fetchFavorites();
    return () => {
      cancelled = true;
    };
  }, [
    rightPanelView,
    mpId,
    conn,
    favoritesByPlayer,
    normalizeChoiceArray,
    attrFavoriteChoices,
    sourceListChoices,
    playlistFallbackChoices,
  ]);

  const listPlayers = mediaEntities
    .slice()
    .sort((a, b) => {
      const aActive = isSonosEntity(a) ? isSonosActive(a) : a?.state === 'playing';
      const bActive = isSonosEntity(b) ? isSonosActive(b) : b?.state === 'playing';
      if (aActive !== bActive) return aActive ? -1 : 1;
      return (a.attributes?.friendly_name || '').localeCompare(b.attributes?.friendly_name || '');
    });

  const toggleGroupAll = () => {
    const allIds = listPlayers.map((player) => player.entity_id);
    const otherIds = allIds.filter((id) => id !== mpId);
    if (hasGroupedOthers) {
      groupedOthers.forEach((id) => callService('media_player', 'unjoin', { entity_id: id }));
      return;
    }
    if (otherIds.length > 0) {
      callService('media_player', 'join', { entity_id: mpId, group_members: otherIds });
    }
  };

  return (
    <div key={pageId} className="flex flex-col gap-8 font-sans fade-in-anim items-start">
      {mediaEntities.length === 0 && (
        <div className="w-full rounded-3xl popup-surface p-8 text-center text-[var(--text-secondary)]">
          {t('media.noPlayersFound')}
        </div>
      )}
      {editMode && (
        <div className="w-full rounded-3xl border border-[var(--glass-border)] popup-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{t('media.selectPlayers')}</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{t('media.selectPlayersHint')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPlayerSelector((prev) => !prev)}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest popup-surface popup-surface-hover text-[var(--text-secondary)] inline-flex items-center gap-1.5"
              >
                {showPlayerSelector ? (t('common.hide') || 'Hide') : (t('common.show') || 'Show')}
                {showPlayerSelector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => savePageSetting(pageId, 'mediaIds', null)}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest popup-surface popup-surface-hover text-[var(--text-secondary)]"
              >
                {t('media.selectAll')}
              </button>
              <button
                onClick={() => savePageSetting(pageId, 'mediaIds', [])}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest popup-surface popup-surface-hover text-[var(--text-secondary)]"
              >
                {t('media.clearSelection')}
              </button>
            </div>
          </div>

          {showPlayerSelector ? (
            <div className="w-full lg:max-w-2xl lg:mx-auto">
              <div className="mb-3 relative">
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder={t('addCard.search')}
                  className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl pl-4 pr-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--glass-border)] transition-colors"
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {filteredMediaIds.map((id) => {
                  const entity = entities[id];
                  const isSelected = showAll ? true : selectedIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (showAll) {
                          const next = allMediaIds.filter(item => item !== id);
                          savePageSetting(pageId, 'mediaIds', next);
                          return;
                        }
                        const next = selectedIds.includes(id)
                          ? selectedIds.filter(item => item !== id)
                          : [...selectedIds, id];
                        savePageSetting(pageId, 'mediaIds', next);
                      }}
                      className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${isSelected ? '' : 'popup-surface popup-surface-hover border-transparent'}`}
                      style={isSelected ? {
                        backgroundColor: 'var(--glass-bg-hover)',
                        borderColor: 'var(--glass-border)'
                      } : undefined}
                    >
                      <div className="flex flex-col overflow-hidden mr-4">
                        <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                          {entity?.attributes?.friendly_name || id}
                        </span>
                        <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>
                          {id}
                        </span>
                      </div>
                      <div
                        className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? '' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}
                        style={isSelected ? {
                          backgroundColor: 'var(--glass-bg)',
                          color: 'var(--text-primary)'
                        } : undefined}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
                {filteredMediaIds.length === 0 && (
                  <div className="text-xs text-[var(--text-muted)] italic text-center py-2">
                    {t('form.noResults')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full lg:max-w-2xl lg:mx-auto text-[11px] text-[var(--text-muted)] text-center">
              {(showAll ? allMediaIds.length : selectedIds.length)} {t('addCard.players')} {t('common.selected') || 'selected'}
            </div>
          )}
        </div>
      )}

      {mediaEntities.length > 0 && (
      <div className="w-full grid grid-cols-1 lg:grid-cols-[1.35fr_0.85fr] gap-8 items-stretch">
      <div className="rounded-3xl border border-[var(--glass-border)] popup-surface p-8 flex flex-col min-h-[480px] w-full min-w-0">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <Music className="w-4 h-4 text-[var(--text-primary)]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">{t('sonos.pageName')}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-8 md:gap-12 items-center">
          <div className="flex-shrink-0 flex justify-center md:justify-start">
            {mpPicture ? (
              <img src={mpPicture} alt="" className="w-52 h-52 lg:w-56 lg:h-56 xl:w-72 xl:h-72 object-cover rounded-2xl shadow-2xl" />
            ) : (
              <div className="w-52 h-52 lg:w-56 lg:h-56 xl:w-72 xl:h-72 flex items-center justify-center rounded-2xl bg-[var(--glass-bg)]">
                {isTV ? <Tv className="w-24 h-24 text-gray-700" /> : <Speaker className="w-24 h-24 text-gray-700" />}
              </div>
            )}
          </div>

          <div className="flex-1 w-full flex flex-col justify-center md:justify-between gap-4 lg:gap-5 xl:gap-6 min-w-0">
            <div className="space-y-2 text-center md:text-left">
              {mpName && (
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  {mpName}
                </p>
              )}
              <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)] leading-none truncate">{mpTitle || t('common.unknown')}</h2>
              <p className="text-base lg:text-lg xl:text-xl text-[var(--text-secondary)] font-medium truncate">{mpSeries || ''}</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-[var(--text-secondary)] tracking-widest">
                  <span>{formatDuration(effectivePosition)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
                <M3Slider variant="thin" min={0} max={duration || 100} step={1} value={effectivePosition || 0} disabled={!duration} onChange={(e) => callService('media_player', 'media_seek', { entity_id: mpId, seek_position: parseFloat(e.target.value) })} colorClass="bg-white" />
              </div>

              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-[clamp(0.25rem,1vw,0.75rem)]">
                <button
                  onClick={() => callService('media_player', 'shuffle_set', { entity_id: mpId, shuffle: !shuffle })}
                  className={`p-[clamp(0.25rem,1vw,0.5rem)] rounded-full transition-all active:scale-95 ${shuffle ? '' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                  style={shuffle ? {
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--glass-bg-hover)'
                  } : undefined}
                  title="Shuffle"
                >
                  <Shuffle className="w-[clamp(0.9rem,2vw,1rem)] h-[clamp(0.9rem,2vw,1rem)]" />
                </button>
                <div className="min-w-0 flex items-center justify-center gap-[clamp(0.2rem,1.3vw,1rem)]">
                  <button onClick={() => callService('media_player', 'media_previous_track', { entity_id: mpId })} className="p-[clamp(0.2rem,1vw,0.5rem)] hover:bg-[var(--glass-bg-hover)] rounded-full transition-all active:scale-95"><SkipBack className="w-[clamp(1.1rem,2.6vw,1.5rem)] h-[clamp(1.1rem,2.6vw,1.5rem)] text-[var(--text-secondary)]" /></button>
                  <button onClick={() => callService('media_player', 'media_play_pause', { entity_id: mpId })} className="p-[clamp(0.3rem,1.2vw,0.75rem)] rounded-full transition-all active:scale-95 shadow-lg hover:shadow-xl hover:scale-105 bg-[var(--text-primary)]">
                    {isPlaying ? <Pause className="w-[clamp(1.1rem,2.8vw,1.75rem)] h-[clamp(1.1rem,2.8vw,1.75rem)]" color="var(--bg-primary)" fill="var(--bg-primary)" /> : <Play className="w-[clamp(1.1rem,2.8vw,1.75rem)] h-[clamp(1.1rem,2.8vw,1.75rem)] ml-0.5" color="var(--bg-primary)" fill="var(--bg-primary)" />}
                  </button>
                  <button onClick={() => callService('media_player', 'media_next_track', { entity_id: mpId })} className="p-[clamp(0.2rem,1vw,0.5rem)] hover:bg-[var(--glass-bg-hover)] rounded-full transition-all active:scale-95"><SkipForward className="w-[clamp(1.1rem,2.6vw,1.5rem)] h-[clamp(1.1rem,2.6vw,1.5rem)] text-[var(--text-secondary)]" /></button>
                  {canTogglePower && (
                    <button
                      onClick={() => callService('media_player', powerAction, { entity_id: mpId })}
                      className={`p-[clamp(0.2rem,1vw,0.5rem)] rounded-full transition-all active:scale-95 ${isPowerOffAction ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                      title={isPowerOffAction ? t('status.off') : t('status.on')}
                    >
                      <Power className="w-[clamp(1.1rem,2.6vw,1.5rem)] h-[clamp(1.1rem,2.6vw,1.5rem)]" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { const modes = ['off', 'one', 'all']; const nextMode = modes[(modes.indexOf(repeat) + 1) % modes.length]; callService('media_player', 'repeat_set', { entity_id: mpId, repeat: nextMode }); }}
                  className={`p-[clamp(0.25rem,1vw,0.5rem)] rounded-full transition-all active:scale-95 ${repeat !== 'off' ? '' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                  style={repeat !== 'off' ? {
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--glass-bg-hover)'
                  } : undefined}
                  title="Repeat"
                >
                  {repeat === 'one' ? <Repeat1 className="w-[clamp(0.9rem,2vw,1rem)] h-[clamp(0.9rem,2vw,1rem)]" /> : <Repeat className="w-[clamp(0.9rem,2vw,1rem)] h-[clamp(0.9rem,2vw,1rem)]" />}
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

      {mediaEntities.length > 0 && (
      <div className="rounded-3xl border border-[var(--glass-border)] popup-surface p-6 min-h-[480px] max-h-[480px] flex flex-col w-full min-w-0">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl popup-surface border border-[var(--glass-border)]">
            <button
              type="button"
              onClick={() => setRightPanelView('players')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelView === 'players' ? 'border' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              style={rightPanelView === 'players' ? {
                color: 'var(--text-primary)',
                backgroundColor: 'var(--glass-bg-hover)',
                borderColor: 'var(--glass-border)'
              } : undefined}
            >
              {t('media.tab.players')}
            </button>
            <button
              type="button"
              onClick={() => setRightPanelView('choose')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelView === 'choose' ? 'border' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              style={rightPanelView === 'choose' ? {
                color: 'var(--text-primary)',
                backgroundColor: 'var(--glass-bg-hover)',
                borderColor: 'var(--glass-border)'
              } : undefined}
            >
              {t('media.tab.media')}
            </button>
            <button
              type="button"
              onClick={() => setRightPanelView('manage')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${rightPanelView === 'manage' ? 'border' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              style={rightPanelView === 'manage' ? {
                color: 'var(--text-primary)',
                backgroundColor: 'var(--glass-bg-hover)',
                borderColor: 'var(--glass-border)'
              } : undefined}
            >
              {t('media.tab.manage')}
            </button>
          </div>
          {rightPanelView === 'players' && listPlayers.length > 1 && (
            <button
              onClick={toggleGroupAll}
              className="px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border transition-colors"
              style={{
                backgroundColor: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-secondary)'
              }}
              title={hasGroupedOthers ? t('sonos.ungroupAll') : t('sonos.groupAll')}
              aria-label={hasGroupedOthers ? t('sonos.ungroupAll') : t('sonos.groupAll')}
            >
              <Link className="w-4 h-4" />
              <span>{hasGroupedOthers ? t('sonos.ungroupShort') : t('sonos.groupShort')}</span>
            </button>
          )}
        </div>
        {rightPanelView === 'players' && (
          <>
            <div className="flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
              {listPlayers.map((p, idx) => {
            const pPic = getEntityImageUrl(p.attributes?.entity_picture);
            const isSelected = p.entity_id === mpId;
            const isMember = groupMembers.includes(p.entity_id);
            const isSelf = p.entity_id === mpId;
            const isSonos = isSonosEntity(p);
            const isActivePlayer = isSonos ? isSonosActive(p) : p?.state === 'playing';
            const pTitle = getA(p.entity_id, 'media_title', t('common.unknown'));

            return (
              <div key={p.entity_id || idx} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${isSelected ? 'bg-[var(--glass-bg-hover)] border-[var(--glass-border)]' : 'hover:bg-[var(--glass-bg)] border-transparent'} ${isActivePlayer ? '' : 'opacity-70'}`}>
                <button onClick={() => { savePageSetting(pageId, 'activeId', p.entity_id); setActiveMediaId(p.entity_id); }} className="flex-1 flex items-center gap-4 text-left min-w-0 group">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--glass-bg)] flex-shrink-0 relative">
                    {pPic ? <img src={pPic} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Speaker className="w-5 h-5 text-gray-600" /></div>}
                    {p.state === 'playing' && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /></div>}
                  </div>
                  <div className="overflow-hidden">
                    <p className={`text-xs font-bold uppercase tracking-wider truncate ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{p.attributes.friendly_name || p.entity_id}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{pTitle}</p>
                  </div>
                </button>
                {!isSelf && listPlayers.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMember) {
                        callService('media_player', 'unjoin', { entity_id: p.entity_id });
                      } else {
                        callService('media_player', 'join', { entity_id: mpId, group_members: [p.entity_id] });
                      }
                    }}
                    className={`p-2.5 rounded-full transition-all ${isMember ? '' : 'bg-[var(--glass-bg)] text-gray-500 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                    style={isMember ? {
                      backgroundColor: 'var(--glass-bg-hover)',
                      color: 'var(--text-primary)',
                      boxShadow: 'none'
                    } : undefined}
                    title={isMember ? t('tooltip.removeFromGroup') : t('tooltip.addToGroup')}
                  >
                    {isMember ? <Link className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                )}
                {isSelf && listPlayers.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroupAll();
                    }}
                    className="p-2.5 rounded-full transition-colors"
                    style={{
                      backgroundColor: 'var(--glass-bg)',
                      color: 'var(--text-secondary)'
                    }}
                    title={hasGroupedOthers ? t('sonos.ungroupAll') : t('sonos.groupAll')}
                  >
                    <Link className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
              })}
            </div>
          </>
        )}
        {rightPanelView === 'choose' && (
          <div className="flex flex-col gap-3 overflow-y-auto flex-1 custom-scrollbar">
            <input
              type="text"
              value={chooseQuery}
              onChange={(e) => setChooseQuery(e.target.value)}
              placeholder={t('media.choose.tab.search')}
              className="w-full bg-[var(--glass-bg)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none"
            />
            <div className="space-y-2">
              {favoritesLoading && (
                <div className="text-xs text-[var(--text-muted)] italic text-center py-2">
                  {t('media.choose.loading')}
                </div>
              )}
              {!favoritesLoading && filteredChooseChoices.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {filteredChooseChoices.map((choice) => (
                    <button
                      key={`${choice.type}::${choice.id}`}
                      type="button"
                      onClick={() => {
                        callService('media_player', 'play_media', {
                          entity_id: mpId,
                          media_content_id: choice.id,
                          media_content_type: choice.type || 'music',
                        });
                      }}
                      className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-[var(--glass-bg-hover)] transition-colors group"
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-[var(--glass-bg-hover)] flex-shrink-0">
                        {choice.image ? (
                          <img src={getEntityImageUrl(choice.image) || choice.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Heart className="w-6 h-6 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
                          </div>
                        )}
                      </div>
                      <p className="w-full text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)] text-center line-clamp-2 leading-tight">{choice.label}</p>
                    </button>
                  ))}
                </div>
              )}
              {!favoritesLoading && filteredChooseChoices.length === 0 && (
                <div className="text-xs text-[var(--text-muted)] italic text-center py-2">
                  {t('media.choose.emptyFavorites')}
                </div>
              )}
            </div>
          </div>
        )}
        {rightPanelView === 'manage' && (
          <div className="flex flex-col gap-3 overflow-y-auto flex-1 custom-scrollbar">
            <div className="space-y-2">
              {manageablePlayerIds.map((id) => {
                const entity = entities[id];
                const isAdded = isPlayerAdded(id);
                return (
                  <div key={id} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[var(--glass-bg-hover)] transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">{entity?.attributes?.friendly_name || id}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{id}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => addPlayerSelection(id)}
                        disabled={isAdded || showAll}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${isAdded || showAll ? 'bg-[var(--glass-bg)] text-[var(--text-muted)] opacity-50 cursor-not-allowed' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => removePlayerSelection(id)}
                        disabled={!isAdded}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${!isAdded ? 'bg-[var(--glass-bg)] text-[var(--text-muted)] opacity-50 cursor-not-allowed' : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'}`}
                      >
                        {t('media.clearSelection') || 'Remove'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {manageablePlayerIds.length === 0 && (
                <div className="text-xs text-[var(--text-muted)] italic text-center py-2">
                  {t('media.noAvailableSonosPlayers')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
    )}
    </div>
  );
}
