import { useMemo, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Bot,
  MapPin,
  Battery,
  Play,
  Pause,
  Home,
  Fan,
  Droplets,
  Sparkles,
  Clock,
  Maximize2,
  Activity,
  Calendar,
  RefreshCw,
  RotateCcw,
  Wrench,
  Minimize2,
  Plus,
  Minus,
  getIconComponent,
  Sofa,
  Utensils,
  Bed,
  Bath,
  DoorOpen,
  Laptop,
  Warehouse,
} from '../icons';
import ModernDropdown from '../components/ui/ModernDropdown';
import { getRelatedEntityIds } from '../services/haClient';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';

const getRoomIcon = (roomName) => {
  const name = String(roomName || '').toLowerCase();
  if (
    name.includes('stue') ||
    name.includes('living') ||
    name.includes('salong') ||
    name.includes('sofa')
  )
    return Sofa;
  if (name.includes('kjøkken') || name.includes('kitchen') || name.includes('kjøk'))
    return Utensils;
  if (
    name.includes('bad') ||
    name.includes('bath') ||
    name.includes('wc') ||
    name.includes('toalett') ||
    name.includes('dusj')
  )
    return Bath;
  if (name.includes('sove') || name.includes('bedroom') || name.includes('sov')) return Bed;
  if (
    name.includes('gang') ||
    name.includes('hallway') ||
    name.includes('entre') ||
    name.includes('vindfang') ||
    name.includes('korridor')
  )
    return DoorOpen;
  if (name.includes('vaske') || name.includes('laundry')) return Droplets;
  if (name.includes('kontor') || name.includes('office') || name.includes('arbeid')) return Laptop;
  if (
    name.includes('bod') ||
    name.includes('depot') ||
    name.includes('kott') ||
    name.includes('storage')
  )
    return Warehouse;
  if (name.includes('spise') || name.includes('dining')) return Utensils;
  return MapPin; // default fallback
};

const getDisplayName = (entity, fallback) => entity?.attributes?.friendly_name || fallback;

const isValidStateValue = (value) =>
  value != null && value !== '' && value !== 'unavailable' && value !== 'unknown';

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Format a timestamp string to a readable relative or absolute string.
 */
function formatLastCleaned(timestamp, t) {
  if (!timestamp) return '--';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return String(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('vacuum.statsJustNow') || 'Just now';
    if (diffMins < 60) return `${diffMins} ${t('vacuum.statsMinutesAgo') || 'min ago'}`;
    if (diffHours < 24) return `${diffHours} ${t('vacuum.statsHoursAgo') || 'h ago'}`;
    if (diffDays < 7) return `${diffDays} ${t('vacuum.statsDaysAgo') || 'd ago'}`;
    return date.toLocaleDateString();
  } catch {
    return String(timestamp);
  }
}

function formatRawValueWithUnit(value, unit) {
  if (value == null || value === '' || value === 'unknown' || value === 'unavailable') return '--';
  const numericValue = Number(value);
  const displayValue = Number.isFinite(numericValue)
    ? Number.isInteger(numericValue)
      ? String(numericValue)
      : String(Number(numericValue.toFixed(1)))
    : String(value);
  if (unit) return `${displayValue} ${unit}`;
  return displayValue;
}

function getVacuumStateLabel(state, battery, t) {
  const normalized = String(state || '').toLowerCase();
  if (!normalized) return t('vacuum.unknown');

  if (normalized === 'cleaning' || normalized === 'vacuuming') return t('vacuum.cleaning');
  if (
    normalized === 'returning' ||
    normalized === 'going_home' ||
    normalized === 'return_to_base'
  ) {
    return t('vacuum.returning') || t('room.vacuumStatus.goingHome') || normalized;
  }
  if ((normalized === 'charging' || normalized === 'docked') && battery === 100) {
    return t('vacuum.docked');
  }
  if (normalized === 'charging' || normalized === 'docked') return t('vacuum.charging');
  if (normalized === 'idle' || normalized === 'ready') return t('vacuum.idle');
  if (normalized === 'paused' || normalized === 'pause') return t('vacuum.pause');
  if (normalized === 'error') return t('room.vacuumStatus.error') || 'Error';
  if (normalized === 'stopped') return t('room.vacuumStatus.stopped') || 'Stopped';
  return state;
}

function formatDiagnosticState(state, type, t) {
  const normalized = String(state || '').toLowerCase();
  if (normalized === 'unavailable' || normalized === 'unknown') return '--';

  if (Number.isFinite(Number(state))) {
    return `${state}%`;
  }

  if (type === 'binary_ok') {
    if (
      normalized === 'on' ||
      normalized === 'true' ||
      normalized === 'yes' ||
      normalized === 'home'
    ) {
      return t('vacuum.diagInstalled') || 'Installed';
    }
    return t('vacuum.diagRemoved') || 'Removed';
  }

  if (type === 'binary_inverse') {
    if (normalized === 'on' || normalized === 'true' || normalized === 'yes') {
      return t('vacuum.diagActive') || 'Active';
    }
    return t('vacuum.diagInactive') || 'Inactive';
  }

  if (type === 'water_clean') {
    if (normalized === 'on' || normalized === 'true') return t('vacuum.diagEmpty') || 'Empty';
    if (normalized === 'off' || normalized === 'false') return t('vacuum.diagFull') || 'Full';
    return state;
  }

  if (type === 'water_dirty') {
    if (normalized === 'on' || normalized === 'true') return t('vacuum.diagFull') || 'Full';
    if (normalized === 'off' || normalized === 'false') return t('vacuum.diagEmpty') || 'Empty';
    return state;
  }

  if (normalized === 'on') return t('vacuum.diagOn') || 'On';
  if (normalized === 'off') return t('vacuum.diagOff') || 'Off';
  return state;
}

function getDiagnosticColor(state, type) {
  const normalized = String(state || '').toLowerCase();
  if (normalized === 'unavailable' || normalized === 'unknown') return 'var(--text-muted)';

  if (type === 'binary_ok') {
    return normalized === 'on' || normalized === 'true' || normalized === 'yes'
      ? 'hsl(142, 70%, 45%)'
      : 'var(--text-muted)';
  }
  if (type === 'binary_inverse') {
    return normalized === 'on' || normalized === 'true' || normalized === 'yes'
      ? 'hsl(142, 70%, 45%)'
      : 'var(--text-muted)';
  }
  if (type === 'water_clean') {
    return normalized === 'on' || normalized === 'true'
      ? 'hsl(346, 84%, 61%)'
      : 'hsl(142, 70%, 45%)';
  }
  if (type === 'water_dirty') {
    return normalized === 'on' || normalized === 'true'
      ? 'hsl(38, 92%, 50%)'
      : 'hsl(142, 70%, 45%)';
  }
  if (normalized === 'on' || normalized === 'cleaning' || normalized === 'drying') {
    return 'hsl(142, 70%, 45%)';
  }
  return 'var(--text-muted)';
}

/**
 * VacuumModal - Modal for vacuum robot information and controls
 */
export default function VacuumModal({
  show,
  onClose,
  entities,
  callService,
  getA,
  t,
  vacuumId,
  vacuumSettings,
  conn,
  getEntityImageUrl,
}) {
  const modalTitleId = `vacuum-modal-title-${(vacuumId || 'vacuum').replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  // Current room: try attribute first, then find sensor.*current_room
  const roomFromAttr =
    show && vacuumId ? getA(vacuumId, 'current_room') || getA(vacuumId, 'room') : null;

  // Build helper token arrays to uniquely identify related entities
  const vacuumName = vacuumId ? vacuumId.split('.')[1] || '' : '';
  const vacuumFriendlyName =
    (vacuumId && entities?.[vacuumId]?.attributes?.friendly_name?.toLowerCase()) || '';
  const vacuumNameTokens = useMemo(() => {
    if (!vacuumName) return [];
    return vacuumName
      .toLowerCase()
      .split(/[_\-\s]+/)
      .filter((token) => token.length > 2)
      .filter((token) => !['vacuum', 'robot', 'cleaner'].includes(token));
  }, [vacuumName]);

  const settings = useMemo(() => vacuumSettings || {}, [vacuumSettings]);

  // --- States for HA registries ---
  const [registryRelatedSensorIds, setRegistryRelatedSensorIds] = useState([]);
  const [registryRelatedSelectIds, setRegistryRelatedSelectIds] = useState([]);
  const [registryRelatedButtonIds, setRegistryRelatedButtonIds] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [mappedAreas, setMappedAreas] = useState([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState([]);

  // --- States for UI Tabs and Live Map ---
  const [activeTab, setActiveTab] = useState('controls');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMapZoomed, setIsMapZoomed] = useState(false);
  const [resetConfirmKey, setResetConfirmKey] = useState(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isAreasLoading, setIsAreasLoading] = useState(true);
  const [showMapToggle, setShowMapToggle] = useState(() => {
    try {
      const saved = localStorage.getItem(`tunet_vacuum_show_map_${vacuumId}`);
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  // --- States for Map Zoom and Pan ---
  const [mapScale, setMapScale] = useState(1.1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [zoomScale, setZoomScale] = useState(1.0);
  const [zoomPan, setZoomPan] = useState({ x: 0, y: 0 });
  const [isZoomPanning, setIsZoomPanning] = useState(false);
  const [zoomPanStart, setZoomPanStart] = useState({ x: 0, y: 0 });
  const [zoomPanOffset, setZoomPanOffset] = useState({ x: 0, y: 0 });

  // Reset pan state (isPanning) when modal closes
  useEffect(() => {
    if (!show) {
      setIsPanning(false);
    }
  }, [show]);

  // Persist zoom & pan changes to localStorage with a debounce to avoid excessive writes
  useEffect(() => {
    if (!show || !vacuumId) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`tunet_vacuum_map_scale_${vacuumId}`, String(mapScale));
        localStorage.setItem(`tunet_vacuum_map_pan_${vacuumId}`, JSON.stringify(mapPan));
      } catch {}
    }, 200);
    return () => clearTimeout(timer);
  }, [mapScale, mapPan, vacuumId, show]);

  // Reset fullscreen zoom & pan when fullscreen overlay closes
  useEffect(() => {
    if (!isMapZoomed) {
      setZoomScale(1.0);
      setZoomPan({ x: 0, y: 0 });
      setIsZoomPanning(false);
    }
  }, [isMapZoomed]);

  // Inline Map Helpers
  const zoomInMap = () => setMapScale((prev) => Math.min(prev + 0.25, 4.0));
  const zoomOutMap = () => {
    setMapScale((prev) => {
      const next = Math.max(prev - 0.25, 1.0);
      if (next <= 1.05) setMapPan({ x: 0, y: 0 });
      return next;
    });
  };
  const resetMapZoom = () => {
    setMapScale(1.1);
    setMapPan({ x: 0, y: 0 });
  };

  const handleMapMouseDown = (e) => {
    if (mapScale <= 1.05) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setPanOffset({ x: mapPan.x, y: mapPan.y });
  };

  const handleMapMouseMove = (e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setMapPan({ x: panOffset.x + dx, y: panOffset.y + dy });
  };

  const handleMapMouseUpOrLeave = () => setIsPanning(false);

  const handleMapTouchStart = (e) => {
    if (mapScale <= 1.05) return;
    if (e.touches.length !== 1) return;
    setIsPanning(true);
    setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setPanOffset({ x: mapPan.x, y: mapPan.y });
  };

  const handleMapTouchMove = (e) => {
    if (!isPanning) return;
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - panStart.x;
    const dy = e.touches[0].clientY - panStart.y;
    setMapPan({ x: panOffset.x + dx, y: panOffset.y + dy });
  };

  const handleMapTouchEnd = () => setIsPanning(false);

  // Fullscreen Zoom Map Helpers
  const zoomInFullscreen = () => setZoomScale((prev) => Math.min(prev + 0.25, 4.0));
  const zoomOutFullscreen = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 0.25, 1.0);
      if (next <= 1.05) setZoomPan({ x: 0, y: 0 });
      return next;
    });
  };
  const resetFullscreenZoom = () => {
    setZoomScale(1.0);
    setZoomPan({ x: 0, y: 0 });
  };

  const handleZoomMouseDown = (e) => {
    if (zoomScale <= 1.05) return;
    setIsZoomPanning(true);
    setZoomPanStart({ x: e.clientX, y: e.clientY });
    setZoomPanOffset({ x: zoomPan.x, y: zoomPan.y });
  };

  const handleZoomMouseMove = (e) => {
    if (!isZoomPanning) return;
    const dx = e.clientX - zoomPanStart.x;
    const dy = e.clientY - zoomPanStart.y;
    setZoomPan({ x: zoomPanOffset.x + dx, y: zoomPanOffset.y + dy });
  };

  const handleZoomMouseUpOrLeave = () => setIsZoomPanning(false);

  const handleZoomTouchStart = (e) => {
    if (zoomScale <= 1.05) return;
    if (e.touches.length !== 1) return;
    setIsZoomPanning(true);
    setZoomPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setZoomPanOffset({ x: zoomPan.x, y: zoomPan.y });
  };

  const handleZoomTouchMove = (e) => {
    if (!isZoomPanning) return;
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - zoomPanStart.x;
    const dy = e.touches[0].clientY - zoomPanStart.y;
    setZoomPan({ x: zoomPanOffset.x + dx, y: zoomPanOffset.y + dy });
  };

  const handleZoomTouchEnd = () => setIsZoomPanning(false);

  const handleToggleMap = () => {
    const nextVal = !showMapToggle;
    setShowMapToggle(nextVal);
    try {
      localStorage.setItem(`tunet_vacuum_show_map_${vacuumId}`, String(nextVal));
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-cancel consumable reset confirmation after 3 seconds
  useEffect(() => {
    if (!resetConfirmKey) return;
    const timer = setTimeout(() => {
      setResetConfirmKey(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [resetConfirmKey]);

  // Load related sensors
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!show || !vacuumId || !conn) {
        if (!cancelled) setRegistryRelatedSensorIds([]);
        return;
      }
      try {
        const relatedIds = await getRelatedEntityIds(conn, vacuumId, { domains: ['sensor'] });
        if (!cancelled) setRegistryRelatedSensorIds(Array.isArray(relatedIds) ? relatedIds : []);
      } catch {
        if (!cancelled) setRegistryRelatedSensorIds([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [show, vacuumId, conn]);

  // Load related select dropdown controls
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!show || !vacuumId || !conn) {
        if (!cancelled) setRegistryRelatedSelectIds([]);
        return;
      }
      try {
        const relatedIds = await getRelatedEntityIds(conn, vacuumId, {
          domains: ['select', 'input_select'],
        });
        if (!cancelled) setRegistryRelatedSelectIds(Array.isArray(relatedIds) ? relatedIds : []);
      } catch {
        if (!cancelled) setRegistryRelatedSelectIds([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [show, vacuumId, conn]);

  // Load related button entities for consumable resets
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!show || !vacuumId || !conn) {
        if (!cancelled) setRegistryRelatedButtonIds([]);
        return;
      }
      try {
        const relatedIds = await getRelatedEntityIds(conn, vacuumId, { domains: ['button'] });
        if (!cancelled) setRegistryRelatedButtonIds(Array.isArray(relatedIds) ? relatedIds : []);
      } catch {
        if (!cancelled) setRegistryRelatedButtonIds([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [show, vacuumId, conn]);

  // Load native vacuum area mappings and area details
  useEffect(() => {
    let cancelled = false;
    const fetchNativeMappedAreas = async () => {
      if (!show || !vacuumId || !conn) {
        if (!cancelled) {
          setMappedAreas([]);
          setIsAreasLoading(true);
        }
        return;
      }
      if (!cancelled) setIsAreasLoading(true);
      try {
        const [entityRegistry, areaRegistry] = await Promise.all([
          conn.sendMessagePromise({ type: 'config/entity_registry/list' }),
          conn.sendMessagePromise({ type: 'config/area_registry/list' }),
        ]);

        if (cancelled) return;

        const entityReg = Array.isArray(entityRegistry)
          ? entityRegistry
          : entityRegistry?.result || [];
        const areaReg = Array.isArray(areaRegistry) ? areaRegistry : areaRegistry?.result || [];

        const vacuumEntry = entityReg.find((entry) => entry?.entity_id === vacuumId);
        const areaMapping = vacuumEntry?.options?.vacuum?.area_mapping || {};
        const mappedAreaIds = Object.keys(areaMapping);

        if (mappedAreaIds.length > 0) {
          const filteredAreas = areaReg.filter((area) => mappedAreaIds.includes(area.area_id));
          if (!cancelled) setMappedAreas(filteredAreas);
        } else {
          if (!cancelled) setMappedAreas([]);
        }
      } catch (err) {
        console.error('Error fetching native vacuum areas:', err);
        if (!cancelled) setMappedAreas([]);
      } finally {
        if (!cancelled) setIsAreasLoading(false);
      }
    };
    void fetchNativeMappedAreas();
    return () => {
      cancelled = true;
    };
  }, [show, vacuumId, conn]);

  // 1. Resolve roomSelectEntityId
  const roomSelectEntityId = useMemo(() => {
    if (settings?.roomSelectEntityId) return settings.roomSelectEntityId;
    if (!entities) return null;

    // First search within registry-related select/input_select entities
    if (Array.isArray(registryRelatedSelectIds) && registryRelatedSelectIds.length > 0) {
      const keywordRegex = /(room|zone|segment|clean_room|area)/i;
      const match = registryRelatedSelectIds.find((entityId) => {
        const lowerId = String(entityId).toLowerCase();
        const friendly = String(
          entities?.[entityId]?.attributes?.friendly_name || ''
        ).toLowerCase();
        return keywordRegex.test(lowerId) || keywordRegex.test(friendly);
      });
      if (match) return match;
    }

    // Fall back to searching all select / input_select entities in Home Assistant matching vacuum name + keyword
    const vacuumNameLower = vacuumName.toLowerCase();
    const keywordRegex = /(room|zone|segment|clean_room|area)/i;
    for (const [eid, ent] of Object.entries(entities)) {
      if (!eid.startsWith('select.') && !eid.startsWith('input_select.')) continue;
      const lowerEid = eid.toLowerCase();
      const friendly = (ent?.attributes?.friendly_name || '').toLowerCase();
      const isRelated =
        vacuumNameTokens.length === 0 ||
        vacuumNameTokens.some((token) => lowerEid.includes(token)) ||
        lowerEid.includes(vacuumNameLower);

      if (isRelated && (keywordRegex.test(lowerEid) || keywordRegex.test(friendly))) {
        return eid;
      }
    }

    return null;
  }, [
    settings?.roomSelectEntityId,
    entities,
    registryRelatedSelectIds,
    vacuumName,
    vacuumNameTokens,
  ]);

  const roomSelectOptions = useMemo(() => {
    if (!roomSelectEntityId || !entities?.[roomSelectEntityId]) return [];
    return Array.isArray(entities[roomSelectEntityId]?.attributes?.options)
      ? entities[roomSelectEntityId].attributes.options
      : [];
  }, [roomSelectEntityId, entities]);

  // Sync selectedRoom with entity state when modal opens
  useEffect(() => {
    if (show && roomSelectEntityId && entities?.[roomSelectEntityId]) {
      const currentState = entities[roomSelectEntityId].state;
      if (roomSelectOptions.includes(currentState)) {
        setSelectedRoom(currentState);
      } else {
        setSelectedRoom(roomSelectOptions[0] || null);
      }
    }
  }, [show, roomSelectEntityId, entities, roomSelectOptions]);

  const getMappedSensorWithUnit = useCallback(
    (settingKey) => {
      const sensorId = settings?.[settingKey];
      if (!sensorId) return null;
      const entity = entities?.[sensorId];
      const value = entity?.state;
      if (!isValidStateValue(value)) return null;
      return {
        value,
        unit: entity?.attributes?.unit_of_measurement || null,
        sensorId,
      };
    },
    [settings, entities]
  );

  const getMappedSensorValue = useCallback(
    (settingKey) => getMappedSensorWithUnit(settingKey)?.value ?? null,
    [getMappedSensorWithUnit]
  );

  const relatedSensors = useMemo(() => {
    if (!entities || !vacuumName) return {};
    const found = {};

    if (registryRelatedSensorIds.length > 0) {
      for (const sensorId of registryRelatedSensorIds) {
        if (!sensorId?.startsWith('sensor.')) continue;
        const sensorEntity = entities[sensorId];
        if (sensorEntity) found[sensorId] = sensorEntity;
      }
      return found;
    }

    for (const [eid, ent] of Object.entries(entities)) {
      if (!eid.startsWith('sensor.')) continue;
      const lowerId = eid.toLowerCase();
      const friendly = (ent?.attributes?.friendly_name || '').toLowerCase();
      const matchesVacuumName = lowerId.includes(vacuumName.toLowerCase());
      const matchesFriendlyName = vacuumFriendlyName && friendly.includes(vacuumFriendlyName);
      const matchesToken = vacuumNameTokens.some(
        (token) => lowerId.includes(token) || friendly.includes(token)
      );

      if (!matchesVacuumName && !matchesFriendlyName && !matchesToken) continue;
      found[eid] = ent;
    }
    return found;
  }, [entities, vacuumName, vacuumFriendlyName, vacuumNameTokens, registryRelatedSensorIds]);

  const findSensorValue = (keywords) => {
    const loweredKeywords = keywords.map((kw) => String(kw).toLowerCase());
    for (const [eid, ent] of Object.entries(relatedSensors)) {
      const haystack = `${eid.toLowerCase()} ${(ent?.attributes?.friendly_name || '').toLowerCase()}`;
      if (loweredKeywords.every((kw) => haystack.includes(kw))) {
        const value = ent?.state;
        if (isValidStateValue(value)) return value;
      }
    }
    return null;
  };

  /** Find a sensor and return { value, unit } */
  const findSensorWithUnit = (keywords) => {
    const loweredKeywords = keywords.map((kw) => String(kw).toLowerCase());
    for (const [eid, ent] of Object.entries(relatedSensors)) {
      const haystack = `${eid.toLowerCase()} ${(ent?.attributes?.friendly_name || '').toLowerCase()}`;
      if (loweredKeywords.every((kw) => haystack.includes(kw))) {
        const value = ent?.state;
        if (isValidStateValue(value)) {
          return { value, unit: ent?.attributes?.unit_of_measurement };
        }
      }
    }
    return null;
  };

  const roomSensorValue = useMemo(() => {
    if (roomFromAttr) return null;
    const mappedRoom = getMappedSensorValue('currentRoomSensorId');
    if (mappedRoom) return mappedRoom;
    if (!entities || !vacuumId) return null;
    for (const [eid, ent] of Object.entries(entities)) {
      if (
        eid.startsWith('sensor.') &&
        eid.includes('current_room') &&
        (eid.includes(vacuumName) || eid.includes('roborock') || eid.includes('vacuum'))
      ) {
        return isValidStateValue(ent?.state) ? ent.state : null;
      }
    }
    return null;
  }, [entities, vacuumId, roomFromAttr, vacuumName, getMappedSensorValue]);

  const room = roomFromAttr || roomSensorValue;
  const roomScripts = useMemo(
    () =>
      Array.isArray(settings.roomScripts)
        ? settings.roomScripts.filter((script) => script.entityId)
        : [],
    [settings.roomScripts]
  );

  // --- Dynamic consumables auto-detection ---
  const findConsumableSensor = useCallback(
    (keywords) => {
      const loweredKeywords = keywords.map((kw) => kw.toLowerCase());
      if (registryRelatedSensorIds.length > 0) {
        const found = registryRelatedSensorIds.find((eid) => {
          const lowerEid = eid.toLowerCase();
          const friendly = (entities?.[eid]?.attributes?.friendly_name || '').toLowerCase();
          const haystack = `${lowerEid} ${friendly}`;
          return loweredKeywords.every((kw) => haystack.includes(kw));
        });
        if (found) return found;
      }
      return Object.keys(entities || {}).find((eid) => {
        if (!eid.startsWith('sensor.')) return false;
        const lowerEid = eid.toLowerCase();
        const isRelated =
          vacuumNameTokens.length === 0 ||
          vacuumNameTokens.some((token) => lowerEid.includes(token)) ||
          lowerEid.includes(vacuumName.toLowerCase());
        if (!isRelated) return false;
        const friendly = (entities[eid]?.attributes?.friendly_name || '').toLowerCase();
        const haystack = `${lowerEid} ${friendly}`;
        return loweredKeywords.every((kw) => haystack.includes(kw));
      });
    },
    [entities, registryRelatedSensorIds, vacuumName, vacuumNameTokens]
  );

  const findConsumableButton = useCallback(
    (keywords) => {
      const loweredKeywords = keywords.map((kw) => kw.toLowerCase());
      if (registryRelatedButtonIds.length > 0) {
        const found = registryRelatedButtonIds.find((eid) => {
          const lowerEid = eid.toLowerCase();
          const friendly = (entities?.[eid]?.attributes?.friendly_name || '').toLowerCase();
          const haystack = `${lowerEid} ${friendly}`;
          return loweredKeywords.every((kw) => haystack.includes(kw));
        });
        if (found) return found;
      }
      return Object.keys(entities || {}).find((eid) => {
        if (!eid.startsWith('button.')) return false;
        const lowerEid = eid.toLowerCase();
        const isRelated =
          vacuumNameTokens.length === 0 ||
          vacuumNameTokens.some((token) => lowerEid.includes(token)) ||
          lowerEid.includes(vacuumName.toLowerCase());
        if (!isRelated) return false;
        const friendly = (entities[eid]?.attributes?.friendly_name || '').toLowerCase();
        const haystack = `${lowerEid} ${friendly}`;
        return loweredKeywords.every((kw) => haystack.includes(kw));
      });
    },
    [entities, registryRelatedButtonIds, vacuumName, vacuumNameTokens]
  );

  const consumables = useMemo(() => {
    if (!show || !vacuumId || !entities) return [];

    const items = [
      {
        key: 'mainBrush',
        label: t('vacuum.mainBrush') || 'Main Brush',
        sensorId: findConsumableSensor(['main', 'brush']),
        buttonId: findConsumableButton(['main', 'brush', 'reset']),
        icon: Wrench,
      },
      {
        key: 'sideBrush',
        label: t('vacuum.sideBrush') || 'Side Brush',
        sensorId: findConsumableSensor(['side', 'brush']),
        buttonId: findConsumableButton(['side', 'brush', 'reset']),
        icon: RotateCcw,
      },
      {
        key: 'filter',
        label: t('vacuum.filter') || 'Filter',
        sensorId: findConsumableSensor(['filter']),
        buttonId: findConsumableButton(['filter', 'reset']),
        icon: Fan,
      },
      {
        key: 'sensors',
        label: t('vacuum.sensors') || 'Sensors',
        sensorId:
          findConsumableSensor(['sensor', 'dirty']) ||
          findConsumableSensor(['sensor', 'cleaning']) ||
          findConsumableSensor(['sensor', 'wear']) ||
          findConsumableSensor(['sensors', 'dirty']),
        buttonId:
          findConsumableButton(['sensor', 'reset']) ||
          findConsumableButton(['sensors', 'reset']) ||
          findConsumableButton(['sensor_dirty', 'reset']),
        icon: Sparkles,
      },
    ];

    return items
      .map((item) => {
        const stateVal = entities[item.sensorId]?.state;
        const pctVal = toFiniteNumber(stateVal);
        const pct = pctVal !== null ? Math.round(pctVal) : null;
        return { ...item, pct };
      })
      .filter((item) => item.pct !== null);
  }, [show, vacuumId, entities, findConsumableSensor, findConsumableButton, t]);

  const findEntityByKeywords = useCallback(
    (keywords, domains = ['sensor', 'binary_sensor', 'switch']) => {
      if (!entities) return null;
      const loweredKeywords = keywords.map((kw) => kw.toLowerCase());
      const registryPool = [
        ...registryRelatedSensorIds,
        ...registryRelatedSelectIds,
        ...registryRelatedButtonIds,
      ];

      if (registryPool.length > 0) {
        for (const eid of registryPool) {
          const domain = eid.split('.')[0];
          if (!domains.includes(domain)) continue;
          const lowerEid = eid.toLowerCase();
          const friendly = (entities[eid]?.attributes?.friendly_name || '').toLowerCase();
          const haystack = `${lowerEid} ${friendly}`;
          if (loweredKeywords.every((kw) => haystack.includes(kw))) {
            return { id: eid, entity: entities[eid] };
          }
        }
      }

      const vacuumNameLower = vacuumName.toLowerCase();
      for (const [eid, ent] of Object.entries(entities)) {
        const domain = eid.split('.')[0];
        if (!domains.includes(domain)) continue;

        const lowerEid = eid.toLowerCase();
        const friendly = (ent?.attributes?.friendly_name || '').toLowerCase();

        const isRelated =
          lowerEid.includes(vacuumNameLower) ||
          (vacuumFriendlyName && friendly.includes(vacuumFriendlyName)) ||
          vacuumNameTokens.some((token) => lowerEid.includes(token) || friendly.includes(token));

        if (!isRelated) continue;

        const haystack = `${lowerEid} ${friendly}`;
        if (loweredKeywords.every((kw) => haystack.includes(kw))) {
          return { id: eid, entity: ent };
        }
      }
      return null;
    },
    [
      entities,
      registryRelatedSensorIds,
      registryRelatedSelectIds,
      registryRelatedButtonIds,
      vacuumName,
      vacuumFriendlyName,
      vacuumNameTokens,
    ]
  );

  const diagnostics = useMemo(() => {
    if (!show || !vacuumId || !entities) return [];

    const items = [];

    // 1. Clean Water Tank
    const cleanWater =
      findEntityByKeywords(['clean', 'water']) ||
      findEntityByKeywords(['water', 'tank']) ||
      findEntityByKeywords(['water', 'box']);
    if (cleanWater) {
      items.push({
        key: 'cleanWater',
        label: t('vacuum.cleanWaterTank') || 'Clean Water Tank',
        state: cleanWater.entity.state,
        unit: cleanWater.entity.attributes?.unit_of_measurement,
        type: 'water_clean',
      });
    }

    // 2. Dirty Water Tank
    const dirtyWater =
      findEntityByKeywords(['dirty', 'water']) || findEntityByKeywords(['waste', 'water']);
    if (dirtyWater) {
      items.push({
        key: 'dirtyWater',
        label: t('vacuum.dirtyWaterTank') || 'Dirty Water Tank',
        state: dirtyWater.entity.state,
        unit: dirtyWater.entity.attributes?.unit_of_measurement,
        type: 'water_dirty',
      });
    }

    // 3. Mop Attached
    const mopAttached =
      findEntityByKeywords(['mop', 'attached']) ||
      findEntityByKeywords(['mop', 'mount']) ||
      findEntityByKeywords(['mop', 'installed']);
    if (mopAttached) {
      items.push({
        key: 'mopAttached',
        label: t('vacuum.mopAttached') || 'Mop Bracket',
        state: mopAttached.entity.state,
        type: 'binary_ok',
      });
    }

    // 4. Dustbin Status
    const dustbin =
      findEntityByKeywords(['dustbin', 'installed']) ||
      findEntityByKeywords(['dustbin', 'attached']) ||
      findEntityByKeywords(['dustbin']);
    if (dustbin) {
      items.push({
        key: 'dustbin',
        label: t('vacuum.dustbin') || 'Dustbin',
        state: dustbin.entity.state,
        type: 'binary_ok',
      });
    }

    // 5. DND (Do Not Disturb)
    const dnd = findEntityByKeywords(['dnd']) || findEntityByKeywords(['do_not_disturb']);
    if (dnd) {
      items.push({
        key: 'dnd',
        label: t('vacuum.dnd') || 'DND Mode',
        state: dnd.entity.state,
        type: 'binary_inverse',
      });
    }

    // 6. Mop Drying
    const drying = findEntityByKeywords(['drying']) || findEntityByKeywords(['mop_drying']);
    if (drying) {
      items.push({
        key: 'drying',
        label: t('vacuum.mopDrying') || 'Mop Drying',
        state: drying.entity.state,
        type: 'status_drying',
      });
    }

    return items;
  }, [show, vacuumId, entities, findEntityByKeywords, t]);

  // Discover all map-related camera and image entities
  const availableMapEntities = useMemo(() => {
    if (!entities) return [];

    // First, find map entities related to this vacuum
    const related = Object.keys(entities).filter((eid) => {
      const domain = eid.split('.')[0];
      if (domain !== 'image' && domain !== 'camera') return false;
      const lowerEid = eid.toLowerCase();
      const friendly = (entities[eid]?.attributes?.friendly_name || '').toLowerCase();

      const isRelated =
        vacuumName &&
        (vacuumNameTokens.some((token) => lowerEid.includes(token) || friendly.includes(token)) ||
          lowerEid.includes(vacuumName.toLowerCase()) ||
          friendly.includes(vacuumName.toLowerCase()) ||
          (vacuumFriendlyName &&
            vacuumFriendlyName
              .split(/[_\-\s]+/)
              .some((token) => token.length > 2 && (lowerEid.includes(token) || friendly.includes(token)))));

      // If it is related to the vacuum, we consider it a map entity since cameras/images on a vacuum are always maps
      return isRelated;
    });

    if (related.length > 0) return related;

    // Fallback: any map/kart entity in HA
    return Object.keys(entities).filter((eid) => {
      const domain = eid.split('.')[0];
      if (domain !== 'image' && domain !== 'camera') return false;
      const lowerEid = eid.toLowerCase();
      const friendly = (entities[eid]?.attributes?.friendly_name || '').toLowerCase();
      return (
        lowerEid.includes('map') ||
        friendly.includes('map') ||
        lowerEid.includes('kart') ||
        friendly.includes('kart')
      );
    });
  }, [entities, vacuumName, vacuumFriendlyName, vacuumNameTokens]);

  // --- Live Map auto-detection ---
  const mapImageEntityId = useMemo(() => {
    if (settings?.mapImageEntityId) return settings.mapImageEntityId;
    if (!entities || !vacuumName) return null;
    return Object.keys(entities).find((eid) => {
      if (!eid.startsWith('image.') && !eid.startsWith('camera.')) return false;
      const lowerEid = eid.toLowerCase();
      const friendly = (entities[eid]?.attributes?.friendly_name || '').toLowerCase();
      
      const isRelated =
        vacuumNameTokens.length === 0 ||
        vacuumNameTokens.some((token) => lowerEid.includes(token) || friendly.includes(token)) ||
        lowerEid.includes(vacuumName.toLowerCase()) ||
        friendly.includes(vacuumName.toLowerCase()) ||
        (vacuumFriendlyName &&
          vacuumFriendlyName
            .split(/[_\-\s]+/)
            .some((token) => token.length > 2 && (lowerEid.includes(token) || friendly.includes(token))));

      return isRelated;
    });
  }, [settings?.mapImageEntityId, entities, vacuumName, vacuumFriendlyName, vacuumNameTokens]);

  // Selected Map Entity Id with persistence
  const [selectedMapEntityId, setSelectedMapEntityId] = useState(() => {
    try {
      const saved = localStorage.getItem(`tunet_vacuum_selected_map_${vacuumId}`);
      if (saved) return saved;
    } catch {}
    return null;
  });

  // Sync selected map entity ID and zoom/pan when vacuum changes or modal opens
  useEffect(() => {
    if (show && vacuumId) {
      try {
        const savedMap = localStorage.getItem(`tunet_vacuum_selected_map_${vacuumId}`);
        setSelectedMapEntityId(savedMap || null);
      } catch {
        setSelectedMapEntityId(null);
      }

      try {
        const savedScale = localStorage.getItem(`tunet_vacuum_map_scale_${vacuumId}`);
        setMapScale(savedScale ? parseFloat(savedScale) : 1.1);

        const savedPan = localStorage.getItem(`tunet_vacuum_map_pan_${vacuumId}`);
        setMapPan(savedPan ? JSON.parse(savedPan) : { x: 0, y: 0 });
      } catch {
        setMapScale(1.1);
        setMapPan({ x: 0, y: 0 });
      }
    }
  }, [show, vacuumId]);

  const activeMapEntityId = useMemo(() => {
    if (selectedMapEntityId && entities?.[selectedMapEntityId]) {
      return selectedMapEntityId;
    }
    return mapImageEntityId || availableMapEntities[0] || null;
  }, [selectedMapEntityId, mapImageEntityId, availableMapEntities, entities]);

  const mapEntitiesNamesMap = useMemo(() => {
    const res = {};
    const nameRegex = vacuumName ? new RegExp(vacuumName, 'gi') : null;
    const friendlyNameRegex = vacuumFriendlyName ? new RegExp(vacuumFriendlyName, 'gi') : null;

    for (const eid of availableMapEntities) {
      const friendlyName = entities?.[eid]?.attributes?.friendly_name;
      const fallbackName = eid.split('.')[1] || eid;
      let cleanName = friendlyName || fallbackName;

      if (nameRegex) cleanName = cleanName.replace(nameRegex, '');
      if (friendlyNameRegex) cleanName = cleanName.replace(friendlyNameRegex, '');
      
      if (Array.isArray(vacuumNameTokens)) {
        for (const token of vacuumNameTokens) {
          if (token && token.length > 2) {
            cleanName = cleanName.replace(new RegExp(token, 'gi'), '');
          }
        }
      }

      cleanName = cleanName
        .replace(/map/i, '')
        .replace(/kart/i, '')
        .replace(/[_\-\s]+/g, ' ')
        .trim();

      if (cleanName) {
        cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
      res[eid] = cleanName || 'Map';
    }
    return res;
  }, [availableMapEntities, entities, vacuumName, vacuumFriendlyName, vacuumNameTokens]);

  const mapUrl = useMemo(() => {
    if (
      !activeMapEntityId ||
      !entities?.[activeMapEntityId] ||
      typeof getEntityImageUrl !== 'function'
    ) {
      return null;
    }
    const picture = entities[activeMapEntityId]?.attributes?.entity_picture;
    return picture ? getEntityImageUrl(picture) : null;
  }, [activeMapEntityId, entities, getEntityImageUrl]);

  const finalMapUrl = useMemo(() => {
    if (!mapUrl) return null;
    return `${mapUrl}${mapUrl.includes('?') ? '&' : '?'}t=${refreshKey}`;
  }, [mapUrl, refreshKey]);

  // Determine Tab layout eligibility
  const hasMap = !!activeMapEntityId && showMapToggle;
  const hasAreas = mappedAreas.length > 0 || roomSelectOptions.length > 0;
  const showTabbedLayout = hasMap || hasAreas || isAreasLoading;

  // Reset tab to controls if layout is closed/opened
  useEffect(() => {
    if (show) {
      setActiveTab('controls');
      setSelectedAreaIds([]);
      setResetConfirmKey(null);
      setIsAreasLoading(true);
    } else {
      setSelectedAreaIds([]);
    }
  }, [show]);

  if (!show) return null;
  if (!vacuumId || !entities?.[vacuumId]) return null;

  const entity = entities[vacuumId];
  const attrs = entity?.attributes || {};
  const state = entity?.state;
  const isCleaning = state === 'cleaning';
  const isReturning = state === 'returning';
  const isError = state === 'error';
  const supportedFeatures = Number(attrs.supported_features);
  const hasSupportedFeatures = Number.isFinite(supportedFeatures) && supportedFeatures > 0;
  const hasAnyFeature = (bits) =>
    hasSupportedFeatures && bits.some((bit) => (supportedFeatures & bit) === bit);

  const battery = toFiniteNumber(
    getA(vacuumId, 'battery_level') ??
      getMappedSensorValue('batterySensorId') ??
      findSensorValue(['battery_level']) ??
      findSensorValue(['battery']) ??
      findSensorValue(['soc'])
  );

  const fanSpeed = getA(vacuumId, 'fan_speed');
  const mopIntensity = getA(vacuumId, 'mop_intensity');
  const mopControlEntityId = (() => {
    const mapped = settings?.mopIntensityControlEntityId;
    if (mapped && entities?.[mapped]) return mapped;
    if (!Array.isArray(registryRelatedSelectIds) || registryRelatedSelectIds.length === 0)
      return null;

    const keywordRegex = /(mop|water|intensity|wet|scrub)/i;
    const match = registryRelatedSelectIds.find((entityId) => {
      const lowerId = String(entityId).toLowerCase();
      const friendly = String(entities?.[entityId]?.attributes?.friendly_name || '').toLowerCase();
      return keywordRegex.test(lowerId) || keywordRegex.test(friendly);
    });

    return match || null;
  })();

  const mopControlEntity = mopControlEntityId ? entities?.[mopControlEntityId] : null;
  const mopControlOptions = Array.isArray(mopControlEntity?.attributes?.options)
    ? mopControlEntity.attributes.options
    : [];
  const mopControlCurrent = mopControlEntity?.state;
  const canPause = hasAnyFeature([2, 4]) || !hasSupportedFeatures;
  const canStop = hasAnyFeature([4, 8]) || !hasSupportedFeatures;
  const canReturnToBase = hasAnyFeature([8, 16]) || !hasSupportedFeatures;
  const canLocate = hasAnyFeature([64, 256, 1024]) || !hasSupportedFeatures;
  const hasFanControls =
    (Array.isArray(attrs.fan_speed_list) && attrs.fan_speed_list.length > 0) ||
    isValidStateValue(fanSpeed);
  const canSetFanSpeed = hasFanControls || hasAnyFeature([16, 32]);
  const hasMopControls =
    (Array.isArray(attrs.mop_intensity_list) && attrs.mop_intensity_list.length > 0) ||
    isValidStateValue(mopIntensity) ||
    mopControlOptions.length > 0 ||
    Object.keys(attrs).some((key) => key.startsWith('mop_') || key.startsWith('water_'));
  const canSetMopIntensity = hasMopControls;

  // --- Cleaning statistics ---
  const mappedCleaningTime = getMappedSensorWithUnit('cleaningTimeSensorId');
  const cleaningTimeRaw =
    mappedCleaningTime?.value ??
    attrs.cleaning_time ??
    attrs.current_clean_time ??
    attrs.clean_time ??
    null;
  const cleaningTimeSensor =
    cleaningTimeRaw == null
      ? (findSensorWithUnit(['cleaning_time']) ?? findSensorWithUnit(['clean_time']))
      : null;
  const cleaningTime = cleaningTimeRaw ?? cleaningTimeSensor?.value ?? null;
  const cleaningTimeUnit = mappedCleaningTime?.unit ?? cleaningTimeSensor?.unit ?? null;

  const mappedCleanedArea = getMappedSensorWithUnit('cleanedAreaSensorId');
  const cleanedAreaRaw =
    mappedCleanedArea?.value ??
    attrs.cleaned_area ??
    attrs.current_clean_area ??
    attrs.clean_area ??
    null;
  const cleanedAreaSensor =
    cleanedAreaRaw == null
      ? (findSensorWithUnit(['cleaning_area']) ??
        findSensorWithUnit(['cleaned_area']) ??
        findSensorWithUnit(['clean_area']))
      : null;
  const cleanedArea = cleanedAreaRaw ?? cleanedAreaSensor?.value ?? null;
  const cleanedAreaUnit =
    mappedCleanedArea?.unit ??
    cleanedAreaSensor?.unit ??
    attrs.cleaned_area_unit ??
    attrs.current_clean_area_unit ??
    attrs.clean_area_unit ??
    null;

  const mappedTotalCleanTime = getMappedSensorWithUnit('totalCleanTimeSensorId');
  const totalTimeRaw =
    mappedTotalCleanTime?.value ??
    attrs.total_cleaning_time ??
    attrs.total_clean_time ??
    attrs.total_duration ??
    null;
  const totalTimeSensor =
    totalTimeRaw == null
      ? (findSensorWithUnit(['total', 'cleaning_time']) ??
        findSensorWithUnit(['total', 'clean_time']) ??
        findSensorWithUnit(['total', 'duration']))
      : null;
  const totalCleanTime = totalTimeRaw ?? totalTimeSensor?.value ?? null;
  const totalCleanTimeUnit = mappedTotalCleanTime?.unit ?? totalTimeSensor?.unit ?? null;

  const mappedTotalCleanArea = getMappedSensorWithUnit('totalCleanAreaSensorId');
  const totalCleanAreaRaw =
    mappedTotalCleanArea?.value ?? attrs.total_clean_area ?? attrs.total_cleaned_area ?? null;
  const totalCleanAreaSensor =
    totalCleanAreaRaw == null
      ? (findSensorWithUnit(['total', 'clean_area']) ??
        findSensorWithUnit(['total', 'cleaned_area']))
      : null;
  const totalCleanArea = totalCleanAreaRaw ?? totalCleanAreaSensor?.value ?? null;
  const totalCleanAreaUnit =
    mappedTotalCleanArea?.unit ??
    totalCleanAreaSensor?.unit ??
    attrs.total_clean_area_unit ??
    attrs.total_cleaned_area_unit ??
    null;

  const totalCleanCount =
    getMappedSensorValue('totalCleanCountSensorId') ??
    attrs.total_clean_count ??
    attrs.clean_count ??
    findSensorValue(['total', 'clean_count']) ??
    findSensorValue(['clean_count']);

  const lastCleanStart =
    getMappedSensorValue('lastCleanStartSensorId') ??
    attrs.last_clean_start ??
    attrs.last_run_start ??
    findSensorValue(['last_clean_start']) ??
    findSensorValue(['last_run_start']);

  const lastCleanEnd =
    getMappedSensorValue('lastCleanEndSensorId') ??
    attrs.last_clean_end ??
    attrs.last_run_end ??
    findSensorValue(['last_clean_end']) ??
    findSensorValue(['last_run_end']) ??
    findSensorValue(['last_clean_time']);

  // --- Dynamic Grid Compression ---
  const roomCount = mappedAreas.length || roomSelectOptions.length || 0;
  const isDense = roomCount > 6;
  const isVeryFew = roomCount > 0 && roomCount <= 4;
  const layoutMode = settings.layoutMode || 'horizontal';

  // --- Calculate Session Averages ---
  const totalCleanCountNum = Number(totalCleanCount);
  const totalCleanTimeNum = Number(totalCleanTime);
  const totalCleanAreaNum = Number(totalCleanArea);

  const hasCalculatedStats = useMemo(() => {
    return (
      Number.isFinite(totalCleanCountNum) &&
      totalCleanCountNum > 0 &&
      ((Number.isFinite(totalCleanTimeNum) && totalCleanTimeNum > 0) ||
        (Number.isFinite(totalCleanAreaNum) && totalCleanAreaNum > 0))
    );
  }, [totalCleanCountNum, totalCleanTimeNum, totalCleanAreaNum]);

  const avgCleanTime = useMemo(() => {
    if (!hasCalculatedStats || !totalCleanTimeNum) return '--';
    return Math.round(totalCleanTimeNum / totalCleanCountNum);
  }, [hasCalculatedStats, totalCleanTimeNum, totalCleanCountNum]);

  const avgCleanArea = useMemo(() => {
    if (!hasCalculatedStats || !totalCleanAreaNum) return '--';
    return Number((totalCleanAreaNum / totalCleanCountNum).toFixed(1));
  }, [hasCalculatedStats, totalCleanAreaNum, totalCleanCountNum]);

  // --- Advanced Telemetry Discovery ---
  const displayedSensorIds = useMemo(() => {
    const ids = new Set();

    // Add primary diagnostics sensors
    const cleanWater =
      findEntityByKeywords(['clean', 'water']) ||
      findEntityByKeywords(['water', 'tank']) ||
      findEntityByKeywords(['water', 'box']);
    const dirtyWater =
      findEntityByKeywords(['dirty', 'water']) || findEntityByKeywords(['waste', 'water']);
    const mopAttached =
      findEntityByKeywords(['mop', 'attached']) ||
      findEntityByKeywords(['mop', 'mount']) ||
      findEntityByKeywords(['mop', 'installed']);
    const dustbin =
      findEntityByKeywords(['dustbin', 'installed']) ||
      findEntityByKeywords(['dustbin', 'attached']) ||
      findEntityByKeywords(['dustbin']);
    const dnd = findEntityByKeywords(['dnd']) || findEntityByKeywords(['do_not_disturb']);
    const drying = findEntityByKeywords(['drying']) || findEntityByKeywords(['mop_drying']);

    if (cleanWater) ids.add(cleanWater.id);
    if (dirtyWater) ids.add(dirtyWater.id);
    if (mopAttached) ids.add(mopAttached.id);
    if (dustbin) ids.add(dustbin.id);
    if (dnd) ids.add(dnd.id);
    if (drying) ids.add(drying.id);

    // Add consumables sensors
    const mainBrush = findConsumableSensor(['main', 'brush']);
    const sideBrush = findConsumableSensor(['side', 'brush']);
    const filter = findConsumableSensor(['filter']);
    const sensors =
      findConsumableSensor(['sensor', 'dirty']) ||
      findConsumableSensor(['sensor', 'cleaning']) ||
      findConsumableSensor(['sensor', 'wear']) ||
      findConsumableSensor(['sensors', 'dirty']);

    if (mainBrush) ids.add(mainBrush);
    if (sideBrush) ids.add(sideBrush);
    if (filter) ids.add(filter);
    if (sensors) ids.add(sensors);

    // Add settings sensors
    if (settings?.cleaningTimeSensorId) ids.add(settings.cleaningTimeSensorId);
    if (settings?.cleanedAreaSensorId) ids.add(settings.cleanedAreaSensorId);
    if (settings?.totalCleanTimeSensorId) ids.add(settings.totalCleanTimeSensorId);
    if (settings?.totalCleanAreaSensorId) ids.add(settings.totalCleanAreaSensorId);
    if (settings?.totalCleanCountSensorId) ids.add(settings.totalCleanCountSensorId);
    if (settings?.lastCleanStartSensorId) ids.add(settings.lastCleanStartSensorId);
    if (settings?.lastCleanEndSensorId) ids.add(settings.lastCleanEndSensorId);
    if (settings?.batterySensorId) ids.add(settings.batterySensorId);

    // Add primary vacuum entity id itself
    if (vacuumId) ids.add(vacuumId);

    return ids;
  }, [show, vacuumId, findEntityByKeywords, findConsumableSensor, settings]);

  const advancedSensors = useMemo(() => {
    if (!show || !entities || !registryRelatedSensorIds.length) return [];
    return registryRelatedSensorIds
      .filter((eid) => {
        if (displayedSensorIds.has(eid)) return false;
        const domain = eid.split('.')[0];
        return domain === 'sensor' || domain === 'binary_sensor';
      })
      .map((eid) => {
        const ent = entities[eid];
        return {
          id: eid,
          label: ent?.attributes?.friendly_name || eid.split('.')[1]?.replace(/_/g, ' '),
          state: ent?.state,
          unit: ent?.attributes?.unit_of_measurement,
        };
      })
      .filter((item) => isValidStateValue(item.state));
  }, [show, entities, registryRelatedSensorIds, displayedSensorIds]);

  const renderAdvancedTelemetryAccordion = () => {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/[0.03] bg-[var(--glass-bg)] font-sans shadow-sm transition-all duration-300">
        <button
          onClick={() => setIsAdvancedOpen((prev) => !prev)}
          className="flex w-full items-center justify-between p-3.5 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-all hover:bg-white/[0.02] hover:text-[var(--text-primary)]"
        >
          <div className="flex items-center gap-2.5">
            <Wrench className="h-4 w-4 text-[var(--accent-color)]" />
            <span>{t('vacuum.advancedTelemetry') || 'Advanced Telemetry'}</span>
          </div>
          <span
            className={`transform text-[10px] transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </button>

        {isAdvancedOpen && (
          <div className="animate-in slide-in-from-top-2 scrollbar-thin max-h-[250px] divide-y divide-white/5 overflow-y-auto border-t border-white/5 p-4 pt-0 duration-300">
            {advancedSensors.map((sensor) => {
              const value = sensor.state;
              const unit = sensor.unit;
              const name = sensor.label;

              const TeleIcon = (() => {
                const lower = name.toLowerCase();
                if (lower.includes('wifi') || lower.includes('rssi') || lower.includes('signal'))
                  return Activity;
                if (lower.includes('battery') || lower.includes('soc')) return Battery;
                if (lower.includes('fan') || lower.includes('speed') || lower.includes('suction'))
                  return Fan;
                if (
                  lower.includes('filter') ||
                  lower.includes('brush') ||
                  lower.includes('main') ||
                  lower.includes('side')
                )
                  return Wrench;
                if (lower.includes('time') || lower.includes('duration') || lower.includes('clock'))
                  return Clock;
                if (lower.includes('area') || lower.includes('size')) return Maximize2;
                return Bot;
              })();

              return (
                <div key={sensor.id} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex min-w-0 items-center gap-3">
                    <TeleIcon className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
                    <span className="truncate font-semibold text-[var(--text-secondary)]">
                      {name}
                    </span>
                  </div>
                  <span className="pl-2 font-bold text-[var(--text-primary)]">
                    {formatRawValueWithUnit(value, unit)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const startRoomCleaning = async (scriptEntityId) => {
    if (!conn && !callService) return;
    try {
      if (conn) {
        await conn.sendMessagePromise({
          type: 'call_service',
          domain: 'script',
          service: 'turn_on',
          service_data: { entity_id: scriptEntityId },
        });
      } else {
        callService('script', 'turn_on', { entity_id: scriptEntityId });
      }
    } catch (_e) {
      // silently handle
    }
  };

  const fanSpeedList =
    Array.isArray(attrs.fan_speed_list) && attrs.fan_speed_list.length > 0
      ? attrs.fan_speed_list
      : ['Silent', 'Standard', 'Strong', 'Turbo'];

  const mopIntensityList =
    Array.isArray(attrs.mop_intensity_list) && attrs.mop_intensity_list.length > 0
      ? attrs.mop_intensity_list
      : ['Low', 'Medium', 'High'];

  const effectiveMopOptions = mopControlOptions.length > 0 ? mopControlOptions : mopIntensityList;
  const effectiveMopCurrent = mopControlOptions.length > 0 ? mopControlCurrent : mopIntensity;

  const setMopIntensity = (value) => {
    if (mopControlEntityId && mopControlOptions.length > 0) {
      const domain = mopControlEntityId.split('.')[0];
      if (domain === 'select' || domain === 'input_select') {
        callService(domain, 'select_option', {
          entity_id: mopControlEntityId,
          option: value,
        });
        return;
      }
    }
    callService('vacuum', 'set_mop_intensity', {
      entity_id: vacuumId,
      mop_intensity: value,
    });
  };

  const handlePrimaryAction = () => {
    if (isCleaning) {
      if (canPause) {
        callService('vacuum', 'pause', { entity_id: vacuumId });
        return;
      }
      if (canStop) {
        callService('vacuum', 'stop', { entity_id: vacuumId });
        return;
      }
    }
    callService('vacuum', 'start', { entity_id: vacuumId });
  };

  const primaryActionLabel = isCleaning
    ? canPause
      ? t('vacuum.pause')
      : t('vacuum.stop') || 'Stop'
    : t('vacuum.start');

  const statusColor = isCleaning
    ? '#60a5fa'
    : isReturning
      ? '#c084fc'
      : isError
        ? '#ef4444'
        : 'var(--text-secondary)';

  const statusBg = isCleaning
    ? 'rgba(59, 130, 246, 0.1)'
    : isReturning
      ? 'rgba(192, 132, 252, 0.1)'
      : isError
        ? 'rgba(239, 68, 68, 0.1)'
        : 'var(--glass-bg)';

  const stateLabel = getVacuumStateLabel(state, battery, t);

  // Consumable reset trigger
  const handleReset = async (buttonId, key) => {
    if (!buttonId || !conn) return;
    try {
      await conn.sendMessagePromise({
        type: 'call_service',
        domain: 'button',
        service: 'press',
        service_data: {
          entity_id: buttonId,
        },
      });
      setResetConfirmKey(null);
    } catch (err) {
      console.error('Error resetting consumable:', err);
    }
  };

  const getConsumableColor = (val) => {
    if (val === null) return 'var(--text-muted)';
    if (val < 20) return 'hsl(346, 84%, 61%)'; // Red
    if (val <= 50) return 'hsl(38, 92%, 50%)'; // Amber
    return 'hsl(142, 70%, 45%)'; // Green
  };

  // Trigger Native Mapped Area Cleaning service
  const handleCleanSelectedAreas = async () => {
    if (selectedAreaIds.length === 0) return;
    try {
      if (conn) {
        await conn.sendMessagePromise({
          type: 'call_service',
          domain: 'vacuum',
          service: 'clean_area',
          target: {
            entity_id: vacuumId,
          },
          service_data: {
            cleaning_area_id: selectedAreaIds,
          },
        });
      } else {
        callService('vacuum', 'clean_area', {
          target: {
            entity_id: vacuumId,
          },
          cleaning_area_id: selectedAreaIds,
        });
      }
      setSelectedAreaIds([]);
      setActiveTab('controls');
    } catch (err) {
      console.error('Error in native area cleaning service call:', err);
    }
  };

  // Trigger Room Cleaning service
  const handleCleanRoom = async () => {
    if (!selectedRoom || !roomSelectEntityId) return;
    const domain = roomSelectEntityId.split('.')[0] === 'input_select' ? 'input_select' : 'select';

    try {
      if (conn) {
        await conn.sendMessagePromise({
          type: 'call_service',
          domain,
          service: 'select_option',
          service_data: {
            entity_id: roomSelectEntityId,
            option: selectedRoom,
          },
        });
      } else {
        callService(domain, 'select_option', {
          entity_id: roomSelectEntityId,
          option: selectedRoom,
        });
      }
      setActiveTab('controls');
    } catch (err) {
      console.error('Error in room cleaning service call:', err);
    }
  };

  // Render original split controls (used directly or as the Control Tab)
  const renderControlsPane = (showRightImage = true) => {
    const showRightColumn = showRightImage || !showTabbedLayout;
    return (
      <div
        className={`grid grid-cols-1 items-stretch gap-12 font-sans ${showRightColumn ? 'lg:grid-cols-5' : 'lg:grid-cols-1'}`}
      >
        {/* Left Column - Main Controls & Status (Span 3) */}
        <div
          className={`flex flex-col space-y-6 ${showRightColumn ? 'lg:col-span-3 h-full' : 'mx-auto w-full max-w-3xl'}`}
        >
          <div className="popup-surface flex flex-1 flex-col items-center justify-stretch gap-6 rounded-3xl p-6 sm:p-8 h-full">
            {/* Primary Actions */}
            <div className="flex w-full gap-4">
              <button
                onClick={handlePrimaryAction}
                className={`flex flex-1 items-center justify-center gap-3 rounded-2xl py-5 text-sm font-bold tracking-widest uppercase transition-all active:scale-[0.98] ${
                  isCleaning ? 'hover:bg-[var(--glass-bg-hover)]' : 'hover:opacity-90'
                }`}
                style={
                  isCleaning
                    ? { backgroundColor: 'var(--glass-bg)', color: 'var(--text-primary)' }
                    : { backgroundColor: 'var(--accent-color)', color: '#fff' }
                }
              >
                {isCleaning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {primaryActionLabel}
              </button>
              {canReturnToBase && (
                <button
                  onClick={() => callService('vacuum', 'return_to_base', { entity_id: vacuumId })}
                  className="flex flex-1 items-center justify-center gap-3 rounded-2xl py-5 text-sm font-bold tracking-widest uppercase transition-all hover:bg-[var(--glass-bg-hover)] active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                >
                  <Home className="h-5 w-5" />
                  {t('vacuum.home')}
                </button>
              )}
            </div>

            {/* Low-profile inline status bar (replaces bulky cards) */}
            <div className="flex w-full items-center justify-between gap-4 rounded-2xl bg-white/[0.02] p-3 text-xs">
              {/* Battery */}
              <div className="flex items-center gap-2">
                <Battery
                  className={`h-4.5 w-4.5 ${
                    battery != null && battery < 20
                      ? 'text-[var(--status-error-fg)]'
                      : 'text-[var(--status-success-fg)]'
                  }`}
                />
                <span className="font-bold text-[var(--text-secondary)]">
                  {battery != null ? `${Math.round(battery)}%` : '--'}
                </span>
              </div>

              {/* Room */}
              <div className="flex max-w-[45%] min-w-0 items-center gap-2">
                <MapPin className="h-4.5 w-4.5 flex-shrink-0 text-[var(--accent-color)]" />
                <span className="truncate font-bold text-[var(--text-secondary)]" title={room}>
                  {room || '--'}
                </span>
              </div>

              {/* Locate Button */}
              {canLocate && (
                <button
                  onClick={() => callService('vacuum', 'locate', { entity_id: vacuumId })}
                  className="flex items-center gap-1.5 rounded-lg border-0 bg-purple-500/10 px-2.5 py-1.5 text-[10px] font-bold tracking-widest text-purple-400 uppercase transition-all hover:bg-purple-500/20 active:scale-95"
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>{t('vacuum.find') || 'Find'}</span>
                </button>
              )}
            </div>

            {/* Suction & Mop controls rendered on Left Side */}
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
              {canSetFanSpeed && (
                <ModernDropdown
                  label={t('vacuum.suction')}
                  icon={Fan}
                  options={fanSpeedList}
                  current={fanSpeed}
                  onChange={(value) =>
                    callService('vacuum', 'set_fan_speed', {
                      entity_id: vacuumId,
                      fan_speed: value,
                    })
                  }
                  placeholder={t('vacuum.suction')}
                  map={{}}
                />
              )}

              {canSetMopIntensity && (
                <ModernDropdown
                  label={t('vacuum.mopIntensity')}
                  icon={Droplets}
                  options={effectiveMopOptions}
                  current={effectiveMopCurrent}
                  onChange={setMopIntensity}
                  placeholder={t('vacuum.mopIntensity')}
                  map={{}}
                />
              )}
            </div>

            {/* Current Session Stats */}
            <div className="w-full space-y-2.5">
              <p
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('vacuum.statsCurrentSession') || 'Current session'}
              </p>
              <div className="grid w-full grid-cols-2 gap-3">
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all"
                  style={{ backgroundColor: 'var(--glass-bg)' }}
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: isCleaning ? 'rgba(59, 130, 246, 0.15)' : 'var(--glass-bg)',
                      color: isCleaning ? '#60a5fa' : 'var(--text-secondary)',
                    }}
                  >
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg leading-tight font-light">
                      {formatRawValueWithUnit(cleaningTime, cleaningTimeUnit)}
                    </p>
                    <p
                      className="text-[10px] font-bold tracking-widest uppercase"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {t('vacuum.statsTime') || 'Time'}
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all"
                  style={{ backgroundColor: 'var(--glass-bg)' }}
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: isCleaning ? 'rgba(59, 130, 246, 0.15)' : 'var(--glass-bg)',
                      color: isCleaning ? '#60a5fa' : 'var(--text-secondary)',
                    }}
                  >
                    <Maximize2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg leading-tight font-light">
                      {formatRawValueWithUnit(cleanedArea, cleanedAreaUnit)}
                    </p>
                    <p
                      className="text-[10px] font-bold tracking-widest uppercase"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {t('vacuum.statsArea') || 'Area'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Room Scripts */}
            {roomScripts.length > 0 && (
              <div className="w-full space-y-3 pt-2">
                <p
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t('vacuum.cleanRooms') || 'Clean rooms'}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {roomScripts.map((script, index) => (
                    <button
                      key={index}
                      onClick={() => startRoomCleaning(script.entityId)}
                      className="group flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-medium transition-all hover:bg-[var(--glass-bg-hover)] active:scale-[0.98]"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <Sparkles
                        className="h-4 w-4 transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                      />
                      {script.label || script.entityId}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Map & History if simple layout (Span 2) */}
        {showRightColumn && (
          <div className="flex flex-col justify-start space-y-4 py-2 font-sans lg:col-span-2 h-full">
            {/* Live Map Display in controls column */}
            {showRightImage && finalMapUrl && (
              <>
                {/* Standalone Map Selector */}
                {availableMapEntities.length >= 1 && (
                  <ModernDropdown
                    labelHidden={true}
                    icon={MapPin}
                    options={availableMapEntities}
                    current={activeMapEntityId}
                    onChange={(val) => {
                      setSelectedMapEntityId(val);
                      try {
                        localStorage.setItem(`tunet_vacuum_selected_map_${vacuumId}`, val);
                      } catch {}
                    }}
                    map={mapEntitiesNamesMap}
                    placeholder={t('vacuum.selectMap') || 'Velg kart'}
                    menuPortal={true}
                    menuClassName="!z-[100000]"
                  />
                )}

                <div
                  className="popup-surface relative flex-1 min-h-[280px] w-full overflow-hidden rounded-3xl p-2 shadow-2xl select-none"
                  onMouseDown={handleMapMouseDown}
                  onMouseMove={handleMapMouseMove}
                  onMouseUp={handleMapMouseUpOrLeave}
                  onMouseLeave={handleMapMouseUpOrLeave}
                  onTouchStart={handleMapTouchStart}
                  onTouchMove={handleMapTouchMove}
                  onTouchEnd={handleMapTouchEnd}
                  style={{ cursor: mapScale > 1.05 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
                >
                  {/* Pulsing Live Badge */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--status-success-fg)] uppercase italic shadow-md backdrop-blur-md">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-success-fg)] opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-success-fg)]"></span>
                    </span>
                    {t('vacuum.liveMap') || 'Live Map'}
                  </div>

                  {/* Map Button Toolbar */}
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRefreshKey((prev) => prev + 1);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition-all hover:scale-105 hover:bg-black/80"
                      title={t('vacuum.reloadMap') || 'Reload map'}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMapZoomed(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition-all hover:scale-105 hover:bg-black/80"
                      title="Maximize Map"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>

                  <img
                    src={finalMapUrl}
                    alt="Live Map"
                    onDragStart={(e) => e.preventDefault()}
                    className="pointer-events-none h-full w-full rounded-2xl object-contain transition-transform duration-200 select-none"
                    style={{
                      transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapScale})`,
                      filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))',
                    }}
                  />

                  {/* Floating Map Zoom Toolbar */}
                  <div className="absolute right-4 bottom-4 z-10 flex items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1 shadow-md backdrop-blur-md">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        zoomInMap();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95"
                      title={t('vacuum.zoomIn') || 'Zoom inn'}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        zoomOutMap();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95"
                      title={t('vacuum.zoomOut') || 'Zoom ut'}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetMapZoom();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95"
                      title={t('vacuum.resetZoom') || 'Resett zoom'}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* If simple layout, show history stats directly on right pane */}
            {!showTabbedLayout && renderHistoryCard()}
          </div>
        )}
      </div>
    );
  };

  function renderHistoryCard() {
    const stats = [
      {
        key: 'totalCleans',
        label: t('vacuum.statsTotalCleans') || 'Total washes',
        value: totalCleanCount ?? '--',
        icon: Activity,
        colorClass: 'text-blue-400',
      },
      {
        key: 'totalTime',
        label: t('vacuum.statsTotalTime') || 'Total time',
        value: formatRawValueWithUnit(totalCleanTime, totalCleanTimeUnit),
        icon: Clock,
        colorClass: 'text-purple-400',
      },
      {
        key: 'totalArea',
        label: t('vacuum.statsTotalArea') || 'Total area',
        value: formatRawValueWithUnit(totalCleanArea, totalCleanAreaUnit),
        icon: Maximize2,
        colorClass: 'text-[var(--status-success-fg)]',
      },
      {
        key: 'lastCleaned',
        label: t('vacuum.lastCleaned') || 'Last cleaned',
        value: formatLastCleaned(lastCleanEnd || lastCleanStart, t),
        icon: Calendar,
        colorClass: 'text-amber-400',
      },
      {
        key: 'avgTime',
        label: t('vacuum.avgTime') || 'Avg Clean Time',
        value: avgCleanTime != null ? `${avgCleanTime} ${t('vacuum.statsMinutes') || 'min'}` : '--',
        icon: Clock,
        colorClass: 'text-indigo-400',
      },
      {
        key: 'avgArea',
        label: t('vacuum.avgArea') || 'Avg Clean Area',
        value: avgCleanArea != null ? `${avgCleanArea} ${totalCleanAreaUnit || 'm²'}` : '--',
        icon: Maximize2,
        colorClass: 'text-teal-400',
      },
    ];

    if (showTabbedLayout) {
      const hasConsumables = consumables.length > 0;
      return (
        <div className={`animate-in fade-in font-sans not-italic duration-300 ${hasConsumables ? 'grid grid-cols-1 lg:grid-cols-5 gap-8' : ''}`}>
          {/* Left Column: Stats & Diagnostics */}
          <div className={`space-y-6 ${hasConsumables ? 'lg:col-span-3' : 'w-full'}`}>
            {/* Statistics Grid */}
            <div>
              <p
                className="mb-4 ml-1 text-[10px] font-bold tracking-[0.2em] uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('vacuum.statsHistory') || 'Historikk'}
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-1 sm:grid-cols-3">
                {stats.map(({ key, label, value }) => (
                  <div
                    key={key}
                    className="flex min-w-0 flex-col transition-all duration-300 hover:translate-y-[-2px]"
                  >
                    <p className="mb-1 text-[10px] leading-tight font-bold tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      {label}
                    </p>
                    <p className="text-xl leading-none font-extralight tracking-tight text-[var(--text-primary)] sm:text-2xl">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Diagnostics & Advanced Telemetry */}
            {(diagnostics.length > 0 || advancedSensors.length > 0) && (
              <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
                {diagnostics.length > 0 && (
                  <div className="space-y-3">
                    <p
                      className="ml-1 text-[10px] font-bold tracking-[0.2em] uppercase"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {t('vacuum.statsDiagnostics') || 'Diagnostikk'}
                    </p>
                    <div className="space-y-4 rounded-2xl border border-white/[0.03] bg-[var(--glass-bg)] p-5 shadow-sm">
                      <div className="flex items-center gap-2.5 border-b border-white/5 pb-2">
                        <Activity className="h-4 w-4 text-[var(--accent-color)]" />
                        <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase">
                          {t('vacuum.systemHealth') || 'Systemstatus'}
                        </span>
                      </div>
                      <div className="divide-y divide-white/5">
                        {diagnostics.map(({ key, label, state, type }) => {
                          const color = getDiagnosticColor(state, type);
                          const formattedState = formatDiagnosticState(state, type, t);

                          const DiagIcon = (() => {
                            if (key.includes('Water') || key.toLowerCase().includes('water'))
                              return Droplets;
                            if (key.includes('mop') || key.includes('Mop')) return Sparkles;
                            if (key.includes('dust') || key.includes('Dust')) return Warehouse;
                            if (key.includes('drying') || key.includes('Drying')) return Fan;
                            if (key.includes('dnd') || key.includes('Dnd')) return Clock;
                            return Bot;
                          })();

                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between py-2 text-xs first:pt-0 last:pb-0"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <DiagIcon className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
                                <span className="truncate font-semibold text-[var(--text-secondary)]">
                                  {label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                                />
                                <span className="font-bold" style={{ color }}>
                                  {formattedState}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {advancedSensors.length > 0 && (
                  <div className="space-y-3">
                    <p
                      className="ml-1 text-[10px] font-bold tracking-[0.2em] uppercase"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {t('vacuum.advancedTelemetry') || 'Avansert Telemetri'}
                    </p>
                    {renderAdvancedTelemetryAccordion()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Consumables & Maintenance */}
          {hasConsumables && (
            <div className="space-y-3 lg:col-span-2">
              <p
                className="ml-1 text-[10px] font-bold tracking-[0.2em] uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('vacuum.maintenance') || 'Vedlikehald'}
              </p>
              <div className="space-y-4 rounded-2xl border border-white/[0.03] bg-[var(--glass-bg)] p-4 shadow-sm sm:p-5">
                {consumables.map(({ key, label, pct, buttonId, icon: Icon }) => {
                  const color = getConsumableColor(pct);
                  const isConfirming = resetConfirmKey === key;

                  return (
                    <div
                      key={key}
                      className="flex flex-col justify-between gap-3 border-b border-white/[0.02] py-1 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center"
                    >
                      {/* Left: Icon and Label */}
                      <div className="flex min-w-0 items-center gap-2.5 sm:w-5/12">
                        <div
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: `${color}12`,
                            color: color,
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">
                          {label}
                        </span>
                      </div>

                      {/* Center: Thin Progress Bar */}
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: color,
                              boxShadow: `0 0 4px ${color}30`,
                            }}
                          />
                        </div>
                        <span
                          className="min-w-[28px] text-right text-[11px] font-bold"
                          style={{ color }}
                        >
                          {pct}%
                        </span>
                      </div>

                      {/* Right: Reset Button */}
                      <div className="flex justify-end sm:w-3/12">
                        <button
                          disabled={!buttonId}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (resetConfirmKey === key) {
                              void handleReset(buttonId, key);
                            } else {
                              setResetConfirmKey(key);
                            }
                          }}
                          className={`rounded-lg border-0 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 ${
                            isConfirming
                              ? 'animate-pulse border border-[var(--status-error-border)] bg-[var(--status-error-bg)] font-extrabold text-[var(--status-error-fg)] hover:opacity-90'
                              : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]'
                          } ${!buttonId ? 'cursor-not-allowed opacity-20' : ''}`}
                        >
                          {isConfirming
                            ? t('vacuum.confirmResetShort') || 'Sikker?'
                            : t('vacuum.reset') || 'Nullstill'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="animate-in fade-in space-y-8 font-sans not-italic duration-300">
        {/* Statistics Grid */}
        <div>
          <p
            className="mb-4 ml-1 text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('vacuum.statsHistory') || 'Historikk'}
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 p-1 sm:grid-cols-3">
            {stats.map(({ key, label, value }) => (
              <div
                key={key}
                className="flex min-w-0 flex-col transition-all duration-300 hover:translate-y-[-2px]"
              >
                <p className="mb-1.5 text-[10px] leading-tight font-bold tracking-[0.15em] text-[var(--text-muted)] uppercase">
                  {label}
                </p>
                <p className="text-2xl leading-none font-extralight tracking-tight text-[var(--text-primary)] sm:text-3xl">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Consumables (Vedlikehald) */}
        {consumables.length > 0 && (
          <div className="space-y-3">
            <p
              className="ml-1 text-[10px] font-bold tracking-[0.2em] uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('vacuum.maintenance') || 'Vedlikehald'}
            </p>
            <div className="space-y-5 rounded-2xl border border-white/[0.03] bg-[var(--glass-bg)] p-6 shadow-sm">
              {consumables.map(({ key, label, pct, buttonId, icon: Icon }) => {
                const color = getConsumableColor(pct);
                const isConfirming = resetConfirmKey === key;

                return (
                  <div
                    key={key}
                    className="flex flex-col justify-between gap-4 border-b border-white/[0.02] py-1.5 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center"
                  >
                    {/* Left: Icon and Label */}
                    <div className="flex min-w-0 items-center gap-3 sm:w-1/3">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${color}12`,
                          color: color,
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">
                        {label}
                      </span>
                    </div>

                    {/* Center: Thin Progress Bar */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: color,
                            boxShadow: `0 0 4px ${color}30`,
                          }}
                        />
                      </div>
                      <span
                        className="min-w-[28px] text-right text-[11px] font-bold"
                        style={{ color }}
                      >
                        {pct}%
                      </span>
                    </div>

                    {/* Right: Subtle Link Reset Button */}
                    <div className="flex justify-end sm:w-1/4">
                      <button
                        disabled={!buttonId}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (resetConfirmKey === key) {
                            void handleReset(buttonId, key);
                          } else {
                            setResetConfirmKey(key);
                          }
                        }}
                        className={`rounded-lg border-0 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 ${
                          isConfirming
                            ? 'animate-pulse border border-[var(--status-error-border)] bg-[var(--status-error-bg)] font-extrabold text-[var(--status-error-fg)] hover:opacity-90'
                            : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]'
                        } ${!buttonId ? 'cursor-not-allowed opacity-20' : ''}`}
                      >
                        {isConfirming
                          ? t('vacuum.confirmResetShort') || 'Sikker?'
                          : t('vacuum.reset') || 'Nullstill'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Diagnostics & Advanced Telemetry */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          {diagnostics.length > 0 && (
            <div className="space-y-3">
              <p
                className="ml-1 text-[10px] font-bold tracking-[0.2em] uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('vacuum.statsDiagnostics') || 'Diagnostikk'}
              </p>
              <div className="space-y-4 rounded-2xl border border-white/[0.03] bg-[var(--glass-bg)] p-5 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-white/5 pb-2">
                  <Activity className="h-4 w-4 text-[var(--accent-color)]" />
                  <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase">
                    {t('vacuum.systemHealth') || 'Systemstatus'}
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {diagnostics.map(({ key, label, state, type }) => {
                    const color = getDiagnosticColor(state, type);
                    const formattedState = formatDiagnosticState(state, type, t);

                    const DiagIcon = (() => {
                      if (key.includes('Water') || key.toLowerCase().includes('water'))
                        return Droplets;
                      if (key.includes('mop') || key.includes('Mop')) return Sparkles;
                      if (key.includes('dust') || key.includes('Dust')) return Warehouse;
                      if (key.includes('drying') || key.includes('Drying')) return Fan;
                      if (key.includes('dnd') || key.includes('Dnd')) return Clock;
                      return Bot;
                    })();

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between py-2.5 text-xs first:pt-0 last:pb-0"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <DiagIcon className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
                          <span className="truncate font-semibold text-[var(--text-secondary)]">
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                          />
                          <span className="font-bold" style={{ color }}>
                            {formattedState}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {advancedSensors.length > 0 && (
            <div className="space-y-3">
              <p
                className="ml-1 text-[10px] font-bold tracking-[0.2em] uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('vacuum.advancedTelemetry') || 'Avansert Telemetri'}
              </p>
              {renderAdvancedTelemetryAccordion()}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <AccessibleModalShell
      open={show && !!vacuumId && !!entities?.[vacuumId]}
      onClose={onClose}
      titleId={modalTitleId}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      panelClassName="popup-anim relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border p-6 font-sans backdrop-blur-xl md:rounded-[3rem] md:p-12"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
          <button
            onClick={onClose}
            className="modal-close absolute top-6 right-6 md:top-10 md:right-10"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header Section */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 pr-12 font-sans">
            <div className="flex items-center gap-4">
              <div
                className="rounded-2xl p-4 transition-all duration-500"
                style={{ backgroundColor: statusBg, color: statusColor }}
              >
                <Bot className={`h-8 w-8${isCleaning ? ' animate-pulse' : ''}`} />
              </div>
              <div>
                <h3
                  id={modalTitleId}
                  className="text-2xl leading-none font-light tracking-tight uppercase italic"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {getDisplayName(entity, vacuumId)}
                </h3>
                <div
                  className="mt-2 inline-block rounded-full px-3 py-1 transition-all duration-500"
                  style={{ backgroundColor: statusBg, color: statusColor }}
                >
                  <p className="text-[10px] font-bold tracking-widest uppercase italic">
                    {t('status.statusLabel')}: {stateLabel}
                  </p>
                </div>
              </div>
            </div>

            {!!activeMapEntityId && (
              <button
                onClick={handleToggleMap}
                className="flex items-center gap-2 rounded-xl border-0 bg-[var(--glass-bg)] px-3.5 py-2 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-all duration-300 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
              >
                <MapPin
                  className={`h-4 w-4 ${showMapToggle ? 'text-[var(--accent-color)]' : 'text-[var(--text-muted)]'}`}
                />
                <span>
                  {showMapToggle
                    ? t('vacuum.hideMap') || 'Skjul kart'
                    : t('vacuum.showMap') || 'Vis kart'}
                </span>
              </button>
            )}
          </div>

          {/* Premium Tab Bar for Map / Area Cleaning / Maintenance */}
          {showTabbedLayout && (
            <div className="mb-8 flex w-fit flex-wrap gap-2 rounded-2xl bg-[var(--glass-bg)] p-1.5">
              <button
                onClick={() => setActiveTab('controls')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-all duration-300 active:scale-[0.98] ${
                  activeTab === 'controls'
                    ? 'bg-[var(--accent-color)] text-white shadow-lg shadow-[rgba(var(--accent-color-rgb),0.25)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Bot className="h-4 w-4" />
                {t('vacuum.controls') || 'Controls'}
              </button>

              {(hasAreas || isAreasLoading) && (
                <button
                  onClick={() => setActiveTab('areas')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-all duration-300 active:scale-[0.98] ${
                    activeTab === 'areas'
                      ? 'bg-[var(--accent-color)] text-white shadow-lg shadow-[rgba(var(--accent-color-rgb),0.25)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  {t('vacuum.roomCleaning') || t('vacuum.cleanRooms') || 'Room Cleaning'}
                </button>
              )}

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-all duration-300 active:scale-[0.98] ${
                  activeTab === 'history'
                    ? 'bg-[var(--accent-color)] text-white shadow-lg shadow-[rgba(var(--accent-color-rgb),0.25)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Activity className="h-4 w-4" />
                {t('vacuum.statsHistory') || 'History'}
              </button>
            </div>
          )}

          {/* Render Tab Contents */}
          <div className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent h-[60vh] overflow-y-auto pr-1 md:h-[480px] md:pr-2">
            {(!showTabbedLayout || activeTab === 'controls') && renderControlsPane(hasMap)}

            {showTabbedLayout && activeTab === 'areas' && (
              <div className="animate-in fade-in duration-300">
                <div className="mb-6">
                  <h4 className="text-lg font-light tracking-wide text-[var(--text-primary)]">
                    {mappedAreas.length > 0
                      ? t('vacuum.cleanAreas') || 'Area Cleaning'
                      : t('vacuum.roomCleaning') || 'Room Cleaning'}
                  </h4>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {mappedAreas.length > 0
                      ? t('vacuum.selectAreas') || 'Select areas to clean'
                      : t('vacuum.selectRoom') || 'Select a room to clean'}
                  </p>
                </div>

                {mappedAreas.length > 0 ? (
                  <>
                    <div className="pr-1">
                      <div
                        className={
                          layoutMode === 'horizontal'
                            ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                            : 'grid grid-cols-2 gap-3 sm:grid-cols-3'
                        }
                      >
                        {mappedAreas.map((area) => {
                          const areaId = area.area_id;
                          const isSelected = selectedAreaIds.includes(areaId);
                          const AreaIcon = getRoomIcon(area.name);

                          return (
                            <button
                              key={areaId}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAreaIds((prev) => prev.filter((id) => id !== areaId));
                                } else {
                                  setSelectedAreaIds((prev) => [...prev, areaId]);
                                }
                              }}
                              className={`flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border-0 p-4 transition-all duration-300 ${
                                isSelected
                                  ? 'scale-[1.02] bg-[var(--accent-color)] text-white shadow-lg shadow-[rgba(var(--accent-color-rgb),0.25)]'
                                  : 'bg-[var(--glass-bg)] text-[var(--text-primary)] hover:scale-[1.01] hover:bg-[var(--glass-bg-hover)]'
                              }`}
                            >
                              <AreaIcon
                                className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-[var(--text-secondary)]'}`}
                              />
                              <span className="max-w-full truncate text-[11px] leading-none font-bold tracking-wide">
                                {area.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-8 flex justify-center">
                        <button
                          disabled={selectedAreaIds.length === 0}
                          onClick={handleCleanSelectedAreas}
                          className="flex items-center gap-3 rounded-2xl bg-[var(--accent-color)] px-10 py-5 text-sm font-bold tracking-widest text-white uppercase shadow-lg shadow-[rgba(var(--accent-color-rgb),0.2)] transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-30"
                        >
                          <Play className="h-5 w-5" />
                          {t('vacuum.cleanSelected') || 'Clean Selected'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : roomSelectOptions.length > 0 ? (
                  <>
                    <div className="popup-surface mx-auto max-w-md space-y-6 rounded-3xl p-6 sm:p-8">
                      <div className="space-y-2">
                        <label className="text-xs font-bold tracking-wider text-[var(--text-secondary)] uppercase">
                          {t('vacuum.selectRoom') || 'Velg rom'}
                        </label>
                        <select
                          value={selectedRoom || ''}
                          onChange={(e) => setSelectedRoom(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-[var(--text-primary)] transition-all focus:border-[var(--accent-color)] focus:outline-none"
                        >
                          {roomSelectOptions.map((option) => (
                            <option
                              key={option}
                              value={option}
                              className="bg-[var(--card-bg)] text-[var(--text-primary)]"
                            >
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleCleanRoom}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--accent-color)] py-5 text-sm font-bold tracking-widest text-white uppercase shadow-lg shadow-[rgba(var(--accent-color-rgb),0.2)] transition-all hover:opacity-90 active:scale-[0.98]"
                      >
                        <Play className="h-5 w-5" />
                        {t('vacuum.cleanSelected') || 'Clean Selected Room'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
                    <MapPin className="mb-4 h-12 w-12 animate-pulse text-[var(--text-muted)] opacity-30" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t('vacuum.noAreasMapped') || 'No areas mapped in Home Assistant'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {showTabbedLayout && activeTab === 'history' && (
              <div className="animate-in fade-in py-4 font-sans duration-300">
                {renderHistoryCard()}
              </div>
            )}
          </div>

          {/* Full Screen Live Map Zoom Modal Overlay */}
          {isMapZoomed &&
            finalMapUrl &&
            createPortal(
              <div
                className="animate-in fade-in fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-2xl transition-all duration-300"
                onClick={() => setIsMapZoomed(false)}
              >
                <div
                  className="relative flex h-full max-h-[90vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/40 p-2 shadow-2xl backdrop-blur-xl"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={handleZoomMouseDown}
                  onMouseMove={handleZoomMouseMove}
                  onMouseUp={handleZoomMouseUpOrLeave}
                  onMouseLeave={handleZoomMouseUpOrLeave}
                  onTouchStart={handleZoomTouchStart}
                  onTouchMove={handleZoomTouchMove}
                  onTouchEnd={handleZoomTouchEnd}
                  style={{
                    cursor: zoomScale > 1.05 ? (isZoomPanning ? 'grabbing' : 'grab') : 'default',
                  }}
                >
                  {availableMapEntities.length >= 1 && (
                    <div className="absolute top-4 left-4 z-[10000] w-64 max-w-[calc(100vw-120px)]">
                      <ModernDropdown
                        labelHidden={true}
                        icon={MapPin}
                        options={availableMapEntities}
                        current={activeMapEntityId}
                        onChange={(val) => {
                          setSelectedMapEntityId(val);
                          try {
                            localStorage.setItem(`tunet_vacuum_selected_map_${vacuumId}`, val);
                          } catch {}
                        }}
                        map={mapEntitiesNamesMap}
                        placeholder={t('vacuum.selectMap') || 'Velg kart'}
                        menuPortal={true}
                        stopPropagation={true}
                        buttonClassName="!bg-black/65 !border-white/10 !px-5 !py-3.5 !rounded-2xl hover:!scale-[1.02] hover:!bg-black/85 shadow-2xl backdrop-blur-md"
                        valueClassName="!text-xs !text-white !font-semibold"
                        menuClassName="!z-[100000]"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => setIsMapZoomed(false)}
                    className="absolute top-4 right-4 z-[10000] flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition-all hover:scale-105 hover:bg-black/80"
                    aria-label="Close Map Zoom"
                  >
                    <Minimize2 className="h-5 w-5" />
                  </button>
                  <img
                    src={finalMapUrl}
                    alt="Live Zoomed Map"
                    onDragStart={(e) => e.preventDefault()}
                    className="pointer-events-none max-h-[85vh] max-w-[85vw] rounded-2xl object-contain transition-transform duration-200 select-none"
                    style={{
                      transform: `translate(${zoomPan.x}px, ${zoomPan.y}px) scale(${zoomScale})`,
                    }}
                  />

                  {/* Fullscreen Floating Map Zoom Toolbar */}
                  <div className="absolute bottom-6 left-1/2 z-[10000] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/60 p-1.5 shadow-lg backdrop-blur-md">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        zoomInFullscreen();
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95"
                      title={t('vacuum.zoomIn') || 'Zoom inn'}
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        zoomOutFullscreen();
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95"
                      title={t('vacuum.zoomOut') || 'Zoom ut'}
                    >
                      <Minus className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetFullscreenZoom();
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95"
                      title={t('vacuum.resetZoom') || 'Resett zoom'}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
        </>
      )}
    </AccessibleModalShell>
  );
}
