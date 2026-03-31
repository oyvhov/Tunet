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
  Minus,
  Link,
  Plus,
  Heart,
} from '../../icons';
import { isSonosMediaEntity } from '../../utils';
import { getMediaPlayerPowerAction } from '../../utils/mediaPlayerFeatures';

const BLOCKED_MEDIA_TYPES = new Set([
  'camera',
  'image',
  'video',
  'tvshow',
  'movie',
  'channel',
  'game',
  'app',
  'photo',
  'picture',
  'url',
]);

const BLOCKED_ID_PATTERNS = [
  'camera.',
  'camera/',
  'image.',
  'image/',
  'media-source://camera',
  'media-source://image',
  'media-source://dlna',
  'media-source://local',
];

const BLOCKED_TITLE_WORDS = [
  'camera',
  'kamera',
  'webcam',
  'surveillance',
  'doorbell',
  'security cam',
  'cctv',
];

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
  t,
  mode = 'media',
}) {
  const [mediaSearch, setMediaSearch] = useState('');
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [rightPanelView, setRightPanelView] = useState('players');
  const [chooseTab, setChooseTab] = useState('favorites');
  const [chooseQuery, setChooseQuery] = useState('');
  const [favoritesByPlayer, setFavoritesByPlayer] = useState({});
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [browseChoicesByPlayer, setBrowseChoicesByPlayer] = useState({});
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState('');
  const [failedImageMap, setFailedImageMap] = useState({});
  const isSonosMode = mode === 'sonos';
  const pageSetting = pageSettings[pageId] || {};
  const allMediaIds = Object.keys(entities)
    .filter((id) => id.startsWith('media_player.'))
    .filter((id) => {
      const entity = entities[id];
      const sonos = isSonosMediaEntity(entity);
      return isSonosMode ? sonos : !sonos;
    });
  const showAll = !Array.isArray(pageSetting.mediaIds);
  const selectedIds = showAll ? allMediaIds : pageSetting.mediaIds;
  const visibleIds = selectedIds.length > 0 ? selectedIds : [];
  const mediaEntities = visibleIds.map((id) => entities[id]).filter(Boolean);

  const sonosEntities = mediaEntities.filter(isSonosMediaEntity);
  const filteredMediaIds = allMediaIds.filter((id) => {
    if (!mediaSearch) return true;
    const lower = mediaSearch.toLowerCase();
    const name = entities[id]?.attributes?.friendly_name || id;
    return id.toLowerCase().includes(lower) || name.toLowerCase().includes(lower);
  });

  const activeSonos = sonosEntities.filter(isSonosActive);
  let currentMp =
    mediaEntities.find((e) => e.entity_id === pageSetting.activeId) ||
    mediaEntities.find((e) => e.entity_id === activeMediaId);
  if (!currentMp) currentMp = activeSonos[0] || mediaEntities[0];

  const mpId = currentMp?.entity_id || null;
  const mpState = currentMp?.state || null;
  const isPlaying = mpState === 'playing';
  const mpTitle = mpId ? getA(mpId, 'media_title') : null;
  const mpSeries = mpId ? getA(mpId, 'media_artist') || getA(mpId, 'media_album_name') : null;
  const mpName = currentMp?.attributes?.friendly_name || mpId || '';
  const isTV = mpId
    ? getA(mpId, 'media_content_type') === 'channel' || getA(mpId, 'device_class') === 'tv'
    : false;

  const resolveMediaImageUrl = useCallback(
    (rawUrl) => {
      if (!rawUrl) return null;
      if (typeof getEntityImageUrl === 'function') {
        return getEntityImageUrl(rawUrl) || rawUrl;
      }
      return rawUrl;
    },
    [getEntityImageUrl]
  );

  const currentArtworkUrl = resolveMediaImageUrl(
    currentMp?.attributes?.entity_picture ||
      currentMp?.attributes?.media_image_url ||
      currentMp?.attributes?.media_image
  );
  const markImageFailed = useCallback((src) => {
    if (!src) return;
    setFailedImageMap((prev) => {
      if (prev[src]) return prev;
      return { ...prev, [src]: true };
    });
  }, []);
  const isImageAvailable = useCallback(
    (src) => Boolean(src) && !failedImageMap[src],
    [failedImageMap]
  );
  const powerAction = currentMp ? getMediaPlayerPowerAction(currentMp) : null;
  const canTogglePower = Boolean(powerAction);
  const isPowerOffAction = powerAction === 'turn_off';

  const duration = mpId ? getA(mpId, 'media_duration') : null;
  const position = mpId ? getA(mpId, 'media_position') : null;
  const positionUpdatedAt = mpId ? getA(mpId, 'media_position_updated_at') : null;
  const volume = mpId ? getA(mpId, 'volume_level', 0) : 0;
  const isMuted = mpId ? getA(mpId, 'is_volume_muted', false) : false;
  const shuffle = mpId ? getA(mpId, 'shuffle', false) : false;
  const repeat = mpId ? getA(mpId, 'repeat', 'off') : 'off';
  const VOLUME_STEP = 0.03;

  const changeVolumeByStep = useCallback(
    (delta) => {
      if (!mpId) return;
      const nextVolume = Math.min(1, Math.max(0, (Number(volume) || 0) + delta));
      callService('media_player', 'volume_set', { entity_id: mpId, volume_level: nextVolume });
    },
    [mpId, volume, callService]
  );

  const [playheadNow, setPlayheadNow] = useState(() => Date.now());

  useEffect(() => {
    setPlayheadNow(Date.now());
    if (!mpId || !isPlaying) return;
    const intervalId = setInterval(() => setPlayheadNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [isPlaying, mpId]);

  const basePosition = typeof position === 'number' ? position : 0;
  const updatedAtMs = positionUpdatedAt ? new Date(positionUpdatedAt).getTime() : null;
  const elapsed =
    isPlaying && Number.isFinite(updatedAtMs) ? Math.max(0, (playheadNow - updatedAtMs) / 1000) : 0;
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
        source: '',
        image: null,
      };
    }
    if (typeof item !== 'object') return null;

    const id = item.media_content_id || item.id || item.uri || item.url || item.value;
    if (!id || typeof id !== 'string') return null;

    const label = item.title || item.name || item.friendly_name || item.label || id;
    const type = item.media_content_type || item.type || fallbackType;
    const source = item.provider || item.source || item.app_name || item.domain || '';
    const image =
      item.thumbnail ||
      item.thumb ||
      item.image ||
      item.entity_picture ||
      item.media_image ||
      item.media_image_url ||
      null;
    return { id, label: String(label), type: String(type), source, image };
  }, []);

  const normalizeChoiceArray = useCallback(
    (raw, fallbackType) => {
      const array = Array.isArray(raw) ? raw : [];
      const deduped = new Map();
      array.forEach((item) => {
        const normalized = normalizeChoice(item, fallbackType);
        if (!normalized) return;
        const key = `${normalized.type}::${normalized.id}`;
        if (!deduped.has(key)) deduped.set(key, normalized);
      });
      return [...deduped.values()];
    },
    [normalizeChoice]
  );

  const attrFavoriteChoices = normalizeChoiceArray(getA(mpId, 'sonos_favorites', []), 'music');
  const sourceListChoices = normalizeChoiceArray(
    (Array.isArray(getA(mpId, 'source_list', [])) ? getA(mpId, 'source_list', []) : []).map(
      (source) => ({ title: source, id: source, media_content_type: 'music' })
    ),
    'music'
  );
  const playlistFallbackChoices = normalizeChoiceArray(
    getA(mpId, 'sonos_playlists', []),
    'playlist'
  );
  const isMusicContent = useCallback((item) => {
    const type = String(item?.media_content_type || '').toLowerCase();
    const id = String(item?.media_content_id || '').toLowerCase();
    const title = String(item?.title || '').toLowerCase();

    if (BLOCKED_MEDIA_TYPES.has(type)) return false;
    if (BLOCKED_ID_PATTERNS.some((pattern) => id.includes(pattern))) return false;
    if (BLOCKED_TITLE_WORDS.some((word) => title.includes(word))) return false;
    return true;
  }, []);

  const flattenBrowseChoices = useCallback(
    (nodes, path = '') => {
      if (!Array.isArray(nodes) || nodes.length === 0) return [];
      const items = [];
      nodes.forEach((node) => {
        if (!node || !isMusicContent(node)) return;

        const title = String(node.title || node.media_content_id || '').trim();
        const mediaContentId = String(node.media_content_id || '').trim();
        const mediaContentType = String(node.media_content_type || 'music').trim();
        const canPlay = Boolean(node.can_play);
        const canExpand = Boolean(node.can_expand);
        const children = Array.isArray(node.children) ? node.children : [];
        const nextPath = path
          ? `${path} / ${title || mediaContentType}`
          : title || mediaContentType;

        if (canPlay && mediaContentId) {
          items.push({
            id: mediaContentId,
            label: title || mediaContentId,
            type: mediaContentType || 'music',
            source: path,
            image: node.thumbnail || node.thumb || node.image || node.icon || null,
          });
        }

        if (canExpand && children.length > 0) {
          items.push(...flattenBrowseChoices(children, nextPath));
        }
      });
      return items;
    },
    [isMusicContent]
  );

  const favoriteChoices = favoritesByPlayer[mpId] || attrFavoriteChoices;
  const browseChoices = browseChoicesByPlayer[mpId] || { playlists: [], library: [] };
  const playlistChoices = normalizeChoiceArray(
    [...(browseChoices.playlists || []), ...playlistFallbackChoices],
    'playlist'
  );
  const libraryChoices = browseChoices.library || [];
  const combinedMusicChoices = normalizeChoiceArray(
    [...favoriteChoices, ...playlistChoices, ...libraryChoices],
    'music'
  );
  const loweredChooseQuery = chooseQuery.trim().toLowerCase();

  const applyQueryFilter = useCallback(
    (list) => {
      if (!loweredChooseQuery) return list;
      return list.filter(
        (choice) =>
          String(choice?.label || '')
            .toLowerCase()
            .includes(loweredChooseQuery) ||
          String(choice?.id || '')
            .toLowerCase()
            .includes(loweredChooseQuery)
      );
    },
    [loweredChooseQuery]
  );

  const filteredFavoriteChoices = applyQueryFilter(favoriteChoices);
  const filteredPlaylistChoices = applyQueryFilter(playlistChoices);
  const filteredLibraryChoices = applyQueryFilter(libraryChoices);
  const filteredSearchChoices = applyQueryFilter(combinedMusicChoices);
  const isChooseLoading =
    chooseTab === 'favorites'
      ? favoritesLoading
      : chooseTab === 'search'
        ? favoritesLoading || browseLoading
        : browseLoading;

  const sonosAllIds = allMediaIds.filter((id) => isSonosMediaEntity(entities[id]));
  const manageablePlayerIds = (isSonosMode ? sonosAllIds : []).slice().sort((a, b) => {
    const aName = entities[a]?.attributes?.friendly_name || a;
    const bName = entities[b]?.attributes?.friendly_name || b;
    return aName.localeCompare(bName);
  });

  useEffect(() => {
    if (!isSonosMode && rightPanelView === 'manage') {
      setRightPanelView('players');
    }
  }, [isSonosMode, rightPanelView]);

  const isPlayerAdded = (id) => (showAll ? allMediaIds.includes(id) : selectedIds.includes(id));

  const removePlayerSelection = (id) => {
    if (showAll) {
      const next = allMediaIds.filter((item) => item !== id);
      savePageSetting(pageId, 'mediaIds', next);
      if (id === mpId && next.length > 0) setActiveMediaId(next[0]);
      return;
    }

    const next = selectedIds.filter((item) => item !== id);
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
              [mpId]: normalizeChoiceArray(
                [...attrFavoriteChoices, ...sourceListChoices, ...playlistFallbackChoices],
                'music'
              ),
            }));
          }
          return;
        }

        const rootResp = await conn.sendMessagePromise({
          type: 'media_player/browse_media',
          entity_id: mpId,
        });
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
              [mpId]: normalizeChoiceArray(
                [...attrFavoriteChoices, ...sourceListChoices, ...playlistFallbackChoices],
                'music'
              ),
            }));
          }
          return;
        }

        const allFavorites = [];
        const browseFavDir = async (dir, depth = 0) => {
          if (!dir || depth > 3) return;
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
                image: child.thumbnail || child.thumb || child.image || child.icon || null,
              });
            } else if (child?.can_expand) {
              await browseFavDir(child, depth + 1);
            }
          }
        };

        await browseFavDir(favoritesDir);
        const merged = normalizeChoiceArray(
          [
            ...allFavorites,
            ...attrFavoriteChoices,
            ...sourceListChoices,
            ...playlistFallbackChoices,
          ],
          'music'
        );
        if (!cancelled) setFavoritesByPlayer((prev) => ({ ...prev, [mpId]: merged }));
      } catch {
        if (!cancelled) {
          setFavoritesByPlayer((prev) => ({
            ...prev,
            [mpId]: normalizeChoiceArray(
              [...attrFavoriteChoices, ...sourceListChoices, ...playlistFallbackChoices],
              'music'
            ),
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

  useEffect(() => {
    let cancelled = false;

    const fetchBrowseChoices = async () => {
      if (rightPanelView !== 'choose' || !mpId) return;
      if (!conn || typeof conn.sendMessagePromise !== 'function') return;

      const cached = browseChoicesByPlayer[mpId];
      if (cached && cached._version === 2) return;

      setBrowseLoading(true);
      setBrowseError('');

      try {
        const rootResp = await conn.sendMessagePromise({
          type: 'media_player/browse_media',
          entity_id: mpId,
        });
        const root = rootResp?.result || rootResp || null;
        const rootChildren = Array.isArray(root?.children) ? root.children : [];

        const isPlaylistNode = (node) => {
          const title = String(node?.title || '').toLowerCase();
          const type = String(node?.media_content_type || node?.media_class || '').toLowerCase();
          return (
            title.includes('playlist') ||
            title.includes('spilleliste') ||
            title.includes('speleliste') ||
            title.includes('spellista') ||
            type.includes('playlist')
          );
        };

        const playlists = [];
        const library = [];

        const musicBranches = rootChildren.filter(
          (child) => child && typeof child === 'object' && isMusicContent(child)
        );
        library.push(...flattenBrowseChoices(musicBranches.filter((child) => child.can_play)));

        const expandableBranches = musicBranches.filter((child) => child.can_expand).slice(0, 8);
        for (const branch of expandableBranches) {
          if (cancelled) break;
          const sourceHint = branch?.title || '';
          try {
            const detailResp = await conn.sendMessagePromise({
              type: 'media_player/browse_media',
              entity_id: mpId,
              media_content_type: branch.media_content_type,
              media_content_id: branch.media_content_id,
            });
            const detail = detailResp?.result || detailResp || null;
            const children = Array.isArray(detail?.children) ? detail.children : [];
            const items = flattenBrowseChoices(children, sourceHint);
            if (isPlaylistNode(branch)) playlists.push(...items);
            else library.push(...items);
          } catch {
            // Skip failed branch and continue
          }
        }

        const normalizedPlaylists = normalizeChoiceArray(playlists, 'playlist');
        const normalizedLibrary = normalizeChoiceArray(library, 'music');

        if (!cancelled) {
          setBrowseChoicesByPlayer((prev) => ({
            ...prev,
            [mpId]: {
              _version: 2,
              playlists: normalizedPlaylists,
              library: normalizedLibrary,
            },
          }));
        }
      } catch {
        if (!cancelled) {
          setBrowseError(t('media.choose.loadError'));
        }
      } finally {
        if (!cancelled) setBrowseLoading(false);
      }
    };

    fetchBrowseChoices();
    return () => {
      cancelled = true;
    };
  }, [
    rightPanelView,
    mpId,
    conn,
    browseChoicesByPlayer,
    flattenBrowseChoices,
    isMusicContent,
    normalizeChoiceArray,
    t,
  ]);

  const listPlayers = mediaEntities.slice().sort((a, b) => {
    const aActive = isSonosMediaEntity(a) ? isSonosActive(a) : a?.state === 'playing';
    const bActive = isSonosMediaEntity(b) ? isSonosActive(b) : b?.state === 'playing';
    if (aActive !== bActive) return aActive ? -1 : 1;
    return (a.attributes?.friendly_name || '').localeCompare(b.attributes?.friendly_name || '');
  });

  const toggleGroupAll = () => {
    if (!isSonosMode) return;
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

  const playChoice = (choice, fallbackType = 'music') => {
    if (!choice?.id || !mpId) return;
    callService('media_player', 'play_media', {
      entity_id: mpId,
      media_content_id: choice.id,
      media_content_type: choice.type || fallbackType,
    });
  };

  const renderChoiceTile = (choice, fallbackType = 'music') => (
    (() => {
      const choiceImageUrl = resolveMediaImageUrl(choice.image);
      return (
    <button
      key={`${choice.type}::${choice.id}`}
      type="button"
      onClick={() => playChoice(choice, fallbackType)}
      className="group flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-[var(--glass-bg-hover)]"
    >
      <div className="aspect-square w-full flex-shrink-0 overflow-hidden rounded-lg bg-[var(--glass-bg-hover)]">
        {isImageAvailable(choiceImageUrl) ? (
          <img
            src={choiceImageUrl}
            alt={choice.label}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => markImageFailed(choiceImageUrl)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Heart className="h-6 w-6 text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]" />
          </div>
        )}
      </div>
      <p className="line-clamp-2 w-full text-center text-[10px] leading-tight font-bold tracking-wider text-[var(--text-primary)] uppercase">
        {choice.label}
      </p>
    </button>
      );
    })()
  );

  return (
    <div key={pageId} className="fade-in-anim flex flex-col items-start gap-8 font-sans">
      {mediaEntities.length === 0 && (
        <div className="popup-surface w-full rounded-3xl p-8 text-center text-[var(--text-secondary)]">
          {t('media.noPlayersFound')}
        </div>
      )}
      {editMode && (
        <div className="popup-surface w-full rounded-3xl border border-[var(--glass-border)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold tracking-[0.2em] text-[var(--text-muted)] uppercase">
                {t('media.selectPlayers')}
              </h3>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {t('media.selectPlayersHint')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPlayerSelector((prev) => !prev)}
                className="popup-surface popup-surface-hover inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase"
              >
                {showPlayerSelector ? t('common.hide') || 'Hide' : t('common.show') || 'Show'}
                {showPlayerSelector ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => savePageSetting(pageId, 'mediaIds', null)}
                className="popup-surface popup-surface-hover rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase"
              >
                {t('media.selectAll')}
              </button>
              <button
                onClick={() => savePageSetting(pageId, 'mediaIds', [])}
                className="popup-surface popup-surface-hover rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase"
              >
                {t('media.clearSelection')}
              </button>
            </div>
          </div>

          {showPlayerSelector ? (
            <div className="w-full lg:mx-auto lg:max-w-2xl">
              <div className="relative mb-3">
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder={t('addCard.search')}
                  className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] py-2.5 pr-4 pl-4 text-sm text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                />
              </div>
              <div className="custom-scrollbar max-h-64 space-y-2 overflow-y-auto">
                {filteredMediaIds.map((id) => {
                  const entity = entities[id];
                  const isSelected = showAll ? true : selectedIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (showAll) {
                          const next = allMediaIds.filter((item) => item !== id);
                          savePageSetting(pageId, 'mediaIds', next);
                          return;
                        }
                        const next = selectedIds.includes(id)
                          ? selectedIds.filter((item) => item !== id)
                          : [...selectedIds, id];
                        savePageSetting(pageId, 'mediaIds', next);
                      }}
                      className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${isSelected ? '' : 'popup-surface popup-surface-hover border-transparent'}`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: 'var(--glass-bg-hover)',
                              borderColor: 'var(--glass-border)',
                            }
                          : undefined
                      }
                    >
                      <div className="mr-4 flex flex-col overflow-hidden">
                        <span
                          className={`truncate text-sm font-bold transition-colors ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                        >
                          {entity?.attributes?.friendly_name || id}
                        </span>
                        <span
                          className={`truncate text-[11px] font-medium ${isSelected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}
                        >
                          {id}
                        </span>
                      </div>
                      <div
                        className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? '' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] group-hover:bg-[var(--status-success-bg)] group-hover:text-[var(--status-success-fg)]'}`}
                        style={
                          isSelected
                            ? {
                                backgroundColor: 'var(--glass-bg)',
                                color: 'var(--text-primary)',
                              }
                            : undefined
                        }
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </div>
                    </button>
                  );
                })}
                {filteredMediaIds.length === 0 && (
                  <div className="py-2 text-center text-xs text-[var(--text-muted)] italic">
                    {t('form.noResults')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full text-center text-[11px] text-[var(--text-muted)] lg:mx-auto lg:max-w-2xl">
              {showAll ? allMediaIds.length : selectedIds.length} {t('addCard.players')}{' '}
              {t('common.selected') || 'selected'}
            </div>
          )}
        </div>
      )}

      {mediaEntities.length > 0 && (
        <div className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="popup-surface flex min-h-[480px] w-full min-w-0 flex-col rounded-3xl border border-[var(--glass-border)] p-8">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2">
                <Music className="h-4 w-4 text-[var(--text-primary)]" />
                <span className="text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase">
                  {isSonosMode ? t('sonos.pageName') : t('addCard.type.media')}
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center gap-8 md:flex-row md:gap-12">
              <div className="flex flex-shrink-0 justify-center md:justify-start">
                <div className="flex h-52 w-52 items-center justify-center rounded-2xl bg-[var(--glass-bg)] lg:h-56 lg:w-56 xl:h-72 xl:w-72">
                  {isImageAvailable(currentArtworkUrl) ? (
                    <img
                      src={currentArtworkUrl}
                      alt={mpTitle || mpName || 'Media artwork'}
                      className="h-full w-full rounded-2xl object-cover"
                      loading="lazy"
                      onError={() => markImageFailed(currentArtworkUrl)}
                    />
                  ) : isTV ? (
                    <Tv className="h-24 w-24 text-[var(--text-muted)]" />
                  ) : (
                    <Speaker className="h-24 w-24 text-[var(--text-muted)]" />
                  )}
                </div>
              </div>

              <div className="flex w-full min-w-0 flex-1 flex-col justify-center gap-4 md:justify-between lg:gap-5 xl:gap-6">
                <div className="space-y-2 text-center md:text-left">
                  {mpName && (
                    <p className="text-xs font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase">
                      {mpName}
                    </p>
                  )}
                  <h2 className="truncate text-lg leading-none font-bold text-[var(--text-primary)] md:text-xl">
                    {mpTitle || t('common.unknown')}
                  </h2>
                  <p className="truncate text-base font-medium text-[var(--text-secondary)] lg:text-lg xl:text-xl">
                    {mpSeries || ''}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold tracking-widest text-[var(--text-secondary)]">
                      <span>{formatDuration(effectivePosition)}</span>
                      <span>{formatDuration(duration)}</span>
                    </div>
                    <M3Slider
                      variant="thin"
                      min={0}
                      max={duration || 100}
                      step={1}
                      value={effectivePosition || 0}
                      disabled={!duration}
                      onChange={(e) =>
                        callService('media_player', 'media_seek', {
                          entity_id: mpId,
                          seek_position: parseFloat(e.target.value),
                        })
                      }
                      colorClass="bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-[clamp(0.25rem,1vw,0.75rem)]">
                    <button
                      onClick={() =>
                        callService('media_player', 'shuffle_set', {
                          entity_id: mpId,
                          shuffle: !shuffle,
                        })
                      }
                      className={`rounded-full p-[clamp(0.25rem,1vw,0.5rem)] transition-all active:scale-95 ${shuffle ? '' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                      style={
                        shuffle
                          ? {
                              color: 'var(--text-primary)',
                              backgroundColor: 'var(--glass-bg-hover)',
                            }
                          : undefined
                      }
                      title="Shuffle"
                    >
                      <Shuffle className="h-[clamp(0.9rem,2vw,1rem)] w-[clamp(0.9rem,2vw,1rem)]" />
                    </button>
                    <div className="flex min-w-0 items-center justify-center gap-[clamp(0.2rem,1.3vw,1rem)]">
                      <button
                        onClick={() =>
                          callService('media_player', 'media_previous_track', { entity_id: mpId })
                        }
                        className="rounded-full p-[clamp(0.2rem,1vw,0.5rem)] transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
                      >
                        <SkipBack className="h-[clamp(1.1rem,2.6vw,1.5rem)] w-[clamp(1.1rem,2.6vw,1.5rem)] text-[var(--text-secondary)]" />
                      </button>
                      <button
                        onClick={() =>
                          callService('media_player', 'media_play_pause', { entity_id: mpId })
                        }
                        className="rounded-full bg-[var(--text-primary)] p-[clamp(0.3rem,1.2vw,0.75rem)] shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                      >
                        {isPlaying ? (
                          <Pause
                            className="h-[clamp(1.1rem,2.8vw,1.75rem)] w-[clamp(1.1rem,2.8vw,1.75rem)]"
                            color="var(--bg-primary)"
                            fill="var(--bg-primary)"
                          />
                        ) : (
                          <Play
                            className="ml-0.5 h-[clamp(1.1rem,2.8vw,1.75rem)] w-[clamp(1.1rem,2.8vw,1.75rem)]"
                            color="var(--bg-primary)"
                            fill="var(--bg-primary)"
                          />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          callService('media_player', 'media_next_track', { entity_id: mpId })
                        }
                        className="rounded-full p-[clamp(0.2rem,1vw,0.5rem)] transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
                      >
                        <SkipForward className="h-[clamp(1.1rem,2.6vw,1.5rem)] w-[clamp(1.1rem,2.6vw,1.5rem)] text-[var(--text-secondary)]" />
                      </button>
                      {canTogglePower && (
                        <button
                          onClick={() =>
                            callService('media_player', powerAction, { entity_id: mpId })
                          }
                          className={`rounded-full p-[clamp(0.2rem,1vw,0.5rem)] transition-all active:scale-95 ${isPowerOffAction ? 'text-[var(--status-error-fg)] hover:bg-[var(--status-error-bg)]' : 'text-[var(--status-success-fg)] hover:bg-[var(--status-success-bg)]'}`}
                          title={isPowerOffAction ? t('status.off') : t('status.on')}
                        >
                          <Power className="h-[clamp(1.1rem,2.6vw,1.5rem)] w-[clamp(1.1rem,2.6vw,1.5rem)]" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const modes = ['off', 'one', 'all'];
                        const nextMode = modes[(modes.indexOf(repeat) + 1) % modes.length];
                        callService('media_player', 'repeat_set', {
                          entity_id: mpId,
                          repeat: nextMode,
                        });
                      }}
                      className={`rounded-full p-[clamp(0.25rem,1vw,0.5rem)] transition-all active:scale-95 ${repeat !== 'off' ? '' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                      style={
                        repeat !== 'off'
                          ? {
                              color: 'var(--text-primary)',
                              backgroundColor: 'var(--glass-bg-hover)',
                            }
                          : undefined
                      }
                      title="Repeat"
                    >
                      {repeat === 'one' ? (
                        <Repeat1 className="h-[clamp(0.9rem,2vw,1rem)] w-[clamp(0.9rem,2vw,1rem)]" />
                      ) : (
                        <Repeat className="h-[clamp(0.9rem,2vw,1rem)] w-[clamp(0.9rem,2vw,1rem)]" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-[var(--glass-border)] px-1 pt-2">
                  <button
                    onClick={() => changeVolumeByStep(-VOLUME_STEP)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                    aria-label="Volume down"
                    title="Volume down"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      callService('media_player', 'volume_mute', {
                        entity_id: mpId,
                        is_volume_muted: !isMuted,
                      })
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                  <div className="flex-1 px-1">
                    <M3Slider
                      variant="volume"
                      min={0}
                      max={100}
                      step={1}
                      value={volume * 100}
                      onChange={(e) =>
                        callService('media_player', 'volume_set', {
                          entity_id: mpId,
                          volume_level: parseFloat(e.target.value) / 100,
                        })
                      }
                      colorClass="bg-white"
                    />
                  </div>
                  <button
                    onClick={() => changeVolumeByStep(VOLUME_STEP)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                    aria-label="Volume up"
                    title="Volume up"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {mediaEntities.length > 0 && (
            <div className="popup-surface flex max-h-[480px] min-h-[480px] w-full min-w-0 flex-col rounded-3xl border border-[var(--glass-border)] p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="popup-surface inline-flex items-center gap-1 rounded-xl border border-[var(--glass-border)] p-1">
                  <button
                    type="button"
                    onClick={() => setRightPanelView('players')}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors ${rightPanelView === 'players' ? 'border' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    style={
                      rightPanelView === 'players'
                        ? {
                            color: 'var(--text-primary)',
                            backgroundColor: 'var(--glass-bg-hover)',
                            borderColor: 'var(--glass-border)',
                          }
                        : undefined
                    }
                  >
                    {t('media.tab.players')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelView('choose')}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors ${rightPanelView === 'choose' ? 'border' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    style={
                      rightPanelView === 'choose'
                        ? {
                            color: 'var(--text-primary)',
                            backgroundColor: 'var(--glass-bg-hover)',
                            borderColor: 'var(--glass-border)',
                          }
                        : undefined
                    }
                  >
                    {t('media.tab.media')}
                  </button>
                  {isSonosMode && (
                    <button
                      type="button"
                      onClick={() => setRightPanelView('manage')}
                      className={`rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors ${rightPanelView === 'manage' ? 'border' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                      style={
                        rightPanelView === 'manage'
                          ? {
                              color: 'var(--text-primary)',
                              backgroundColor: 'var(--glass-bg-hover)',
                              borderColor: 'var(--glass-border)',
                            }
                          : undefined
                      }
                    >
                      {t('media.tab.manage')}
                    </button>
                  )}
                </div>
                {isSonosMode && rightPanelView === 'players' && listPlayers.length > 1 && (
                  <button
                    onClick={toggleGroupAll}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors"
                    style={{
                      backgroundColor: 'var(--glass-bg)',
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-secondary)',
                    }}
                    title={hasGroupedOthers ? t('sonos.ungroupAll') : t('sonos.groupAll')}
                    aria-label={hasGroupedOthers ? t('sonos.ungroupAll') : t('sonos.groupAll')}
                  >
                    <Link className="h-4 w-4" />
                    <span>
                      {hasGroupedOthers ? t('sonos.ungroupShort') : t('sonos.groupShort')}
                    </span>
                  </button>
                )}
              </div>
              {rightPanelView === 'players' && (
                <>
                  <div className="custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto">
                    {listPlayers.map((p, idx) => {
                      const isSelected = p.entity_id === mpId;
                      const isMember = groupMembers.includes(p.entity_id);
                      const isSelf = p.entity_id === mpId;
                      const isSonos = isSonosMediaEntity(p);
                      const isActivePlayer = isSonos ? isSonosActive(p) : p?.state === 'playing';
                      const pTitle = getA(p.entity_id, 'media_title', t('common.unknown'));
                      const pArtworkUrl = resolveMediaImageUrl(
                        p?.attributes?.entity_picture ||
                          p?.attributes?.media_image_url ||
                          p?.attributes?.media_image
                      );

                      return (
                        <div
                          key={p.entity_id || idx}
                          className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${isSelected ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'border-transparent hover:bg-[var(--glass-bg)]'} ${isActivePlayer ? '' : 'opacity-70'}`}
                        >
                          <button
                            onClick={() => {
                              savePageSetting(pageId, 'activeId', p.entity_id);
                              setActiveMediaId(p.entity_id);
                            }}
                            className="group flex min-w-0 flex-1 items-center gap-4 text-left"
                          >
                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--glass-bg)]">
                              {isImageAvailable(pArtworkUrl) ? (
                                <img
                                  src={pArtworkUrl}
                                  alt={p.attributes?.friendly_name || p.entity_id}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  onError={() => markImageFailed(pArtworkUrl)}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Speaker className="h-5 w-5 text-[var(--text-muted)]" />
                                </div>
                              )}
                              {p.state === 'playing' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                                </div>
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <p
                                className={`truncate text-xs font-bold tracking-wider uppercase ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                              >
                                {p.attributes.friendly_name || p.entity_id}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                                {pTitle}
                              </p>
                            </div>
                          </button>
                          {isSonosMode && !isSelf && listPlayers.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isMember) {
                                  callService('media_player', 'unjoin', { entity_id: p.entity_id });
                                } else {
                                  callService('media_player', 'join', {
                                    entity_id: mpId,
                                    group_members: [p.entity_id],
                                  });
                                }
                              }}
                              className={`rounded-full p-2.5 transition-all ${isMember ? '' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                              style={
                                isMember
                                  ? {
                                      backgroundColor: 'var(--glass-bg-hover)',
                                      color: 'var(--text-primary)',
                                      boxShadow: 'none',
                                    }
                                  : undefined
                              }
                              title={
                                isMember ? t('tooltip.removeFromGroup') : t('tooltip.addToGroup')
                              }
                            >
                              {isMember ? (
                                <Link className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {isSonosMode && isSelf && listPlayers.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroupAll();
                              }}
                              className="rounded-full p-2.5 transition-colors"
                              style={{
                                backgroundColor: 'var(--glass-bg)',
                                color: 'var(--text-secondary)',
                              }}
                              title={hasGroupedOthers ? t('sonos.ungroupAll') : t('sonos.groupAll')}
                            >
                              <Link className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {rightPanelView === 'choose' && (
                <div className="custom-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto">
                  <div className="popup-surface inline-flex items-center gap-1 rounded-xl border border-[var(--glass-border)] p-1">
                    {[
                      ['favorites', t('media.choose.tab.favorites')],
                      ['playlists', t('media.choose.tab.playlists')],
                      ['library', t('media.choose.tab.library')],
                      ['search', t('media.choose.tab.search')],
                    ].map(([tab, label]) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setChooseTab(tab)}
                        className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors ${chooseTab === tab ? 'border' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        style={
                          chooseTab === tab
                            ? {
                                color: 'var(--text-primary)',
                                backgroundColor: 'var(--glass-bg-hover)',
                                borderColor: 'var(--glass-border)',
                              }
                            : undefined
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={chooseQuery}
                    onChange={(e) => setChooseQuery(e.target.value)}
                    placeholder={t('media.choose.tab.search')}
                    className="w-full rounded-xl bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                  />

                  <div className="space-y-2">
                    {isChooseLoading && (
                      <div className="py-2 text-center text-xs text-[var(--text-muted)] italic">
                        {t('media.choose.loading')}
                      </div>
                    )}

                    {!isChooseLoading && chooseTab === 'favorites' && (
                      <>
                        {filteredFavoriteChoices.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {filteredFavoriteChoices.map((choice) =>
                              renderChoiceTile(choice, 'music')
                            )}
                          </div>
                        ) : (
                          <div className="py-2 text-center text-xs text-[var(--text-muted)] italic">
                            {t('media.choose.emptyFavorites')}
                          </div>
                        )}
                      </>
                    )}

                    {!isChooseLoading && chooseTab === 'playlists' && (
                      <>
                        {filteredPlaylistChoices.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {filteredPlaylistChoices.map((choice) =>
                              renderChoiceTile(choice, 'playlist')
                            )}
                          </div>
                        ) : (
                          <div className="py-2 text-center text-xs text-[var(--text-muted)] italic">
                            {t('media.choose.emptyPlaylists')}
                          </div>
                        )}
                      </>
                    )}

                    {!isChooseLoading && chooseTab === 'library' && (
                      <>
                        {filteredLibraryChoices.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {filteredLibraryChoices.map((choice) =>
                              renderChoiceTile(choice, 'music')
                            )}
                          </div>
                        ) : (
                          <div className="py-2 text-center text-xs text-[var(--text-muted)] italic">
                            {browseError || t('media.choose.emptyResults')}
                          </div>
                        )}
                      </>
                    )}

                    {!isChooseLoading && chooseTab === 'search' && (
                      <>
                        {filteredSearchChoices.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {filteredSearchChoices.map((choice) =>
                              renderChoiceTile(choice, 'music')
                            )}
                          </div>
                        ) : (
                          <div className="py-2 text-center text-xs text-[var(--text-muted)] italic">
                            {t('form.noResults')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {isSonosMode && rightPanelView === 'manage' && (
                <div className="custom-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto">
                  <div className="space-y-2">
                    {manageablePlayerIds.map((id) => {
                      const entity = entities[id];
                      const isAdded = isPlayerAdded(id);
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-3 rounded-xl p-2 transition-colors hover:bg-[var(--glass-bg-hover)]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                              {entity?.attributes?.friendly_name || id}
                            </p>
                            <p className="truncate text-[10px] text-[var(--text-muted)]">{id}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => addPlayerSelection(id)}
                              disabled={isAdded || showAll}
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase transition-colors ${isAdded || showAll ? 'cursor-not-allowed bg-[var(--glass-bg)] text-[var(--text-muted)] opacity-50' : 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] hover:opacity-90'}`}
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => removePlayerSelection(id)}
                              disabled={!isAdded}
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase transition-colors ${!isAdded ? 'cursor-not-allowed bg-[var(--glass-bg)] text-[var(--text-muted)] opacity-50' : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'}`}
                            >
                              {t('media.clearSelection') || 'Remove'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {manageablePlayerIds.length === 0 && (
                      <div className="py-2 text-center text-xs text-[var(--text-muted)] italic">
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

