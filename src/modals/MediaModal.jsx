import { useEffect, useState, useCallback, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from '../icons';
import M3Slider from '../components/ui/M3Slider';
import SafeImage from '../components/ui/SafeImage';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';
import { isMusicAssistantMediaEntity, isSonosMediaEntity } from '../utils';
import MusicAssistantLink from '../components/media/MusicAssistantLink';
import { useMusicAssistantChoices } from '../hooks/useMusicAssistantChoices';
import { getMediaPlayerPowerAction } from '../utils/mediaPlayerFeatures';
import { getMediaPlayerStateLabel, getMediaPlayerStateTone } from '../utils/mediaPlayerState';

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

const MEDIA_VIEW_MODE_KEY = 'tunet_media_view_mode_by_modal';

function inferMediaSourceFromId(value) {
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
}

function inferMediaSourceFromObject(obj, value) {
  const provider =
    obj?.provider ||
    obj?.source ||
    obj?.app_name ||
    obj?.media_source ||
    obj?.integration ||
    obj?.library_name ||
    obj?.domain;
  if (provider) return String(provider);
  return inferMediaSourceFromId(value);
}

function inferMediaImageFromObject(obj) {
  return (
    obj?.thumbnail ||
    obj?.thumb ||
    obj?.image ||
    obj?.icon ||
    obj?.media_image ||
    obj?.media_image_url ||
    null
  );
}

function normalizeMediaChoice(item, fallbackType) {
  if (!item) return null;
  if (typeof item === 'string') {
    const value = item.trim();
    if (!value) return null;
    return {
      id: value,
      label: value,
      type: fallbackType,
      source: inferMediaSourceFromId(value),
      image: null,
    };
  }
  if (typeof item !== 'object') return null;

  const id =
    item.media_content_id || item.id || item.uri || item.url || item.entity_id || item.value;
  if (!id || typeof id !== 'string') return null;

  const label = item.title || item.name || item.friendly_name || item.label || id;
  const type = item.media_content_type || item.type || fallbackType;
  const source = inferMediaSourceFromObject(item, id);
  const image = inferMediaImageFromObject(item);

  return { id, label: String(label), type: String(type), source, image };
}

function normalizeMediaChoiceArray(raw, fallbackType) {
  const array = Array.isArray(raw) ? raw : [];
  const deduped = new Map();
  array.forEach((item) => {
    const normalized = normalizeMediaChoice(item, fallbackType);
    if (!normalized) return;
    const key = `${normalized.type}::${normalized.id}`;
    if (!deduped.has(key)) deduped.set(key, normalized);
  });
  return [...deduped.values()];
}

function isAllowedMusicContent(item) {
  if (!item) return false;
  const type = String(item.media_content_type || item.media_class || item.type || '').toLowerCase();
  const id = String(item.media_content_id || item.id || item.uri || '').toLowerCase();
  const title = String(item.title || item.name || '').toLowerCase();
  const isBrowsableContainer =
    item.can_expand === true && ['', 'app', 'directory', 'folder'].includes(type);
  if (BLOCKED_MEDIA_TYPES.has(type) && !isBrowsableContainer) return false;
  if (BLOCKED_ID_PATTERNS.some((pattern) => id.includes(pattern))) return false;
  if (BLOCKED_TITLE_WORDS.some((word) => title.includes(word))) return false;
  return true;
}

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

function mergeMediaChoiceArrays(...arrays) {
  return normalizeMediaChoiceArray(arrays.flat(), 'music');
}

function applyPlayerNameFilter(value, playerNameDisplayFilter) {
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
}

function resolveArtworkUrl(entity, getEntityImageUrl) {
  const raw =
    entity?.attributes?.entity_picture ||
    entity?.attributes?.media_image_url ||
    entity?.attributes?.media_image ||
    null;
  if (!raw) return null;
  if (typeof getEntityImageUrl === 'function') {
    return getEntityImageUrl(raw);
  }
  if (typeof raw === 'string' && (raw.startsWith('http://') || raw.startsWith('https://'))) {
    return raw;
  }
  return null;
}

function sanitizeHttpImageSrc(value) {
  if (typeof value !== 'string') return null;
  const src = value.trim();
  if (!src) return null;
  try {
    const parsed = new URL(src, window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

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
 * @param {Function} props.getEntityImageUrl - Resolve entity/media image URL
 * @param {(entity: any) => boolean} props.isMediaActive - Is media active
 * @param {Function} props.isSonosActive - Is Sonos active
 * @param {Function} props.t - Translation function
 * @param {Function} props.formatDuration - Format seconds to duration
 * @param {Function} props.getServerInfo - Media server metadata
 * @param {any} props.conn - HA websocket connection
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
  const [showAddSonosPicker, setShowAddSonosPicker] = useState(false);
  const [showPlayersSidebar, setShowPlayersSidebar] = useState(true);
  const [viewModeByModal, setViewModeByModal] = useState(() => readJSON(MEDIA_VIEW_MODE_KEY, {}));
  const [failedImageMap, setFailedImageMap] = useState({});
  const wasOpenRef = useRef(false);
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

  const normalizeChoiceArray = useCallback(
    (raw, fallbackType) => normalizeMediaChoiceArray(raw, fallbackType),
    []
  );

  const isMusicContent = useCallback((item) => isAllowedMusicContent(item), []);

  const mergeChoiceArrays = useCallback((...arrays) => mergeMediaChoiceArrays(...arrays), []);

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

  const getViewModeScope = useCallback(() => {
    const modalType = activeMediaModal === 'sonos' ? 'sonos' : 'media';
    const cardScope = activeMediaGroupKey || 'default';
    return `${modalType}::${cardScope}`;
  }, [activeMediaModal, activeMediaGroupKey]);

  const persistViewModeForScope = useCallback(
    (value) => {
      const isSidebarVisible = Boolean(value);
      const scope = getViewModeScope();
      setViewModeByModal((prev) => {
        const next = { ...(prev || {}), [scope]: isSidebarVisible };
        writeJSON(MEDIA_VIEW_MODE_KEY, next);
        return next;
      });
    },
    [getViewModeScope]
  );

  const handleModalClose = useCallback(() => {
    persistViewModeForScope(showPlayersSidebar);
    onClose();
  }, [onClose, persistViewModeForScope, showPlayersSidebar]);

  useEffect(() => {
    if (!show) return;
    const scope = getViewModeScope();
    const saved = viewModeByModal?.[scope];
    setShowPlayersSidebar(typeof saved === 'boolean' ? saved : true);
  }, [show, getViewModeScope, viewModeByModal]);

  useEffect(() => {
    if (show) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current) return;
    persistViewModeForScope(showPlayersSidebar);
    wasOpenRef.current = false;
  }, [show, persistViewModeForScope, showPlayersSidebar]);

  const applyPlayerNameDisplayFilter = useCallback(
    (value) => applyPlayerNameFilter(value, playerNameDisplayFilter),
    [playerNameDisplayFilter]
  );

  const isStrictSonosEntity = isSonosMediaEntity;
  const isSonosUiEntity = isSonosMediaEntity;

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
  const getArtworkUrl = useCallback(
    (entity) => resolveArtworkUrl(entity, getEntityImageUrl),
    [getEntityImageUrl]
  );
  const sanitizeImageSrc = useCallback((value) => sanitizeHttpImageSrc(value), []);
  const currentArtworkUrl = getArtworkUrl(currentMp);
  const safeCurrentArtworkUrl = sanitizeImageSrc(currentArtworkUrl);
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
  const powerAction = getMediaPlayerPowerAction(currentMp);
  const canTogglePower = Boolean(powerAction);
  const isPowerOffAction = powerAction === 'turn_off';

  let mpTitle = mpId ? getA(mpId, 'media_title') : '';
  const mpArtist = mpId ? getA(mpId, 'media_artist') : '';

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
  const groupCardId =
    activeMediaGroupKey && activeMediaGroupKey.includes('::')
      ? activeMediaGroupKey.split('::').slice(1).join('::')
      : null;
  const serverName = serverInfo?.name && serverInfo.name !== 'Media' ? serverInfo.name : null;
  const statusDetail = isCurrentSonos
    ? t('media.sonosLabel')
    : isGenericMedia
      ? (groupCardId && customNames[groupCardId]) || serverName
      : null;

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

  const isMusicAssistantPlayer = !!mpId && isMusicAssistantMediaEntity(currentMp);

  // ── Unified media browse for Sonos and generic players ─────────────
  useEffect(() => {
    const canBrowse =
      show &&
      showChoosePanel &&
      !!mpId &&
      !isMusicAssistantPlayer &&
      conn &&
      typeof conn.sendMessagePromise === 'function';
    if (!canBrowse) return;

    const cached = browseChoicesByPlayer?.[mpId];
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
          .map((node) => ({ node, bucket: resolveBucket(node), sourceHint: root.title || '' }));

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
            ...(prev || {}),
            [mpId]: {
              _version: 3,
              favorites: normalizeChoiceArray(favorites, 'music'),
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
    isMusicAssistantPlayer,
    conn,
    browseChoicesByPlayer,
    isMusicContent,
    normalizeChoiceArray,
  ]);

  const musicAssistantChoices = useMusicAssistantChoices({
    conn,
    playerId: isMusicAssistantPlayer ? mpId : null,
    active: show && showChoosePanel,
    query: chooseTab === 'search' ? chooseQuery : '',
  });

  const browseChoices = browseChoicesByPlayer?.[mpId] || {
    favorites: [],
    playlists: [],
    library: [],
  };

  const currentFavorites = mergeChoiceArrays(
    browseChoices.favorites || [],
    normalizeChoiceArray(mpId ? getA(mpId, 'sonos_favorites', []) : [], 'music')
  );

  const playlistChoices = mergeChoiceArrays(
    browseChoices.playlists || [],
    normalizeChoiceArray(mpId ? getA(mpId, 'sonos_playlists', []) : [], 'playlist')
  );

  const libraryChoices = mergeChoiceArrays(browseChoices.library || []);

  const allSearchChoices = mergeChoiceArrays(currentFavorites, playlistChoices, libraryChoices);

  const loweredQuery = chooseQuery.trim().toLowerCase();
  const filteredSearchChoices = loweredQuery
    ? allSearchChoices.filter(
        (choice) =>
          choice.label.toLowerCase().includes(loweredQuery) ||
          choice.id.toLowerCase().includes(loweredQuery)
      )
    : allSearchChoices;

  const activeChooseChoices =
    (musicAssistantChoices || {
      favorites: currentFavorites,
      playlists: playlistChoices,
      library: libraryChoices,
      search: filteredSearchChoices,
    })[chooseTab] || [];

  const activeChooseEmptyMessage =
    chooseTab === 'favorites'
      ? t('media.choose.emptyFavorites')
      : chooseTab === 'playlists'
        ? t('media.choose.emptyPlaylists')
        : musicAssistantChoices && chooseTab === 'search' && !chooseQuery.trim()
          ? t('media.choose.searchHint')
          : t('media.choose.emptyResults');

  const chooseLoading = musicAssistantChoices ? musicAssistantChoices.loading : browseLoading;
  const chooseError = musicAssistantChoices ? musicAssistantChoices.error : browseError;
  const hasLoadedBrowseChoices = musicAssistantChoices
    ? musicAssistantChoices.loaded
    : browseChoices._version === 3;

  const lastChoice = lastChoiceByPlayer?.[mpId] || null;

  const openChoosePanel = () => {
    setChooseTab('favorites');
    setChooseQuery('');
    setShowChoosePanel(true);
  };

  const playChoice = (choice) => {
    if (!choice?.id) return;
    if (choice.musicAssistant) {
      callService('music_assistant', 'play_media', {
        entity_id: mpId,
        media_id: choice.id,
        media_type: choice.type,
      });
    } else {
      callService('media_player', 'play_media', {
        entity_id: mpId,
        media_content_id: choice.id,
        media_content_type: choice.type || 'music',
      });
    }
    setLastChoiceByPlayer((prev) => ({
      ...(prev || {}),
      [mpId]: {
        id: choice.id,
        label: choice.label,
        type: choice.type || 'music',
        ...(choice.musicAssistant ? { musicAssistant: true } : {}),
      },
    }));
    setShowChoosePanel(false);
  };

  const renderChoiceButton = (choice, keyPrefix = '') => {
    const choiceImage =
      choice?.image && typeof getEntityImageUrl === 'function'
        ? getEntityImageUrl(choice.image)
        : choice?.image || null;
    const safeChoiceImage = sanitizeImageSrc(choiceImage);
    return (
      <button
        key={`${keyPrefix}${choice.type}::${choice.id}`}
        type="button"
        onClick={() => playChoice(choice)}
        className="group min-w-0 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2.5 text-left transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-[var(--accent-color)] hover:bg-[var(--glass-bg-hover)] active:translate-y-0"
      >
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-[var(--glass-bg-hover)]">
          {isImageAvailable(safeChoiceImage) ? (
            <SafeImage
              imageUrl={safeChoiceImage}
              alt=""
              className="h-full w-full object-cover"
              onError={() => markImageFailed(safeChoiceImage)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music className="h-9 w-9 text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent-color)]" />
            </div>
          )}
        </div>
        <p className="mt-2 line-clamp-2 min-h-8 text-[11px] leading-4 font-bold tracking-wide text-[var(--text-primary)] uppercase">
          {choice.label}
        </p>
        <p className="mt-0.5 truncate text-[11px] tracking-wide text-[var(--text-muted)] uppercase">
          {choice.source ||
            (choice.musicAssistant ? t(`media.choose.type.${choice.type}`) : choice.type) ||
            t('media.choose.unknownSource')}
        </p>
      </button>
    );
  };

  const chooseTabOptions = [
    { value: 'favorites', label: t('media.choose.tab.favorites') },
    { value: 'playlists', label: t('media.choose.tab.playlists') },
    { value: 'library', label: t('media.choose.tab.library') },
    { value: 'search', label: t('media.choose.tab.search') },
  ];

  if (!show) return null;

  if (!currentMp) {
    return (
      <AccessibleModalShell
        open={show}
        onClose={handleModalClose}
        titleId="media-modal-title"
        size="m"
      >
        {() => (
          <>
            <ModalHeader
              title={t('addCard.type.media')}
              closeLabel={t('common.close') || 'Close'}
              onClose={handleModalClose}
              icon={<Music />}
            />
            <ModalBody>
              <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
                {t('media.noPlayerFound')}
              </p>
            </ModalBody>
          </>
        )}
      </AccessibleModalShell>
    );
  }

  const playerDisplayName = applyPlayerNameDisplayFilter(
    currentMp.attributes?.friendly_name || mpId
  );
  const playerTitle = activeUser ? `${activeUser} - ${playerDisplayName}` : playerDisplayName;
  const hasArtwork = isImageAvailable(safeCurrentArtworkUrl);
  const powerLabel = isPowerOffAction ? t('shield.turnOff') : t('shield.turnOn');
  const playPauseLabel = isPlaying ? t('media.pause') : t('media.play');
  const muteLabel = isMuted ? t('media.volume.unmute') : t('media.volume.mute');
  const sidebarToggleLabel = showPlayersSidebar
    ? t('common.hide') || 'Hide'
    : t('common.show') || 'Show';
  const PlaceholderIcon = isChannel ? Tv : isSonos ? Speaker : Music;
  const cycleRepeat = () => {
    const modes = ['off', 'one', 'all'];
    const nextMode = modes[(modes.indexOf(repeat) + 1) % modes.length];
    callService('media_player', 'repeat_set', {
      entity_id: mpId,
      repeat: nextMode,
    });
  };
  const toggleMute = () =>
    callService('media_player', 'volume_mute', {
      entity_id: mpId,
      is_volume_muted: !isMuted,
    });
  const seekTo = (e) =>
    callService('media_player', 'media_seek', {
      entity_id: mpId,
      seek_position: parseFloat(e.target.value),
    });
  const setVolume = (e) =>
    callService('media_player', 'volume_set', {
      entity_id: mpId,
      volume_level: parseFloat(e.target.value) / 100,
    });

  const volumeRow = (
    <div className="flex items-center gap-2 border-t border-[var(--glass-border)] px-1 pt-3">
      <button
        onClick={() => changeVolumeByStep(-VOLUME_STEP)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
        aria-label={t('media.volume.down')}
        title={t('media.volume.down')}
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        onClick={toggleMute}
        aria-label={muteLabel}
        title={muteLabel}
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
          onChange={setVolume}
          colorClass="bg-[var(--text-primary)]"
        />
      </div>
      <button
        onClick={() => changeVolumeByStep(VOLUME_STEP)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
        aria-label={t('media.volume.up')}
        title={t('media.volume.up')}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <AccessibleModalShell
      open={show}
      onClose={handleModalClose}
      titleId="media-modal-title"
      size={showPlayersSidebar ? 'xl' : 'l'}
    >
      {() => (
        <>
          <ModalHeader
            title={playerTitle}
            closeLabel={t('common.close') || 'Close'}
            onClose={handleModalClose}
            hideClose={showChoosePanel}
            icon={isChannel ? <Tv /> : isCurrentSonos ? <Speaker /> : <Music />}
            iconClassName={isPlaying ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : ''}
            status={
              <StatusChip
                tone={getMediaPlayerStateTone(mpState)}
                label={getMediaPlayerStateLabel(mpState, t)}
                detail={statusDetail}
              />
            }
            actions={
              <>
                {canTogglePower && (
                  <Button
                    size="sm"
                    variant={isPowerOffAction ? 'destructive' : 'secondary'}
                    onClick={() => callService('media_player', powerAction, { entity_id: mpId })}
                    aria-label={powerLabel}
                    title={powerLabel}
                    icon={<Power className="h-4 w-4" />}
                  />
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowPlayersSidebar((prev) => !prev)}
                  aria-label={sidebarToggleLabel}
                  title={sidebarToggleLabel}
                  icon={
                    showPlayersSidebar ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )
                  }
                />
              </>
            }
          />

          {showPlayersSidebar ? (
            <ModalBody className="grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={openChoosePanel}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    {t('media.chooseMedia')}
                  </Button>
                  {lastChoice?.id && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => playChoice(lastChoice)}
                      icon={<Music className="h-4 w-4" />}
                    >
                      <span className="max-w-[220px] truncate">
                        {t('media.choose.lastChoice')}: {lastChoice.label}
                      </span>
                    </Button>
                  )}
                  {isMusicAssistantMediaEntity(currentMp) && (
                    <MusicAssistantLink title={t('media.openMusicAssistant')} />
                  )}
                </div>

                {hasArtwork ? (
                  <div className="group relative mx-auto aspect-square max-h-[40vh] w-full overflow-hidden rounded-[var(--modal-surface-radius)] border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                    <SafeImage
                      imageUrl={safeCurrentArtworkUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => markImageFailed(safeCurrentArtworkUrl)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-0 left-0 w-full p-4 md:p-6">
                      <h3 className="mb-1 line-clamp-2 text-lg leading-tight font-bold text-white md:text-3xl">
                        {mpTitle || t('common.unknown')}
                      </h3>
                      <p className="line-clamp-1 text-sm font-medium text-white/80 md:text-xl">
                        {mpSeries}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="popup-surface flex items-center gap-4 rounded-[var(--modal-surface-radius)] p-4 md:p-6">
                    <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-[var(--glass-bg-hover)] md:h-20 md:w-20">
                      <PlaceholderIcon className="h-8 w-8 text-[var(--text-muted)] md:h-10 md:w-10" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-lg leading-tight font-bold text-[var(--text-primary)] md:text-2xl">
                        {mpTitle || t('common.unknown')}
                      </h3>
                      {mpSeries && (
                        <p className="mt-1 line-clamp-1 text-sm font-medium text-[var(--text-secondary)] md:text-base">
                          {mpSeries}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1 text-xs font-bold text-[var(--text-muted)] tabular-nums">
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
                    onChange={seekTo}
                    colorClass="bg-[var(--text-primary)]"
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
                          aria-label={t('media.shuffle')}
                          aria-pressed={!!shuffle}
                          className={`rounded-full p-[clamp(0.25rem,1vw,0.5rem)] transition-colors ${shuffle ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                          <Shuffle className="h-[clamp(0.9rem,2vw,1rem)] w-[clamp(0.9rem,2vw,1rem)]" />
                        </button>

                        <button
                          onClick={() =>
                            callService('media_player', 'media_previous_track', { entity_id: mpId })
                          }
                          aria-label={t('media.previousTrack')}
                          className="rounded-full p-[clamp(0.25rem,1vw,0.5rem)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95"
                        >
                          <SkipBack className="h-[clamp(1.1rem,2.6vw,1.25rem)] w-[clamp(1.1rem,2.6vw,1.25rem)] text-[var(--text-secondary)]" />
                        </button>
                        <button
                          onClick={() =>
                            callService('media_player', 'media_play_pause', { entity_id: mpId })
                          }
                          aria-label={playPauseLabel}
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
                          aria-label={t('media.nextTrack')}
                          className="rounded-full p-[clamp(0.25rem,1vw,0.5rem)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95"
                        >
                          <SkipForward className="h-[clamp(1.1rem,2.6vw,1.25rem)] w-[clamp(1.1rem,2.6vw,1.25rem)] text-[var(--text-secondary)]" />
                        </button>

                        <button
                          onClick={cycleRepeat}
                          aria-label={t('media.repeat')}
                          className={`rounded-full p-[clamp(0.25rem,1vw,0.5rem)] transition-colors ${repeat !== 'off' ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                          {repeat === 'one' ? (
                            <Repeat1 className="h-[clamp(0.9rem,2vw,1rem)] w-[clamp(0.9rem,2vw,1rem)]" />
                          ) : (
                            <Repeat className="h-[clamp(0.9rem,2vw,1rem)] w-[clamp(0.9rem,2vw,1rem)]" />
                          )}
                        </button>
                      </div>
                      {volumeRow}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 pt-2">
                      <div className="flex items-center justify-center gap-[clamp(0.25rem,1.8vw,1.5rem)]">
                        <button
                          onClick={() =>
                            callService('media_player', 'media_previous_track', { entity_id: mpId })
                          }
                          aria-label={t('media.previousTrack')}
                          className="rounded-full p-[clamp(0.45rem,1.4vw,1rem)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95"
                        >
                          <SkipBack className="h-[clamp(1.25rem,3vw,2rem)] w-[clamp(1.25rem,3vw,2rem)] text-[var(--text-secondary)]" />
                        </button>
                        <button
                          onClick={() =>
                            callService('media_player', 'media_play_pause', { entity_id: mpId })
                          }
                          aria-label={playPauseLabel}
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
                          aria-label={t('media.nextTrack')}
                          className="rounded-full p-[clamp(0.45rem,1.4vw,1rem)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95"
                        >
                          <SkipForward className="h-[clamp(1.25rem,3vw,2rem)] w-[clamp(1.25rem,3vw,2rem)] text-[var(--text-secondary)]" />
                        </button>
                      </div>
                      {volumeRow}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-6 border-t border-[var(--glass-border)] pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="modal-section-label">
                    {isSonos || isAllSonos
                      ? t('media.group.sonosPlayers')
                      : t('media.group.selectedPlayers')}
                  </h3>
                  {canGroup && listPlayers.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
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
                    >
                      {listPlayers.every((p) => groupMembers.includes(p.entity_id))
                        ? t('sonos.ungroupAll')
                        : t('sonos.groupAll')}
                    </Button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {listPlayers.length === 0 && (
                    <p className="text-sm text-[var(--text-muted)]">{t('media.noPlayersFound')}</p>
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
                    const pArtworkUrl = getArtworkUrl(p);
                    const safePArtworkUrl = sanitizeImageSrc(pArtworkUrl);

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
                            {isImageAvailable(safePArtworkUrl) ? (
                              <SafeImage
                                imageUrl={safePArtworkUrl}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={() => markImageFailed(safePArtworkUrl)}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                {isSonosUiEntity(p) ? (
                                  <Speaker className="h-5 w-5 text-[var(--text-muted)]" />
                                ) : (
                                  <Music className="h-5 w-5 text-[var(--text-muted)]" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <p
                              className={`truncate text-xs font-bold tracking-[0.08em] uppercase ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                            >
                              {applyPlayerNameDisplayFilter(
                                p.attributes?.friendly_name || p.entity_id
                              )}
                            </p>
                            <p className="mt-0.5 truncate text-xs font-semibold text-[var(--text-muted)] md:text-sm">
                              {pTitle}
                            </p>
                            {pUser && (
                              <p className="truncate text-[11px] text-[var(--text-muted)]">
                                {pUser}
                              </p>
                            )}
                          </div>
                        </button>
                        {p.state === 'playing' && (
                          <div
                            className="ml-1 flex h-7 items-end gap-0.5 px-1"
                            title={t('state.playing')}
                            aria-label={t('state.playing')}
                          >
                            <span
                              className="media-eq-bar h-2.5 w-0.5 rounded-full bg-[var(--accent-color)]"
                              style={{ animationDuration: '1.05s', animationDelay: '0s' }}
                            />
                            <span
                              className="media-eq-bar h-4 w-0.5 rounded-full bg-[var(--accent-color)]"
                              style={{ animationDuration: '0.9s', animationDelay: '0.12s' }}
                            />
                            <span
                              className="media-eq-bar h-3 w-0.5 rounded-full bg-[var(--accent-color)]"
                              style={{ animationDuration: '1.2s', animationDelay: '0.2s' }}
                            />
                            <span
                              className="media-eq-bar h-5 w-0.5 rounded-full bg-[var(--accent-color)]"
                              style={{ animationDuration: '0.95s', animationDelay: '0.32s' }}
                            />
                          </div>
                        )}
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
                            className={`rounded-full p-2.5 transition-all ${isMember ? 'border border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                            title={
                              isMember ? t('tooltip.removeFromGroup') : t('tooltip.addToGroup')
                            }
                            aria-label={
                              isMember ? t('tooltip.removeFromGroup') : t('tooltip.addToGroup')
                            }
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
                  <div className="space-y-2 border-t border-[var(--glass-border)] pt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowAddSonosPicker((prev) => !prev)}
                      aria-expanded={showAddSonosPicker}
                      icon={<Plus className="h-4 w-4" />}
                    >
                      {t('media.addSonosPlayer')}
                    </Button>
                    {showAddSonosPicker && (
                      <div className="popup-surface space-y-2 rounded-2xl border border-[var(--glass-border)] p-3">
                        {extraSelectedPlayerIds.length > 0 && (
                          <div className="space-y-2 border-b border-[var(--glass-border)] pb-2">
                            <p className="modal-section-label">
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
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setExtraSelectedPlayerIds((prev) =>
                                        prev.filter((id) => id !== player.entity_id)
                                      )
                                    }
                                  >
                                    {t('media.clearSelection')}
                                  </Button>
                                </div>
                              ))}
                          </div>
                        )}
                        {availableSonosToAdd.length === 0 && (
                          <p className="text-xs text-[var(--text-muted)]">
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
            </ModalBody>
          ) : (
            <ModalBody>
              <div className="relative flex min-h-[min(68dvh,40rem)] flex-col justify-end overflow-hidden rounded-[var(--modal-surface-radius)] bg-black pt-10 pb-4 sm:pb-6 md:pb-10">
                {/* Background Artwork */}
                <div className="absolute inset-0 z-0">
                  {hasArtwork ? (
                    <>
                      <SafeImage
                        imageUrl={safeCurrentArtworkUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => markImageFailed(safeCurrentArtworkUrl)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
                    </>
                  ) : (
                    <div className="flex h-full w-full items-start justify-center bg-gray-900 pt-[8%]">
                      <PlaceholderIcon className="h-16 w-16 text-white/20 md:h-24 md:w-24" />
                    </div>
                  )}
                </div>

                {/* Main Content Overlay - Bottom Aligned Controls */}
                <div
                  data-testid="media-immersive-content"
                  className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-4 sm:gap-4 sm:px-6 md:gap-6 md:px-12"
                >
                  <div className="w-full text-center">
                    <h3 className="mb-1 line-clamp-2 text-xl leading-tight font-bold text-white drop-shadow-lg sm:mb-2 sm:text-2xl md:text-4xl">
                      {mpTitle || t('common.unknown')}
                    </h3>
                    <p className="line-clamp-1 text-sm font-medium text-white/80 drop-shadow-md sm:text-base md:text-xl">
                      {mpSeries || mpArtist}
                    </p>
                  </div>

                  <div className="flex w-full items-center gap-2 sm:gap-3 md:gap-4">
                    <span className="w-10 text-right text-[11px] font-medium text-white/80 tabular-nums drop-shadow-md sm:w-12 sm:text-xs">
                      {formatDuration(effectivePosition)}
                    </span>
                    <div className="flex-1">
                      <M3Slider
                        variant="thin"
                        min={0}
                        max={duration || 100}
                        step={1}
                        value={effectivePosition || 0}
                        disabled={!duration}
                        onChange={seekTo}
                        colorClass="bg-white"
                      />
                    </div>
                    <span className="w-10 text-[11px] font-medium text-white/80 tabular-nums drop-shadow-md sm:w-12 sm:text-xs">
                      {formatDuration(duration)}
                    </span>
                  </div>

                  <div
                    data-testid="media-immersive-controls"
                    className="flex w-full flex-col items-center justify-between gap-3 md:flex-row md:gap-8"
                  >
                    <div
                      data-testid="media-immersive-volume"
                      className="flex w-full max-w-sm items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-2 backdrop-blur-md md:w-auto md:max-w-none"
                    >
                      <button
                        onClick={toggleMute}
                        aria-label={muteLabel}
                        title={muteLabel}
                        className="text-white/80 transition-colors hover:text-white"
                      >
                        {isMuted ? (
                          <VolumeX className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1 md:w-48 md:flex-none lg:w-56">
                        <M3Slider
                          variant="volume"
                          min={0}
                          max={100}
                          step={1}
                          value={volume * 100}
                          onChange={setVolume}
                          colorClass="bg-white"
                        />
                      </div>
                    </div>

                    <div
                      data-testid="media-immersive-playback"
                      className="flex items-center justify-center gap-3 sm:gap-4 md:gap-8"
                    >
                      <button
                        onClick={() =>
                          callService('media_player', 'shuffle_set', {
                            entity_id: mpId,
                            shuffle: !shuffle,
                          })
                        }
                        aria-label={t('media.shuffle')}
                        aria-pressed={!!shuffle}
                        className={`transition-colors hover:text-white ${shuffle ? 'text-[var(--accent-color)]' : 'text-white/60'}`}
                      >
                        <Shuffle className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>

                      <button
                        onClick={() =>
                          callService('media_player', 'media_previous_track', { entity_id: mpId })
                        }
                        aria-label={t('media.previousTrack')}
                        className="text-white transition-transform hover:text-white/80 active:scale-90"
                      >
                        <SkipBack
                          className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
                          fill="currentColor"
                        />
                      </button>

                      <button
                        onClick={() =>
                          callService('media_player', 'media_play_pause', { entity_id: mpId })
                        }
                        aria-label={playPauseLabel}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-xl transition-all hover:scale-105 active:scale-95 sm:h-16 sm:w-16 md:h-20 md:w-20"
                      >
                        {isPlaying ? (
                          <Pause className="h-6 w-6 md:h-8 md:w-8" fill="currentColor" />
                        ) : (
                          <Play className="ml-1 h-6 w-6 md:h-8 md:w-8" fill="currentColor" />
                        )}
                      </button>

                      <button
                        onClick={() =>
                          callService('media_player', 'media_next_track', { entity_id: mpId })
                        }
                        aria-label={t('media.nextTrack')}
                        className="text-white transition-transform hover:text-white/80 active:scale-90"
                      >
                        <SkipForward
                          className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
                          fill="currentColor"
                        />
                      </button>

                      <button
                        onClick={cycleRepeat}
                        aria-label={t('media.repeat')}
                        className={`transition-colors hover:text-white ${repeat !== 'off' ? 'text-[var(--accent-color)]' : 'text-white/60'}`}
                      >
                        {repeat === 'one' ? (
                          <Repeat1 className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Repeat className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </button>
                    </div>

                    <div className="hidden w-[140px] md:block" />
                  </div>
                </div>
              </div>
            </ModalBody>
          )}

          {showChoosePanel && (
            <div
              aria-hidden="true"
              className="absolute inset-0 z-20 bg-black/30"
              onClick={() => setShowChoosePanel(false)}
            />
          )}

          <aside
            data-testid="media-chooser"
            aria-hidden={!showChoosePanel}
            inert={!showChoosePanel}
            className={`absolute top-0 right-0 z-30 h-full w-full transform overflow-hidden border-l border-[var(--glass-border)] bg-[var(--modal-bg)] backdrop-blur-2xl transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none md:w-[420px] ${showChoosePanel ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="flex h-full min-h-0 flex-col">
              <header className="flex-shrink-0 border-b border-[var(--glass-border)] px-4 pt-4 pb-3 md:px-5 md:pt-5 md:pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 pt-0.5">
                    <h4 className="text-sm font-bold tracking-[0.12em] text-[var(--text-primary)] uppercase">
                      {t('media.chooseMedia')}
                    </h4>
                    <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                      {t('media.chooseMediaHint')}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="media-chooser-close"
                    onClick={() => setShowChoosePanel(false)}
                    className="modal-close modal-close-dark flex-shrink-0"
                    aria-label={t('common.close') || 'Close'}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <Segmented
                  block
                  className="mt-4"
                  ariaLabel={t('media.chooseMedia')}
                  value={chooseTab}
                  onChange={setChooseTab}
                  options={chooseTabOptions}
                />

                {chooseTab === 'search' && (
                  <input
                    type="search"
                    value={chooseQuery}
                    onChange={(event) => setChooseQuery(event.target.value)}
                    placeholder={
                      musicAssistantChoices ? t('media.choose.searchHint') : t('addCard.search')
                    }
                    className="mt-3 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
                  />
                )}
              </header>

              <div
                data-testid="media-chooser-results"
                aria-busy={chooseLoading}
                className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-5 md:px-5"
              >
                <div className="flex h-9 items-center" aria-live="polite">
                  {chooseLoading ? (
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      {t('media.choose.loading')}
                    </span>
                  ) : chooseError ? (
                    <span className="text-[11px] font-medium text-[var(--status-warning-fg)]">
                      {t('media.choose.loadError')}
                    </span>
                  ) : null}
                </div>

                {chooseLoading && !hasLoadedBrowseChoices ? (
                  <div data-testid="media-chooser-loading" className="grid grid-cols-2 gap-3">
                    {[0, 1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="animate-pulse rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2.5"
                      >
                        <div className="aspect-square rounded-xl bg-[var(--glass-bg-hover)]" />
                        <div className="mt-2 h-3 w-4/5 rounded-full bg-[var(--glass-bg-hover)]" />
                        <div className="mt-2 h-2 w-2/5 rounded-full bg-[var(--glass-bg-hover)]" />
                      </div>
                    ))}
                  </div>
                ) : activeChooseChoices.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {activeChooseChoices.map((choice) =>
                      renderChoiceButton(choice, `${chooseTab}::`)
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--glass-border)] px-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-muted)]">
                      {chooseTab === 'favorites' ? (
                        <Heart className="h-5 w-5" />
                      ) : (
                        <Music className="h-5 w-5" />
                      )}
                    </div>
                    <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
                      {activeChooseEmptyMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </AccessibleModalShell>
  );
}
