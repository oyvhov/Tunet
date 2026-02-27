import { useEffect, useState, useCallback } from 'react';
import {
  X,
  Music,
  Tv,
  Speaker,
  Power,
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
  Plus,
  Minus,
  Heart,
} from '../icons';
import M3Slider from '../components/ui/M3Slider';
import { getMediaPlayerPowerAction } from '../utils/mediaPlayerFeatures';

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

const readText = (key, fallback = '') => {
  try {
    const raw = localStorage.getItem(key);
    return typeof raw === 'string' ? raw : fallback;
  } catch {
    return fallback;
  }
};

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
 * @param {Function} props.isMediaActive - Is media active
 * @param {Function} props.isSonosActive - Is Sonos active
 * @param {Function} props.t - Translation function
 * @param {Function} props.formatDuration - Format seconds to duration
 * @param {Function} props.getServerInfo - Media server metadata
 * @param {unknown} props.conn - HA websocket connection
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
  isMediaActive,
  isSonosActive,
  t,
  formatDuration,
  getServerInfo,
  conn,
}) {
  const [sessionSensorIds, setSessionSensorIds] = useState(() =>
    readJSON('tunet_media_session_sensors', [])
  );
  const [showChoosePanel, setShowChoosePanel] = useState(false);
  const [chooseTab, setChooseTab] = useState('favorites');
  const [chooseQuery, setChooseQuery] = useState('');
  const [lastChoiceByPlayer, setLastChoiceByPlayer] = useState(() =>
    readJSON('tunet_media_last_choice', {})
  );
  const [browseChoicesByPlayer, setBrowseChoicesByPlayer] = useState({});
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState('');
  const [favoritesByPlayer, setFavoritesByPlayer] = useState({});
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [showAddSonosPicker, setShowAddSonosPicker] = useState(false);
  const [playerNameDisplayFilter, setPlayerNameDisplayFilter] = useState(() =>
    readText('tunet_media_name_display_filter', '')
  );

  // Load initial state from localStorage
  const [extraSelectedPlayerIds, setExtraSelectedPlayerIds] = useState(() => {
    return readJSON('tunet_media_extra_players', []);
  });

  // Persist to localStorage whenever it changes
  useEffect(() => {
    writeJSON('tunet_media_extra_players', extraSelectedPlayerIds);
  }, [extraSelectedPlayerIds]);

  const inferSourceFromId = useCallback((value) => {
    const text = String(value || '').toLowerCase();
    if (!text) return '';
    if (text.includes('spotify')) return 'Spotify';
    if (text.includes('music_assistant') || text.includes('mass')) return 'Music Assistant';
    if (text.includes('sonos')) return 'Sonos';
    if (text.includes('plex')) return 'Plex';
    if (text.includes('tidal')) return 'TIDAL';
    if (text.includes('youtube')) return 'YouTube';
    if (text.includes('radio')) return 'Radio';
    return '';
  }, []);

  const inferSourceFromObject = useCallback(
    (obj, value) => {
      const provider =
        obj?.provider ||
        obj?.source ||
        obj?.app_name ||
        obj?.media_source ||
        obj?.integration ||
        obj?.library_name ||
        obj?.domain;
      if (provider) return String(provider);
      return inferSourceFromId(value);
    },
    [inferSourceFromId]
  );

  const inferImageFromObject = useCallback(
    (obj) =>
      obj?.thumbnail ||
      obj?.thumb ||
      obj?.image ||
      obj?.icon ||
      obj?.media_image ||
      obj?.media_image_url ||
      null,
    []
  );

  const normalizeChoice = useCallback(
    (item, fallbackType) => {
      if (!item) return null;
      if (typeof item === 'string') {
        const value = item.trim();
        if (!value) return null;
        return {
          id: value,
          label: value,
          type: fallbackType,
          source: inferSourceFromId(value),
          image: null,
        };
      }
      if (typeof item !== 'object') return null;

      const id =
        item.media_content_id || item.id || item.uri || item.url || item.entity_id || item.value;
      if (!id || typeof id !== 'string') return null;

      const label = item.title || item.name || item.friendly_name || item.label || id;
      const type = item.media_content_type || item.type || fallbackType;
      const source = inferSourceFromObject(item, id);
      const image = inferImageFromObject(item);

      return { id, label: String(label), type: String(type), source, image };
    },
    [inferImageFromObject, inferSourceFromId, inferSourceFromObject]
  );

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

  const isMusicContent = useCallback((item) => {
    if (!item) return false;
    const type = String(
      item.media_content_type || item.media_class || item.type || ''
    ).toLowerCase();
    const id = String(item.media_content_id || item.id || item.uri || '').toLowerCase();
    const title = String(item.title || item.name || '').toLowerCase();
    if (BLOCKED_MEDIA_TYPES.has(type)) return false;
    if (BLOCKED_ID_PATTERNS.some((p) => id.includes(p))) return false;
    if (BLOCKED_TITLE_WORDS.some((w) => title.includes(w))) return false;
    return true;
  }, []);

  const flattenBrowseChoices = useCallback(
    (nodes, fallbackType = 'music', sourceHint = '') => {
      const queue = Array.isArray(nodes) ? [...nodes] : [];
      const result = [];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || typeof current !== 'object') continue;
        if (!isMusicContent(current)) continue;

        const nodeType = current.media_content_type || current.media_class || fallbackType;
        const id = current.media_content_id || current.id || current.uri || current.value;
        const canPlay = current.can_play !== false;
        const title = current.title || current.name || id;
        const source =
          current.provider ||
          current.app_name ||
          current.domain ||
          current.library_name ||
          sourceHint ||
          '';
        const image = current.thumbnail || current.thumb || current.image || current.icon || null;

        if (id && canPlay) {
          result.push({
            id: String(id),
            label: String(title),
            type: String(nodeType || fallbackType),
            source: String(source || ''),
            image,
          });
        }

        if (Array.isArray(current.children) && current.children.length > 0) {
          queue.push(...current.children);
        }
      }
      return normalizeChoiceArray(result, fallbackType);
    },
    [isMusicContent, normalizeChoiceArray]
  );

  const mergeChoiceArrays = useCallback(
    (...arrays) => normalizeChoiceArray(arrays.flat(), 'music'),
    [normalizeChoiceArray]
  );

  useEffect(() => {
    if (Array.isArray(activeMediaSessionSensorIds)) {
      setSessionSensorIds(activeMediaSessionSensorIds);
      writeJSON('tunet_media_session_sensors', activeMediaSessionSensorIds);
    }
  }, [activeMediaSessionSensorIds]);

  useEffect(() => {
    writeJSON('tunet_media_session_sensors', sessionSensorIds);
  }, [sessionSensorIds]);

  useEffect(() => {
    writeJSON('tunet_media_last_choice', lastChoiceByPlayer);
  }, [lastChoiceByPlayer]);

  useEffect(() => {
    if (!show) return;
    setPlayerNameDisplayFilter(readText('tunet_media_name_display_filter', ''));
  }, [show]);

  const applyPlayerNameDisplayFilter = useCallback(
    (value) => {
      const name = String(value || '');
      const patterns = String(playerNameDisplayFilter || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

      if (!name || patterns.length === 0) return name;

      let cleaned = name;
      let didApply = false;
      patterns.forEach((pattern) => {
        const wildcardIndex = pattern.indexOf('*');
        const prefixCandidate = wildcardIndex >= 0 ? pattern.slice(0, wildcardIndex) : pattern;
        const prefix = prefixCandidate.trim();
        if (!prefix) return;

        const escapedPrefix = prefix.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${escapedPrefix}`, 'i');
        if (regex.test(cleaned)) {
          cleaned = cleaned.replace(regex, '').trim();
          didApply = true;
        }
      });

      return didApply ? cleaned : name;
    },
    [playerNameDisplayFilter]
  );

  const isMusicAssistantEntity = (entity) => {
    if (!entity) return false;
    if (entity.attributes?.mass_player_type) return true;
    const entityId = (entity.entity_id || '').toLowerCase();
    const friendlyName = (entity.attributes?.friendly_name || '').toLowerCase();
    const platform = (entity.attributes?.platform || '').toLowerCase();
    const integration = (entity.attributes?.integration || '').toLowerCase();
    const attribution = (entity.attributes?.attribution || '').toLowerCase();
    const appName = (entity.attributes?.app_name || '').toLowerCase();
    const mediaContentId = (entity.attributes?.media_content_id || '').toLowerCase();
    const model = (entity.attributes?.model || '').toLowerCase();
    return (
      platform.includes('music_assistant') ||
      platform === 'mass' ||
      integration.includes('music_assistant') ||
      integration === 'mass' ||
      entityId.includes('music_assistant') ||
      entityId.includes('mass_') ||
      friendlyName.includes('music assistant') ||
      attribution.includes('music assistant') ||
      appName.includes('music assistant') ||
      mediaContentId.includes('music_assistant') ||
      model.includes('music assistant')
    );
  };

  const isStrictSonosEntity = (entity) => {
    if (!entity) return false;
    if (isMusicAssistantEntity(entity)) return false;
    const manufacturer = (entity.attributes?.manufacturer || '').toLowerCase();
    const platform = (entity.attributes?.platform || '').toLowerCase();
    if (manufacturer.includes('sonos') || platform.includes('sonos')) return true;

    const entityId = (entity.entity_id || '').toLowerCase();
    const friendlyName = (entity.attributes?.friendly_name || '').toLowerCase();
    return entityId.includes('sonos') || friendlyName.includes('sonos');
  };

  const isSonosUiEntity = (entity) => {
    if (!entity) return false;
    if (isStrictSonosEntity(entity)) return true;
    const entityId = (entity.entity_id || '').toLowerCase();
    const friendlyName = (entity.attributes?.friendly_name || '').toLowerCase();
    return entityId.includes('sonos') || friendlyName.includes('sonos');
  };

  const sonosIds = Object.keys(entities)
    .filter((id) => id.startsWith('media_player.'))
    .filter((id) => isStrictSonosEntity(entities[id]));

  const isSonos = activeMediaModal === 'sonos';
  const allMediaIds = Object.keys(entities).filter((id) => id.startsWith('media_player.'));
  const fallbackId = allMediaIds.map((id) => entities[id]).find(isMediaActive)?.entity_id;
  const groupSettings = activeMediaGroupKey ? cardSettings[activeMediaGroupKey] : null;
  const groupIds =
    Array.isArray(activeMediaGroupIds) && activeMediaGroupIds.length > 0
      ? activeMediaGroupIds
      : Array.isArray(groupSettings?.mediaIds)
        ? groupSettings.mediaIds
        : [];
  const baseMediaIds = isSonos
    ? groupIds.length > 0
      ? groupIds
      : activeMediaId
        ? [activeMediaId]
        : sonosIds
    : groupIds.length > 0
      ? groupIds
      : activeMediaId
        ? [activeMediaId]
        : fallbackId
          ? [fallbackId]
          : [];
  // Determine if we are primarily looking at Sonos
  // We need a temporary check before including extras to avoid polluting generic cards
  const isBaseSonos =
    isSonos ||
    (baseMediaIds.length > 0 && baseMediaIds.every((id) => isStrictSonosEntity(entities[id])));

  // Only include extra (pinned) players if we are already in a Sonos context
  const effectiveExtras = isBaseSonos ? extraSelectedPlayerIds : [];

  const mediaIds = [
    ...new Set([...(Array.isArray(baseMediaIds) ? baseMediaIds : []), ...effectiveExtras]),
  ];
  const mediaEntities = mediaIds.map((id) => entities[id]).filter(Boolean);
  const isAllSonos =
    !activeMediaGroupIds &&
    !isSonos &&
    mediaEntities.length > 0 &&
    mediaEntities.every(isStrictSonosEntity);
  const isGenericMedia = !isSonos;
  const treatAsSonos = isSonos || isAllSonos;

  const sessions = sessionSensorIds
    .map((id) => getA(id, 'sessions', []))
    .filter((arr) => Array.isArray(arr))
    .flat();

  const listPlayers = mediaEntities
    .filter(Boolean)
    .slice()
    .sort((a, b) => {
      const aActive = treatAsSonos ? isSonosActive(a) : isMediaActive(a);
      const bActive = treatAsSonos ? isSonosActive(b) : isMediaActive(b);
      if (aActive !== bActive) return aActive ? -1 : 1;
      return (a.attributes?.friendly_name || '').localeCompare(b.attributes?.friendly_name || '');
    });

  let currentMp = mediaEntities.find((e) => e.entity_id === activeMediaId);
  if (!currentMp) {
    const activePlayers = mediaEntities.filter((e) =>
      treatAsSonos ? isSonosActive(e) : isMediaActive(e)
    );
    if (activePlayers.length > 0) currentMp = activePlayers[0];
    else currentMp = mediaEntities[0];
  }

  const mpId = currentMp?.entity_id || null;
  const mpState = currentMp?.state || 'off';
  const isCurrentSonos = isStrictSonosEntity(currentMp);
  const contentType = mpId ? getA(mpId, 'media_content_type') : null;
  const isChannel = contentType === 'channel';
  const isPlaying = mpState === 'playing';
  const powerAction = getMediaPlayerPowerAction(currentMp);
  const canTogglePower = Boolean(powerAction);
  const isPowerOffAction = powerAction === 'turn_off';

  let mpTitle = mpId ? getA(mpId, 'media_title') : '';

  let mpSeries = mpId ? getA(mpId, 'media_series_title') : '';
  if (contentType === 'episode') {
    const season = mpId ? getA(mpId, 'media_season') : '';
    if (mpSeries && season) mpSeries = `${mpSeries} • ${season}`;
    else if (!mpSeries && season) mpSeries = season;
  }
  if (!mpSeries) mpSeries = mpId ? getA(mpId, 'media_artist') || getA(mpId, 'media_season') : '';

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
  const duration = mpId ? getA(mpId, 'media_duration') : null;
  const position = mpId ? getA(mpId, 'media_position') : null;
  const positionUpdatedAt = mpId ? getA(mpId, 'media_position_updated_at') : null;
  const serverInfo = mpId ? getServerInfo(mpId) : {};
  const serverLabel = isGenericMedia ? serverInfo.name || t('addCard.type.media') : 'SONOS';
  const groupCardId =
    activeMediaGroupKey && activeMediaGroupKey.includes('::')
      ? activeMediaGroupKey.split('::').slice(1).join('::')
      : null;
  const popupHeading =
    isGenericMedia && groupCardId && customNames[groupCardId]
      ? customNames[groupCardId]
      : serverLabel;

  const basePosition = typeof position === 'number' ? position : 0;
  const updatedAtMs = positionUpdatedAt ? new Date(positionUpdatedAt).getTime() : null;
  const elapsed =
    isPlaying && Number.isFinite(updatedAtMs) ? Math.max(0, (mediaTick - updatedAtMs) / 1000) : 0;
  const effectivePosition = Math.min(duration || basePosition, basePosition + elapsed);

  const volume = mpId ? getA(mpId, 'volume_level', 0) : 0;
  const isMuted = mpId ? getA(mpId, 'is_volume_muted', false) : false;
  const shuffle = mpId ? getA(mpId, 'shuffle', false) : false;
  const repeat = mpId ? getA(mpId, 'repeat', 'off') : 'off';
  const VOLUME_STEP = 0.03;
  const changeVolumeByStep = (delta) => {
    const nextVolume = Math.min(1, Math.max(0, (Number(volume) || 0) + delta));
    callService('media_player', 'volume_set', { entity_id: mpId, volume_level: nextVolume });
  };
  const rawMembers = mpId ? getA(mpId, 'group_members') : [];
  const groupMembers = Array.isArray(rawMembers) ? rawMembers : [];
  const canGroup = isCurrentSonos;
  const availableSonosToAdd = sonosIds
    .filter((id) => id !== mpId)
    .filter((id) => !mediaIds.includes(id))
    .map((id) => entities[id])
    .filter(Boolean)
    .sort((a, b) =>
      (a.attributes?.friendly_name || a.entity_id).localeCompare(
        b.attributes?.friendly_name || b.entity_id
      )
    );

  useEffect(() => {
    // setExtraSelectedPlayerIds([]); // Keep selections persistent
    setShowAddSonosPicker(false);
  }, [activeMediaModal, activeMediaGroupKey, activeMediaId]);

  // ── Favorites browse (like custom-sonos-card) ─────────────────────
  const fetchFavorites = useCallback(
    async (playerId) => {
      if (!playerId || !conn || typeof conn.sendMessagePromise !== 'function') return;
      // Don't re-fetch if we already have favorites for this player
      if (favoritesByPlayer[playerId]?.length >= 0) return;

      setFavoritesLoading(true);
      try {
        // Step 1: Get the root browse tree
        const rootPayload = { type: 'media_player/browse_media', entity_id: playerId };
        const rootResp = await conn.sendMessagePromise(rootPayload);
        const root = rootResp?.result || rootResp || null;
        if (!root) {
          setFavoritesLoading(false);
          return;
        }

        const rootChildren = Array.isArray(root.children) ? root.children : [];

        // Step 2: Find the "favorites" folder (like custom-sonos-card)
        const favoritesDir = rootChildren.find((child) => {
          const type = String(child?.media_content_type || '').toLowerCase();
          const id = String(child?.media_content_id || '').toLowerCase();
          const title = String(child?.title || '').toLowerCase();
          return (
            type === 'favorites' ||
            id === 'favorites' ||
            title === 'favorites' ||
            title === 'my favorites' ||
            title === 'sonos favorites' ||
            type.includes('favorites') ||
            id.includes('favorites')
          );
        });

        if (!favoritesDir) {
          // Fallback: use source_list from entity attributes
          const sourceList = getA(playerId, 'source_list', []);
          const sonosFavs = getA(playerId, 'sonos_favorites', []);
          const fallbackItems = [
            ...normalizeChoiceArray(sonosFavs, 'music'),
            ...normalizeChoiceArray(
              sourceList.map((s) => ({ title: s, id: s })),
              'music'
            ),
          ];
          setFavoritesByPlayer((prev) => ({ ...prev, [playerId]: fallbackItems }));
          setFavoritesLoading(false);
          return;
        }

        // Step 3: Recursively browse the favorites directory
        const allFavorites = [];
        const browseFavDir = async (dir) => {
          const payload = {
            type: 'media_player/browse_media',
            entity_id: playerId,
            media_content_type: dir.media_content_type,
            media_content_id: dir.media_content_id,
          };
          const resp = await conn.sendMessagePromise(payload);
          const detail = resp?.result || resp || null;
          const children = Array.isArray(detail?.children) ? detail.children : [];
          for (const child of children) {
            if (child.can_play) {
              allFavorites.push({
                id: child.media_content_id || child.title,
                label: child.title || child.media_content_id,
                type: child.media_content_type || 'music',
                source: detail?.title || 'Favorites',
                image: child.thumbnail || null,
              });
            } else if (child.can_expand) {
              await browseFavDir(child);
            }
          }
        };
        await browseFavDir(favoritesDir);

        // Also merge in sonos_favorites attribute if present
        const sonosFavs = getA(playerId, 'sonos_favorites', []);
        const merged = normalizeChoiceArray(
          [...allFavorites, ...normalizeChoiceArray(sonosFavs, 'music')],
          'music'
        );

        setFavoritesByPlayer((prev) => ({ ...prev, [playerId]: merged }));
      } catch (err) {
        console.error('Failed to fetch favorites:', err);
        // Fallback to sonos_favorites attribute
        const sonosFavs = getA(playerId, 'sonos_favorites', []);
        setFavoritesByPlayer((prev) => ({
          ...prev,
          [playerId]: normalizeChoiceArray(sonosFavs, 'music'),
        }));
      } finally {
        setFavoritesLoading(false);
      }
    },
    [conn, favoritesByPlayer, getA, normalizeChoiceArray]
  );

  // Fetch favorites when the Choose panel opens or the player changes
  useEffect(() => {
    if (show && showChoosePanel && mpId) {
      fetchFavorites(mpId);
    }
  }, [show, showChoosePanel, mpId, fetchFavorites]);

  const currentFavorites = favoritesByPlayer[mpId] || [];

  // ── Music Assistant browse (only for MA entities) ──────────────────
  useEffect(() => {
    const canBrowse =
      show && showChoosePanel && !!mpId && conn && typeof conn.sendMessagePromise === 'function';
    if (!canBrowse) return;

    const cached = browseChoicesByPlayer?.[mpId];
    if (cached && cached._version === 2 && cached.playlists.length > 0) return;

    let cancelled = false;

    const browseMA = async () => {
      const payload = {
        type: 'media_player/browse_media',
        entity_id: mpId,
      };
      const response = await conn.sendMessagePromise(payload);
      return response?.result || response || null;
    };

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

    const loadChoices = async () => {
      setBrowseLoading(true);
      setBrowseError('');
      try {
        const root = await browseMA();
        if (!root || cancelled) return;

        const rootChildren = Array.isArray(root.children) ? root.children : [];
        const playlists = [];
        const library = [];

        // Only expand music-related branches (skip cameras, TV, etc.)
        const musicBranches = rootChildren.filter(
          (child) => child && typeof child === 'object' && isMusicContent(child)
        );

        // Add playable root items directly
        const rootPlayable = flattenBrowseChoices(
          musicBranches.filter((c) => c.can_play),
          'music',
          ''
        );
        library.push(...rootPlayable);

        // Expand up to 8 branches that can be expanded
        const expandable = musicBranches.filter((c) => c.can_expand).slice(0, 8);

        for (const branch of expandable) {
          if (cancelled) break;
          const isPlaylist = isPlaylistNode(branch);
          const sourceHint = branch?.title || '';
          try {
            const payload = {
              type: 'media_player/browse_media',
              entity_id: mpId,
              media_content_type: branch.media_content_type,
              media_content_id: branch.media_content_id,
            };
            const detail = await conn.sendMessagePromise(payload);
            const detailResult = detail?.result || detail || null;
            const children = Array.isArray(detailResult?.children) ? detailResult.children : [];
            const items = flattenBrowseChoices(
              children,
              isPlaylist ? 'playlist' : 'music',
              sourceHint
            );
            if (isPlaylist) playlists.push(...items);
            else library.push(...items);
          } catch {
            // Skip failed branches
          }
        }

        if (!cancelled) {
          setBrowseChoicesByPlayer((prev) => ({
            ...(prev || {}),
            [mpId]: {
              _version: 2,
              playlists: normalizeChoiceArray(playlists, 'playlist'),
              library: normalizeChoiceArray(library, 'music'),
            },
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setBrowseError(error?.message || 'browse_failed');
        }
      } finally {
        if (!cancelled) setBrowseLoading(false);
      }
    };

    loadChoices();
    return () => {
      cancelled = true;
    };
  }, [
    show,
    showChoosePanel,
    mpId,
    conn,
    browseChoicesByPlayer,
    flattenBrowseChoices,
    isMusicContent,
    normalizeChoiceArray,
  ]);

  const browseChoices = browseChoicesByPlayer?.[mpId] || { playlists: [], library: [] };

  const playlistChoices = mergeChoiceArrays(
    browseChoices.playlists,
    ...normalizeChoiceArray(mpId ? getA(mpId, 'sonos_playlists', []) : [], 'playlist')
  );

  const libraryChoices = mergeChoiceArrays(
    browseChoices.library || [],
    ...normalizeChoiceArray(mpId ? getA(mpId, 'sonos_favorites', []) : [], 'music')
  );

  const allSearchChoices = normalizeChoiceArray([...playlistChoices, ...libraryChoices], 'music');

  const loweredQuery = chooseQuery.trim().toLowerCase();
  const filteredSearchChoices = loweredQuery
    ? allSearchChoices.filter(
        (choice) =>
          choice.label.toLowerCase().includes(loweredQuery) ||
          choice.id.toLowerCase().includes(loweredQuery)
      )
    : allSearchChoices;

  const lastChoice = lastChoiceByPlayer?.[mpId] || null;

  const playChoice = (choice) => {
    if (!choice?.id) return;
    callService('media_player', 'play_media', {
      entity_id: mpId,
      media_content_id: choice.id,
      media_content_type: choice.type || 'music',
    });
    setLastChoiceByPlayer((prev) => ({
      ...(prev || {}),
      [mpId]: {
        id: choice.id,
        label: choice.label,
        type: choice.type || 'music',
      },
    }));
    setShowChoosePanel(false);
  };

  const renderChoiceButton = (choice, keyPrefix = '') => {
    return (
      <button
        key={`${keyPrefix}${choice.type}::${choice.id}`}
        type="button"
        onClick={() => playChoice(choice)}
        className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 text-left hover:bg-[var(--glass-bg-hover)]"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--glass-bg-hover)]">
            <div className="flex h-full w-full items-center justify-center">
              <Music className="h-4 w-4 text-[var(--text-secondary)]" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
              {choice.label}
            </p>
            <p className="truncate text-[10px] text-[var(--text-muted)]">
              {t('media.choose.from')} {choice.source || t('media.choose.unknownSource')} •{' '}
              {choice.type}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const renderChooseTabButton = (id, label) => (
    <button
      key={id}
      type="button"
      onClick={() => setChooseTab(id)}
      className={`rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase ${chooseTab === id ? 'text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
      style={
        chooseTab === id
          ? { backgroundColor: 'var(--accent-color)' }
          : { backgroundColor: 'var(--glass-bg)' }
      }
    >
      {label}
    </button>
  );

  if (!show) return null;

  if (!currentMp) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans md:p-6"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      >
        <div
          className="popup-anim relative w-full max-w-2xl rounded-3xl border p-6 shadow-2xl backdrop-blur-xl md:rounded-[4rem] md:p-12"
          style={{
            background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
            borderColor: 'var(--glass-border)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="modal-close absolute top-6 right-6 z-20 md:top-10 md:right-10"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="text-center text-[var(--text-primary)]">{t('media.noPlayerFound')}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative flex max-h-[95vh] w-full max-w-5xl flex-col gap-6 overflow-y-auto rounded-3xl border p-6 shadow-2xl backdrop-blur-xl md:flex-row md:gap-12 md:overflow-hidden md:rounded-[4rem] md:p-12"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-6 right-6 z-20 md:top-10 md:right-10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10 flex flex-1 flex-col justify-center">
          <div className="mb-6 flex items-center gap-4">
            <div
              className="rounded-2xl p-4 transition-all duration-500"
              style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-secondary)' }}
            >
              {isChannel ? (
                <Tv className="h-8 w-8" />
              ) : isCurrentSonos ? (
                <Speaker className="h-8 w-8" />
              ) : (
                <Music className="h-8 w-8" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic">
                {activeUser
                  ? `${activeUser} - ${applyPlayerNameDisplayFilter(currentMp.attributes?.friendly_name || mpId)}`
                  : applyPlayerNameDisplayFilter(currentMp.attributes?.friendly_name || mpId)}
              </h3>
              <div
                className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1"
                style={{
                  backgroundColor: 'var(--glass-bg)',
                  borderColor: 'var(--glass-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${mpState === 'playing' ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : mpState === 'paused' ? 'bg-amber-400' : 'bg-slate-600'}`}
                />
                <span className="text-[10px] font-bold tracking-widest uppercase italic">
                  {isCurrentSonos ? t('media.sonosLabel') : popupHeading || mpState}
                </span>
              </div>
            </div>
          </div>
          <div className="mb-6 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowChoosePanel(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs font-bold tracking-wider uppercase">
                  {t('media.chooseMedia')}
                </span>
              </button>
              {lastChoice?.id && (
                <button
                  type="button"
                  onClick={() => playChoice(lastChoice)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 transition-colors hover:bg-[var(--glass-bg-hover)]"
                >
                  <Music className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className="max-w-[220px] truncate text-[11px] font-semibold text-[var(--text-secondary)]">
                    {t('media.choose.lastChoice')}: {lastChoice.label}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-2xl">
              <div className="flex h-full w-full items-center justify-center">
                {isChannel ? (
                  <Tv className="h-20 w-20 text-gray-700" />
                ) : isSonos ? (
                  <Speaker className="h-20 w-20 text-gray-700" />
                ) : (
                  <Music className="h-20 w-20 text-gray-700" />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-0 left-0 w-full p-8">
                <p className="mb-2 text-sm font-bold tracking-widest text-[var(--accent-color)] uppercase">
                  {activeUser
                    ? `${activeUser} - ${applyPlayerNameDisplayFilter(currentMp.attributes?.friendly_name || mpId)}`
                    : applyPlayerNameDisplayFilter(currentMp.attributes?.friendly_name || mpId)}
                </p>
                <h2 className="mb-2 line-clamp-2 text-2xl leading-tight font-bold text-white md:text-4xl">
                  {mpTitle || t('common.unknown')}
                </h2>
                <p className="text-xl font-medium text-gray-300">{mpSeries}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between px-1 text-xs font-bold tracking-widest text-gray-500">
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

              {isSonos ? (
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex items-center justify-center gap-[clamp(0.25rem,1.6vw,1.5rem)]">
                    <button
                      onClick={() =>
                        callService('media_player', 'shuffle_set', {
                          entity_id: mpId,
                          shuffle: !shuffle,
                        })
                      }
                      className={`rounded-full p-[clamp(0.25rem,1vw,0.5rem)] transition-colors ${shuffle ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Shuffle className="h-[clamp(0.9rem,2vw,1rem)] w-[clamp(0.9rem,2vw,1rem)]" />
                    </button>

                    <button
                      onClick={() =>
                        callService('media_player', 'media_previous_track', { entity_id: mpId })
                      }
                      className="rounded-full p-[clamp(0.25rem,1vw,0.5rem)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95"
                    >
                      <SkipBack className="h-[clamp(1.1rem,2.6vw,1.25rem)] w-[clamp(1.1rem,2.6vw,1.25rem)] text-[var(--text-secondary)]" />
                    </button>
                    <button
                      onClick={() =>
                        callService('media_player', 'media_play_pause', { entity_id: mpId })
                      }
                      className="rounded-full bg-[var(--text-primary)] p-[clamp(0.35rem,1.2vw,0.75rem)] shadow-lg transition-colors active:scale-95"
                    >
                      {isPlaying ? (
                        <Pause
                          className="h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)]"
                          color="var(--bg-primary)"
                          fill="var(--bg-primary)"
                        />
                      ) : (
                        <Play
                          className="ml-0.5 h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)]"
                          color="var(--bg-primary)"
                          fill="var(--bg-primary)"
                        />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        callService('media_player', 'media_next_track', { entity_id: mpId })
                      }
                      className="rounded-full p-[clamp(0.25rem,1vw,0.5rem)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95"
                    >
                      <SkipForward className="h-[clamp(1.1rem,2.6vw,1.25rem)] w-[clamp(1.1rem,2.6vw,1.25rem)] text-[var(--text-secondary)]" />
                    </button>

                    <button
                      onClick={() => {
                        const modes = ['off', 'one', 'all'];
                        const nextMode = modes[(modes.indexOf(repeat) + 1) % modes.length];
                        callService('media_player', 'repeat_set', {
                          entity_id: mpId,
                          repeat: nextMode,
                        });
                      }}
                      className={`rounded-full p-[clamp(0.25rem,1vw,0.5rem)] transition-colors ${repeat !== 'off' ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      {repeat === 'one' ? (
                        <Repeat1 className="h-[clamp(0.9rem,2vw,1rem)] w-[clamp(0.9rem,2vw,1rem)]" />
                      ) : (
                        <Repeat className="h-[clamp(0.9rem,2vw,1rem)] w-[clamp(0.9rem,2vw,1rem)]" />
                      )}
                    </button>
                    {canTogglePower && (
                      <button
                        onClick={() =>
                          callService('media_player', powerAction, { entity_id: mpId })
                        }
                        className={`rounded-full p-[clamp(0.25rem,1vw,0.5rem)] transition-colors ${isPowerOffAction ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                        title={isPowerOffAction ? t('status.off') : t('status.on')}
                      >
                        <Power className="h-[clamp(0.9rem,2vw,1rem)] w-[clamp(0.9rem,2vw,1rem)]" />
                      </button>
                    )}
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
              ) : (
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex items-center justify-center gap-[clamp(0.25rem,1.8vw,1.5rem)]">
                    <button
                      onClick={() =>
                        callService('media_player', 'media_previous_track', { entity_id: mpId })
                      }
                      className="rounded-full p-[clamp(0.45rem,1.4vw,1rem)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95"
                    >
                      <SkipBack className="h-[clamp(1.25rem,3vw,2rem)] w-[clamp(1.25rem,3vw,2rem)] text-[var(--text-secondary)]" />
                    </button>
                    <button
                      onClick={() =>
                        callService('media_player', 'media_play_pause', { entity_id: mpId })
                      }
                      className="rounded-full bg-[var(--text-primary)] p-[clamp(0.65rem,2vw,1.5rem)] shadow-lg transition-colors active:scale-95"
                    >
                      {isPlaying ? (
                        <Pause
                          className="h-[clamp(1.25rem,3vw,2rem)] w-[clamp(1.25rem,3vw,2rem)]"
                          color="var(--bg-primary)"
                          fill="var(--bg-primary)"
                        />
                      ) : (
                        <Play
                          className="ml-1 h-[clamp(1.25rem,3vw,2rem)] w-[clamp(1.25rem,3vw,2rem)]"
                          color="var(--bg-primary)"
                          fill="var(--bg-primary)"
                        />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        callService('media_player', 'media_next_track', { entity_id: mpId })
                      }
                      className="rounded-full p-[clamp(0.45rem,1.4vw,1rem)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95"
                    >
                      <SkipForward className="h-[clamp(1.25rem,3vw,2rem)] w-[clamp(1.25rem,3vw,2rem)] text-[var(--text-secondary)]" />
                    </button>
                    {canTogglePower && (
                      <button
                        onClick={() =>
                          callService('media_player', powerAction, { entity_id: mpId })
                        }
                        className={`rounded-full p-[clamp(0.45rem,1.4vw,1rem)] transition-colors active:scale-95 ${isPowerOffAction ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                        title={isPowerOffAction ? t('status.off') : t('status.on')}
                      >
                        <Power className="h-[clamp(1.25rem,3vw,2rem)] w-[clamp(1.25rem,3vw,2rem)]" />
                      </button>
                    )}
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
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-6 overflow-y-auto border-t border-[var(--glass-border)] pt-6 pl-0 md:w-80 md:border-t-0 md:border-l md:pt-24 md:pl-12">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-[0.2em] text-gray-500 uppercase">
              {isSonos || isAllSonos
                ? t('media.group.sonosPlayers')
                : t('media.group.selectedPlayers')}
            </h3>
            <div className="flex items-center gap-2">
              {canGroup && listPlayers.length > 1 && (
                <button
                  onClick={() => {
                    const allIds = listPlayers.map((p) => p.entity_id);
                    const unjoined = allIds.filter((id) => !groupMembers.includes(id));
                    if (unjoined.length > 0) {
                      callService('media_player', 'join', {
                        entity_id: mpId,
                        group_members: unjoined,
                      });
                    } else {
                      const others = groupMembers.filter((id) => id !== mpId);
                      others.forEach((id) =>
                        callService('media_player', 'unjoin', { entity_id: id })
                      );
                    }
                  }}
                  className="text-[10px] font-bold tracking-widest text-[var(--accent-color)] uppercase transition-colors hover:text-white"
                >
                  {listPlayers.every((p) => groupMembers.includes(p.entity_id))
                    ? t('sonos.ungroupAll')
                    : t('sonos.groupAll')}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {listPlayers.length === 0 && (
              <p className="text-sm text-gray-600 italic">{t('media.noPlayersFound')}</p>
            )}
            {listPlayers.map((p, idx) => {
              const isSelected = p.entity_id === mpId;
              const isMember = groupMembers.includes(p.entity_id);
              const isSelf = p.entity_id === mpId;
              const isActivePlayer = treatAsSonos ? isSonosActive(p) : isMediaActive(p);
              const pTitle = getA(p.entity_id, 'media_title', t('common.unknown'));
              const pUser = (() => {
                const s = Array.isArray(sessions)
                  ? sessions.find(
                      (s) =>
                        s.device_name &&
                        (p.attributes?.friendly_name || '')
                          .toLowerCase()
                          .includes(s.device_name.toLowerCase())
                    )
                  : null;
                return s?.user_name || '';
              })();

              return (
                <div
                  key={p.entity_id || idx}
                  className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${isSelected ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'border-transparent hover:bg-[var(--glass-bg)]'} ${isActivePlayer ? '' : 'opacity-70'}`}
                >
                  <button
                    onClick={() => setActiveMediaId(p.entity_id)}
                    className="group flex min-w-0 flex-1 items-center gap-4 text-left"
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--glass-bg)]">
                      <div className="flex h-full w-full items-center justify-center">
                        {isSonosUiEntity(p) ? (
                          <Speaker className="h-5 w-5 text-gray-600" />
                        ) : (
                          <Music className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
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
                        {applyPlayerNameDisplayFilter(p.attributes?.friendly_name || p.entity_id)}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-gray-600">{pTitle}</p>
                      {pUser && <p className="truncate text-[10px] text-gray-500">{pUser}</p>}
                    </div>
                  </button>
                  {canGroup && !isSelf && (
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
                      className={`rounded-full p-2.5 transition-all ${isMember ? 'bg-[var(--accent-color)] text-white shadow-lg ' : 'bg-[var(--glass-bg)] text-gray-500 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                      title={isMember ? t('tooltip.removeFromGroup') : t('tooltip.addToGroup')}
                    >
                      {isMember ? <Link className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                  )}
                  {canGroup && isSelf && groupMembers.length > 1 && (
                    <div
                      className="rounded-full bg-[var(--accent-bg)] p-2.5 text-[var(--accent-color)]"
                      title={t('tooltip.linked')}
                    >
                      <Link className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {canGroup && (
            <div className="space-y-2 border-t border-[var(--glass-border)] pt-2">
              <button
                type="button"
                onClick={() => setShowAddSonosPicker((prev) => !prev)}
                className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase transition-colors hover:text-emerald-300"
              >
                + {t('media.addSonosPlayer')}
              </button>
              {showAddSonosPicker && (
                <div className="popup-surface space-y-2 rounded-2xl border border-[var(--glass-border)] p-3">
                  {extraSelectedPlayerIds.length > 0 && (
                    <div className="space-y-2 border-b border-[var(--glass-border)] pb-2">
                      <p className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
                        {t('media.group.selectedPlayers')}
                      </p>
                      {effectiveExtras
                        .map((id) => entities[id])
                        .filter(Boolean)
                        .map((player) => (
                          <div
                            key={`selected-${player.entity_id}`}
                            className="flex items-center justify-between gap-2 rounded-xl bg-[var(--glass-bg)] px-3 py-2"
                          >
                            <span className="truncate text-xs text-[var(--text-secondary)]">
                              {applyPlayerNameDisplayFilter(
                                player.attributes?.friendly_name || player.entity_id
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setExtraSelectedPlayerIds((prev) =>
                                  prev.filter((id) => id !== player.entity_id)
                                )
                              }
                              className="text-[10px] font-bold tracking-widest text-rose-400 uppercase transition-colors hover:text-rose-300"
                            >
                              {t('media.clearSelection')}
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                  {availableSonosToAdd.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] italic">
                      {t('media.noAvailableSonosPlayers')}
                    </p>
                  )}
                  {availableSonosToAdd.map((player) => (
                    <button
                      key={player.entity_id}
                      type="button"
                      onClick={() => {
                        setExtraSelectedPlayerIds((prev) => [
                          ...new Set([...(prev || []), player.entity_id]),
                        ]);
                        setShowAddSonosPicker(false);
                      }}
                      className="popup-surface popup-surface-hover w-full rounded-xl px-3 py-2 text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {applyPlayerNameDisplayFilter(
                        player.attributes?.friendly_name || player.entity_id
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {showChoosePanel && (
          <button
            type="button"
            aria-label={t('common.close')}
            className="absolute inset-0 z-20 bg-black/30"
            onClick={() => setShowChoosePanel(false)}
          />
        )}

        <aside
          className={`absolute top-0 right-0 z-30 h-full w-full transform border-l border-[var(--glass-border)] bg-[var(--modal-bg)] backdrop-blur-2xl transition-transform duration-300 ease-out md:w-[420px] ${showChoosePanel ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex h-full flex-col gap-4 p-4 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold tracking-[0.2em] text-[var(--text-primary)] uppercase">
                  {t('media.chooseMedia')}
                </h4>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {t('media.chooseMediaHint')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChoosePanel(false)}
                className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {renderChooseTabButton('favorites', t('media.choose.tab.favorites'))}
              {renderChooseTabButton('playlists', t('media.choose.tab.playlists'))}
              {libraryChoices.length > 0 &&
                renderChooseTabButton('library', t('media.choose.tab.library'))}
              {!isSonos && renderChooseTabButton('search', t('media.choose.tab.search'))}
            </div>

            {chooseTab === 'search' && (
              <input
                type="text"
                value={chooseQuery}
                onChange={(event) => setChooseQuery(event.target.value)}
                placeholder={t('addCard.search')}
                className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
              />
            )}

            <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
              {browseLoading && (
                <p className="py-2 text-sm text-[var(--text-muted)] italic">
                  {t('media.choose.loading')}
                </p>
              )}
              {!browseLoading && browseError && (
                <p className="py-2 text-sm text-amber-400 italic">{t('media.choose.loadError')}</p>
              )}

              {chooseTab === 'favorites' && (
                <>
                  {favoritesLoading && (
                    <p className="py-2 text-sm text-[var(--text-muted)] italic">
                      {t('media.choose.loading')}
                    </p>
                  )}
                  {!favoritesLoading && currentFavorites.length === 0 && (
                    <p className="py-3 text-sm text-[var(--text-muted)] italic">
                      {t('media.choose.emptyFavorites')}
                    </p>
                  )}
                  {!favoritesLoading && currentFavorites.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {currentFavorites.map((fav) => {
                        return (
                          <button
                            key={`fav::${fav.type}::${fav.id}`}
                            type="button"
                            onClick={() => playChoice(fav)}
                            className="group flex flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-[var(--glass-bg-hover)]"
                          >
                            <div className="aspect-square w-full flex-shrink-0 overflow-hidden rounded-lg bg-[var(--glass-bg-hover)]">
                              <div className="flex h-full w-full items-center justify-center">
                                <Heart className="h-6 w-6 text-[var(--text-secondary)] transition-colors group-hover:text-[var(--accent-color)]" />
                              </div>
                            </div>
                            <p className="line-clamp-2 text-center text-[10px] leading-tight font-bold tracking-wider text-[var(--text-primary)] uppercase">
                              {fav.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {chooseTab === 'playlists' && (
                <>
                  {playlistChoices.length === 0 && (
                    <p className="py-3 text-sm text-[var(--text-muted)] italic">
                      {t('media.choose.emptyPlaylists')}
                    </p>
                  )}
                  {playlistChoices.map((choice) => renderChoiceButton(choice, 'playlist::'))}
                </>
              )}

              {chooseTab === 'library' && (
                <>
                  {libraryChoices.length === 0 && (
                    <p className="py-3 text-sm text-[var(--text-muted)] italic">
                      {t('media.choose.emptyResults')}
                    </p>
                  )}
                  {libraryChoices.map((choice) => renderChoiceButton(choice, 'library::'))}
                </>
              )}

              {chooseTab === 'search' && (
                <>
                  {filteredSearchChoices.length === 0 && (
                    <p className="py-3 text-sm text-[var(--text-muted)] italic">
                      {t('media.choose.emptyResults')}
                    </p>
                  )}
                  {filteredSearchChoices.map((choice) => renderChoiceButton(choice, 'search::'))}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
