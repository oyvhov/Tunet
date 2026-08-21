import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import M3Slider from '../ui/M3Slider';
import {
  Music,
  Tv,
  Speaker,
  Check,
  Search,
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

function normalizeBrowseText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function browseNodeMatches(node, terms) {
  const haystack = normalizeBrowseText(
    [
      node?.title,
      node?.name,
      node?.media_content_type,
      node?.media_class,
      node?.media_content_id,
      node?.id,
    ]
      .filter(Boolean)
      .join(' ')
  );
  return terms.some((term) => haystack.includes(term));
}

function isFavoriteBrowseNode(node) {
  return browseNodeMatches(node, ['favorite', 'favourite', 'favorit', 'favoritt']);
}

function isPlaylistBrowseNode(node) {
  return browseNodeMatches(node, ['playlist', 'spilleliste', 'speleliste', 'spellista']);
}

function MediaPage({
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
  const [rightPanelView, setRightPanelView] = useState('players');
  const [chooseTab, setChooseTab] = useState('favorites');
  const [chooseQuery, setChooseQuery] = useState('');
  const [browseChoicesByPlayer, setBrowseChoicesByPlayer] = useState({});
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState('');
  const [failedImageMap, setFailedImageMap] = useState({});
  const isSonosMode = mode === 'sonos';
  const pageSetting = pageSettings[pageId] || {};
  const allMediaIds = useMemo(
    () =>
      Object.keys(entities)
        .filter((id) => id.startsWith('media_player.'))
        .filter((id) => {
          const entity = entities[id];
          const sonos = isSonosMediaEntity(entity);
          return isSonosMode ? sonos : !sonos;
        }),
    [entities, isSonosMode]
  );
  const showAll = !Array.isArray(pageSetting.mediaIds);
  const selectedIds = showAll ? allMediaIds : pageSetting.mediaIds;
  const visibleIds = useMemo(() => (selectedIds.length > 0 ? selectedIds : []), [selectedIds]);
  const mediaEntities = useMemo(
    () => visibleIds.map((id) => entities[id]).filter(Boolean),
    [visibleIds, entities]
  );

  const sonosEntities = useMemo(() => mediaEntities.filter(isSonosMediaEntity), [mediaEntities]);
  const filteredMediaIds = useMemo(
    () =>
      allMediaIds
        .filter((id) => {
          if (!mediaSearch) return true;
          const lower = mediaSearch.toLowerCase();
          const name = entities[id]?.attributes?.friendly_name || id;
          return id.toLowerCase().includes(lower) || name.toLowerCase().includes(lower);
        })
        .sort((a, b) => {
          const selectedDifference =
            Number(selectedIds.includes(b)) - Number(selectedIds.includes(a));
          if (selectedDifference !== 0) return selectedDifference;
          const aName = entities[a]?.attributes?.friendly_name || a;
          const bName = entities[b]?.attributes?.friendly_name || b;
          return aName.localeCompare(bName);
        }),
    [allMediaIds, mediaSearch, entities, selectedIds]
  );

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
  const playlistFallbackChoices = normalizeChoiceArray(
    getA(mpId, 'sonos_playlists', []),
    'playlist'
  );
  const isMusicContent = useCallback((item) => {
    if (!item) return false;
    const type = String(
      item.media_content_type || item.media_class || item.type || ''
    ).toLowerCase();
    const id = String(item.media_content_id || item.id || item.uri || '').toLowerCase();
    const title = String(item.title || item.name || '').toLowerCase();
    const isBrowsableContainer =
      item.can_expand === true && ['', 'app', 'directory', 'folder'].includes(type);

    if (BLOCKED_MEDIA_TYPES.has(type) && !isBrowsableContainer) return false;
    if (BLOCKED_ID_PATTERNS.some((pattern) => id.includes(pattern))) return false;
    if (BLOCKED_TITLE_WORDS.some((word) => title.includes(word))) return false;
    return true;
  }, []);

  const mergeChoiceArrays = useCallback(
    (...arrays) => normalizeChoiceArray(arrays.flat(), 'music'),
    [normalizeChoiceArray]
  );

  const browseChoices = browseChoicesByPlayer[mpId] || {
    favorites: [],
    playlists: [],
    library: [],
  };
  const favoriteChoices = mergeChoiceArrays(browseChoices.favorites || [], attrFavoriteChoices);
  const playlistChoices = mergeChoiceArrays(browseChoices.playlists || [], playlistFallbackChoices);
  const libraryChoices = mergeChoiceArrays(browseChoices.library || []);
  const combinedMusicChoices = mergeChoiceArrays(favoriteChoices, playlistChoices, libraryChoices);
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
  const isChooseLoading = browseLoading;
  const hasLoadedBrowseChoices = browseChoices._version === 3;

  const sonosAllIds = useMemo(
    () => allMediaIds.filter((id) => isSonosMediaEntity(entities[id])),
    [allMediaIds, entities]
  );
  const manageablePlayerIds = useMemo(
    () =>
      (isSonosMode ? sonosAllIds : []).slice().sort((a, b) => {
        const aName = entities[a]?.attributes?.friendly_name || a;
        const bName = entities[b]?.attributes?.friendly_name || b;
        return aName.localeCompare(bName);
      }),
    [isSonosMode, sonosAllIds, entities]
  );

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

  const togglePlayerSelection = (id) => {
    if (isPlayerAdded(id)) {
      removePlayerSelection(id);
    } else {
      addPlayerSelection(id);
    }
  };

  useEffect(() => {
    const canBrowse =
      rightPanelView === 'choose' &&
      !!mpId &&
      conn &&
      typeof conn.sendMessagePromise === 'function';
    if (!canBrowse) return;

    const cached = browseChoicesByPlayer[mpId];
    if (cached?._version === 3) {
      setBrowseLoading(false);
      setBrowseError('');
      return;
    }

    let cancelled = false;

    const browseNode = async (node = null) => {
      const payload = {
        type: 'media_player/browse_media',
        entity_id: mpId,
      };
      if (node?.media_content_type) payload.media_content_type = node.media_content_type;
      if (node?.media_content_id) payload.media_content_id = node.media_content_id;
      const response = await conn.sendMessagePromise(payload);
      return response?.result || response || null;
    };

    const loadChoices = async () => {
      setBrowseLoading(true);
      setBrowseError('');
      try {
        const root = await browseNode();
        if (!root) throw new Error('browse_failed');
        if (cancelled) return;

        const favorites = [];
        const playlists = [];
        const library = [];
        const visited = new Set();
        const maxExpansions = 18;
        const maxDepth = 4;
        let expansionCount = 0;

        const resolveBucket = (node, inheritedBucket = 'library') => {
          if (isFavoriteBrowseNode(node)) return 'favorites';
          if (isPlaylistBrowseNode(node)) return 'playlists';
          return inheritedBucket;
        };

        const addPlayableChoice = (node, bucket, sourceHint) => {
          if (node?.can_play !== true) return;
          const fallbackType = bucket === 'playlists' ? 'playlist' : 'music';
          const normalized = normalizeChoiceArray(
            [{ ...node, source: node.source || sourceHint }],
            fallbackType
          );
          if (bucket === 'favorites') favorites.push(...normalized);
          else if (bucket === 'playlists') playlists.push(...normalized);
          else library.push(...normalized);
        };

        const rootChildren = Array.isArray(root.children) ? root.children : [];
        let frontier = rootChildren
          .filter((node) => node && typeof node === 'object' && isMusicContent(node))
          .map((node) => ({
            node,
            bucket: resolveBucket(node),
            sourceHint: root.title || '',
          }));

        for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
          if (cancelled) return;
          const nextFrontier = [];
          const expandable = [];

          frontier.forEach(({ node, bucket: inheritedBucket, sourceHint }) => {
            if (!isMusicContent(node)) return;
            const bucket = resolveBucket(node, inheritedBucket);
            const nextSourceHint = node.title || sourceHint;
            addPlayableChoice(node, bucket, sourceHint);

            const embeddedChildren = Array.isArray(node.children) ? node.children : [];
            embeddedChildren.forEach((child) => {
              if (!child || typeof child !== 'object' || !isMusicContent(child)) return;
              nextFrontier.push({
                node: child,
                bucket: resolveBucket(child, bucket),
                sourceHint: nextSourceHint,
              });
            });

            const nodeId = node.media_content_id || node.id || node.uri;
            const visitKey = `${node.media_content_type || node.media_class || ''}::${nodeId || ''}`;
            if (
              embeddedChildren.length === 0 &&
              node.can_expand === true &&
              node.can_play !== true &&
              nodeId &&
              !visited.has(visitKey)
            ) {
              visited.add(visitKey);
              expandable.push({ node, bucket, sourceHint: nextSourceHint });
            }
          });

          expandable.sort((a, b) => {
            const priority = { favorites: 0, playlists: 1, library: 2 };
            return priority[a.bucket] - priority[b.bucket];
          });

          const remainingExpansions = Math.max(0, maxExpansions - expansionCount);
          const branches = expandable.slice(0, remainingExpansions);
          expansionCount += branches.length;

          const branchResults = await Promise.all(
            branches.map(async (entry) => {
              try {
                return { ...entry, detail: await browseNode(entry.node) };
              } catch {
                return { ...entry, detail: null };
              }
            })
          );

          branchResults.forEach(({ node, bucket, sourceHint, detail }) => {
            const children = Array.isArray(detail?.children) ? detail.children : [];
            const nextSourceHint = detail?.title || node.title || sourceHint;
            children.forEach((child) => {
              if (!child || typeof child !== 'object' || !isMusicContent(child)) return;
              nextFrontier.push({
                node: child,
                bucket: resolveBucket(child, bucket),
                sourceHint: nextSourceHint,
              });
            });
          });

          frontier = nextFrontier;
          if (expansionCount >= maxExpansions && frontier.every(({ node }) => !node.can_play)) {
            break;
          }
        }

        if (!cancelled) {
          setBrowseChoicesByPlayer((prev) => ({
            ...prev,
            [mpId]: {
              _version: 3,
              favorites: normalizeChoiceArray(favorites, 'music'),
              playlists: normalizeChoiceArray(playlists, 'playlist'),
              library: normalizeChoiceArray(library, 'music'),
            },
          }));
        }
      } catch (error) {
        if (!cancelled) setBrowseError(error?.message || 'browse_failed');
      } finally {
        if (!cancelled) setBrowseLoading(false);
      }
    };

    loadChoices();
    return () => {
      cancelled = true;
    };
  }, [rightPanelView, mpId, conn, browseChoicesByPlayer, isMusicContent, normalizeChoiceArray]);

  const listPlayers = useMemo(
    () =>
      mediaEntities.slice().sort((a, b) => {
        const aActive = isSonosMediaEntity(a) ? isSonosActive(a) : a?.state === 'playing';
        const bActive = isSonosMediaEntity(b) ? isSonosActive(b) : b?.state === 'playing';
        if (aActive !== bActive) return aActive ? -1 : 1;
        return (a.attributes?.friendly_name || '').localeCompare(b.attributes?.friendly_name || '');
      }),
    [mediaEntities, isSonosActive]
  );

  const toggleGroupAll = useCallback(() => {
    if (!isSonosMode) return;
    if (!conn) return;
    const allIds = listPlayers.map((player) => player.entity_id);
    const otherIds = allIds.filter((id) => id !== mpId);
    if (hasGroupedOthers) {
      groupedOthers.forEach((id) => callService('media_player', 'unjoin', { entity_id: id }));
      return;
    }
    if (otherIds.length > 0) {
      callService('media_player', 'join', { entity_id: mpId, group_members: otherIds });
    }
  }, [isSonosMode, conn, listPlayers, mpId, hasGroupedOthers, groupedOthers, callService]);

  const playChoice = (choice, fallbackType = 'music') => {
    if (!choice?.id || !mpId) return;
    callService('media_player', 'play_media', {
      entity_id: mpId,
      media_content_id: choice.id,
      media_content_type: choice.type || fallbackType,
    });
  };

  const renderChoiceTile = (choice, fallbackType = 'music') =>
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
    })();

  return (
    <div key={pageId} className="fade-in-anim flex flex-col items-start gap-8 font-sans">
      {mediaEntities.length === 0 && (
        <div className="popup-surface w-full rounded-3xl p-8 text-center text-[var(--text-secondary)]">
          {t('media.noPlayersFound')}
        </div>
      )}
      {editMode && (
        <div
          data-testid="media-page-editor"
          className="popup-surface w-full rounded-3xl border border-[var(--glass-border)] p-4 sm:p-5"
        >
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]">
                <Speaker className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold tracking-[0.2em] text-[var(--text-primary)] uppercase">
                  {t('media.selectPlayers')}
                </h3>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {t('media.selectPlayersHint')}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <span
                className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)]"
                aria-label={`${selectedIds.length} / ${allMediaIds.length}`}
              >
                {selectedIds.length} / {allMediaIds.length}
              </span>
              <button
                onClick={() => savePageSetting(pageId, 'mediaIds', null)}
                className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
              >
                {t('media.selectAll')}
              </button>
              <button
                onClick={() => savePageSetting(pageId, 'mediaIds', [])}
                className="rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase transition-colors hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]"
              >
                {t('media.clearSelection')}
              </button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              placeholder={t('addCard.search')}
              aria-label={t('addCard.search')}
              className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] py-3 pr-4 pl-11 text-sm text-[var(--text-primary)] transition-colors outline-none placeholder:text-[var(--text-muted)] focus:bg-[var(--glass-bg-hover)]"
            />
          </div>
          <div className="custom-scrollbar grid max-h-72 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
            {filteredMediaIds.map((id) => {
              const entity = entities[id];
              const isSelected = isPlayerAdded(id);
              const playerName = entity?.attributes?.friendly_name || id;
              return (
                <button
                  key={id}
                  type="button"
                  role="switch"
                  aria-checked={isSelected}
                  aria-label={playerName}
                  onClick={() => togglePlayerSelection(id)}
                  className={`group flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${isSelected ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'border-transparent bg-[var(--glass-bg)] hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]">
                    <Speaker className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
                      {playerName}
                    </span>
                    <span className="block truncate text-[10px] text-[var(--text-muted)]">
                      {id}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${isSelected ? 'border-[var(--text-primary)] bg-[var(--text-primary)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full transition-transform ${isSelected ? 'translate-x-5 bg-[var(--modal-bg)] text-[var(--text-primary)]' : 'translate-x-0 bg-[var(--text-muted)] text-transparent'}`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  </span>
                </button>
              );
            })}
            {filteredMediaIds.length === 0 && (
              <div className="py-5 text-center text-xs text-[var(--text-muted)] italic md:col-span-2">
                {t('form.noResults')}
              </div>
            )}
          </div>
          {allMediaIds.length === 0 && (
            <div className="py-5 text-center text-xs text-[var(--text-muted)] italic">
              {t('media.noPlayersFound')}
            </div>
          )}
        </div>
      )}

      {mediaEntities.length === 0 && (
        <div
          className="popup-surface flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--glass-border)] p-10 text-center"
          role="status"
          aria-live="polite"
        >
          <Speaker className="h-10 w-10 text-[var(--text-muted)]" aria-hidden="true" />
          <p className="text-sm font-bold tracking-widest text-[var(--text-primary)] uppercase">
            {isSonosMode
              ? t('sonos.empty.title') || 'No Sonos players found'
              : t('media.empty.title') || 'No media players found'}
          </p>
          <p className="max-w-md text-xs text-[var(--text-secondary)]">
            {isSonosMode
              ? t('sonos.empty.subtitle') ||
                'Connect a Sonos integration in Home Assistant to see your speakers here.'
              : t('media.empty.subtitle') ||
                'Add a media_player entity in Home Assistant to see it here.'}
          </p>
        </div>
      )}

      {mediaEntities.length > 0 && (
        <div className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-[1.35fr_0.85fr]">
          <div
            className={`popup-surface relative flex min-h-[480px] w-full min-w-0 flex-col overflow-hidden rounded-3xl border p-8 ${
              isSonosMode
                ? 'border-[var(--status-info-fg)]/35 shadow-[0_0_0_1px_rgba(125,211,252,0.08),0_20px_60px_rgba(59,130,246,0.15)]'
                : 'border-[var(--glass-border)]'
            }`}
          >
            {isSonosMode && (
              <div
                className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, color-mix(in oklab, var(--status-info-fg) 40%, transparent) 0%, transparent 70%)',
                }}
                aria-hidden="true"
              />
            )}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2">
                {isSonosMode ? (
                  <Speaker className="h-4 w-4 text-[var(--text-primary)]" />
                ) : (
                  <Music className="h-4 w-4 text-[var(--text-primary)]" />
                )}
                <span className="text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase">
                  {isSonosMode ? t('sonos.pageName') : t('addCard.type.media')}
                </span>
              </div>
              {isSonosMode && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--status-info-fg)]/35 bg-[var(--status-info-bg)] px-3 py-1 text-[10px] font-bold tracking-widest text-[var(--status-info-fg)] uppercase">
                  <span>{listPlayers.length}</span>
                  <span>{t('media.tab.players')}</span>
                </div>
              )}
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
                      colorClass="bg-[var(--text-primary)]"
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
                      type="button"
                      aria-pressed={shuffle}
                      aria-label={t('media.shuffle') || 'Shuffle'}
                      title={t('media.shuffle') || 'Shuffle'}
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
                      type="button"
                      aria-pressed={repeat !== 'off'}
                      aria-label={`${t('media.repeat') || 'Repeat'} (${repeat})`}
                      title={t('media.repeat') || 'Repeat'}
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
                    type="button"
                    aria-pressed={isMuted}
                    aria-label={
                      isMuted
                        ? t('media.volume.unmute') || 'Unmute'
                        : t('media.volume.mute') || 'Mute'
                    }
                    title={
                      isMuted
                        ? t('media.volume.unmute') || 'Unmute'
                        : t('media.volume.mute') || 'Mute'
                    }
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
                      colorClass="bg-[var(--text-primary)]"
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
            <div
              className={`popup-surface flex max-h-[480px] min-h-[480px] w-full min-w-0 flex-col rounded-3xl border p-6 ${
                isSonosMode
                  ? 'border-[var(--status-info-fg)]/30 shadow-[0_12px_35px_rgba(59,130,246,0.12)]'
                  : 'border-[var(--glass-border)]'
              }`}
            >
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
                    data-testid="media-page-choose-tab"
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
                      {t('sonos.managePlayers') || t('media.tab.manage')}
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
                                <div className="absolute inset-0 flex items-center justify-center bg-[var(--glass-bg-strong,rgba(0,0,0,0.3))]">
                                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--text-primary)]" />
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
                <div
                  data-testid="media-page-chooser"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <div className="popup-surface grid flex-shrink-0 grid-cols-2 gap-1 rounded-xl border border-[var(--glass-border)] p-1 sm:grid-cols-4">
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

                  {chooseTab === 'search' && (
                    <input
                      type="search"
                      value={chooseQuery}
                      onChange={(e) => setChooseQuery(e.target.value)}
                      placeholder={t('addCard.search')}
                      className="mt-3 w-full flex-shrink-0 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
                    />
                  )}

                  <div
                    data-testid="media-page-chooser-results"
                    aria-busy={isChooseLoading}
                    className="custom-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto"
                  >
                    <div className="flex h-9 items-center" aria-live="polite">
                      {isChooseLoading ? (
                        <span className="text-[11px] font-medium text-[var(--text-muted)] italic">
                          {t('media.choose.loading')}
                        </span>
                      ) : browseError ? (
                        <span className="text-[11px] font-medium text-amber-400 italic">
                          {t('media.choose.loadError')}
                        </span>
                      ) : null}
                    </div>

                    {isChooseLoading && !hasLoadedBrowseChoices && (
                      <div
                        data-testid="media-page-chooser-loading"
                        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                      >
                        {[0, 1, 2].map((item) => (
                          <div
                            key={item}
                            className="animate-pulse rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2.5"
                          >
                            <div className="aspect-square rounded-xl bg-[var(--glass-bg-hover)]" />
                            <div className="mt-2 h-3 w-4/5 rounded-full bg-[var(--glass-bg-hover)]" />
                          </div>
                        ))}
                      </div>
                    )}

                    {(!isChooseLoading || hasLoadedBrowseChoices) && chooseTab === 'favorites' && (
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

                    {(!isChooseLoading || hasLoadedBrowseChoices) && chooseTab === 'playlists' && (
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

                    {(!isChooseLoading || hasLoadedBrowseChoices) && chooseTab === 'library' && (
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

                    {(!isChooseLoading || hasLoadedBrowseChoices) && chooseTab === 'search' && (
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
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--glass-border)] px-1 pb-3">
                    <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                      {t('media.selectPlayersHint')}
                    </p>
                    <span className="shrink-0 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
                      {selectedIds.length} / {manageablePlayerIds.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {manageablePlayerIds.map((id) => {
                      const entity = entities[id];
                      const isAdded = isPlayerAdded(id);
                      const playerName = entity?.attributes?.friendly_name || id;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="switch"
                          aria-checked={isAdded}
                          aria-label={playerName}
                          onClick={() => togglePlayerSelection(id)}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${isAdded ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'border-transparent hover:bg-[var(--glass-bg)]'}`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]">
                            <Speaker className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                              {playerName}
                            </p>
                            <p className="truncate text-[10px] text-[var(--text-muted)]">{id}</p>
                          </div>
                          <span
                            aria-hidden="true"
                            className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${isAdded ? 'border-[var(--text-primary)] bg-[var(--text-primary)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'}`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full transition-transform ${isAdded ? 'translate-x-5 bg-[var(--modal-bg)] text-[var(--text-primary)]' : 'translate-x-0 bg-[var(--text-muted)] text-transparent'}`}
                            >
                              <Check className="h-3 w-3" />
                            </span>
                          </span>
                        </button>
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

export default memo(MediaPage);
