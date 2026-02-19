import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Camera, AlertCircle } from '../../icons';
import { getIconComponent } from '../../icons';

function buildCameraUrl(basePath, entityId, accessToken) {
  const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return `${basePath}/${entityId}${tokenQuery}`;
}

function appendTs(url, ts) {
  if (!url) return '';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_ts=${ts}`;
}

function resolveCameraTemplate(urlTemplate, entityId) {
  if (!urlTemplate) return '';
  const objectId = (entityId || '').includes('.') ? entityId.split('.').slice(1).join('.') : entityId;
  return urlTemplate
    .replaceAll('{entity_id}', entityId || '')
    .replaceAll('{entity_object_id}', objectId || '');
}

function normalizeStreamEngine(value) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'webrtc') return 'webrtc';
  if (raw === 'snapshot') return 'snapshot';
  if (raw === 'ha' || raw === 'ha_stream' || raw === 'hastream' || raw === 'ha-stream') return 'ha';
  return 'auto';
}

export default function CameraCard({
  cardId,
  entityId,
  entity,
  settings,
  entities,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  getEntityImageUrl,
  onOpen,
  size,
  t,
}) {
  const [refreshTs, setRefreshTs] = useState(Date.now());
  const [streamSource, setStreamSource] = useState('ha');
  const intervalRef = useRef(null);
  const previousMotionActiveRef = useRef(false);

  const attrs = entity?.attributes || {};
  const isOffline = !entity || entity.state === 'unavailable' || entity.state === 'unknown' || entity.state === 'off';
  const name = customNames?.[cardId] || attrs.friendly_name || entityId;
  const iconName = customIcons?.[cardId] || attrs.icon;
  const Icon = iconName ? (getIconComponent(iconName) || Camera) : Camera;
  const isSmall = size === 'small';

  const accessToken = attrs.access_token;

  const haStreamUrl = useMemo(
    () => getEntityImageUrl(buildCameraUrl('/api/camera_proxy_stream', entityId, accessToken)),
    [entityId, accessToken, getEntityImageUrl],
  );

  const snapshotUrl = useMemo(() => {
    const base = buildCameraUrl('/api/camera_proxy', entityId, accessToken) || attrs.entity_picture;
    return getEntityImageUrl(appendTs(base, refreshTs));
  }, [entityId, accessToken, attrs.entity_picture, refreshTs, getEntityImageUrl]);

  const streamEngine = normalizeStreamEngine(settings?.cameraStreamEngine);
  const webrtcTemplate = (settings?.cameraWebrtcUrl || '').trim();
  const webrtcUrl = useMemo(() => {
    const resolved = resolveCameraTemplate(webrtcTemplate, entityId);
    return resolved ? getEntityImageUrl(resolved) : null;
  }, [webrtcTemplate, entityId, getEntityImageUrl]);

  const preferredSource = useMemo(() => {
    if (streamEngine === 'snapshot') return 'snapshot';
    if (streamEngine === 'webrtc') {
      if (webrtcUrl) return 'webrtc';
      return 'ha';
    }
    if (streamEngine === 'ha') return 'ha';
    if (webrtcUrl) return 'webrtc';
    return 'ha';
  }, [streamEngine, webrtcUrl]);

  useEffect(() => {
    setStreamSource(preferredSource);
  }, [preferredSource]);

  const previewUrl = streamSource === 'webrtc'
    ? webrtcUrl
    : streamSource === 'ha'
      ? haStreamUrl
      : snapshotUrl;

  const handleStreamError = useCallback(() => {
    setStreamSource((current) => {
      if (current === 'webrtc') return haStreamUrl ? 'ha' : 'snapshot';
      if (current === 'ha') return 'snapshot';
      return current;
    });
  }, [haStreamUrl]);

  const usingSnapshotFallback = streamSource === 'snapshot' && preferredSource !== 'snapshot';

  const refreshMode = settings?.cameraRefreshMode || 'interval';
  const refreshInterval = Math.max(2, Number(settings?.cameraRefreshInterval) || 10);
  const motionSensorId = settings?.cameraMotionSensor || null;

  const doRefresh = useCallback(() => {
    setRefreshTs(Date.now());
    setStreamSource(preferredSource);
  }, [preferredSource]);

  // Interval-based snapshot refresh (only used when stream has failed)
  useEffect(() => {
    if (isOffline || !usingSnapshotFallback || refreshMode !== 'interval') return;
    intervalRef.current = setInterval(doRefresh, refreshInterval * 1000);
    return () => clearInterval(intervalRef.current);
  }, [isOffline, usingSnapshotFallback, refreshMode, refreshInterval, doRefresh]);

  // Motion-sensor-based refresh
  useEffect(() => {
    if (isOffline || refreshMode !== 'motion' || !motionSensorId) {
      previousMotionActiveRef.current = false;
      return;
    }
    const motionEntity = entities?.[motionSensorId];
    if (!motionEntity) {
      previousMotionActiveRef.current = false;
      return;
    }
    const motionState = motionEntity.state;
    const isMotionActive = motionState === 'on' || motionState === 'detected';
    if (isMotionActive && !previousMotionActiveRef.current) {
      doRefresh();
    }
    previousMotionActiveRef.current = isMotionActive;
  }, [isOffline, refreshMode, motionSensorId, entities, doRefresh]);

  if (isSmall) {
    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        className="touch-feedback relative overflow-hidden font-sans h-full rounded-3xl flex items-center p-4 pl-5 gap-4 bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-xl transition-all duration-300"
        style={cardStyle}
        onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen?.(); }}
      >
        {controls}
        <div className="w-12 h-12 rounded-2xl flex-shrink-0 overflow-hidden bg-[var(--glass-bg)]">
          {!isOffline ? (
            <img
              src={previewUrl}
              alt={name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={handleStreamError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
              <Icon className="w-6 h-6 stroke-[1.5px]" />
            </div>
          )}
        </div>
        <div className="flex flex-col min-w-0 justify-center">
          <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 truncate leading-none mb-1.5">
            {isOffline ? (t?.('camera.unavailable') || 'Unavailable') : (t?.('camera.live') || 'Live')}
          </p>
          <p className="text-sm font-bold text-[var(--text-primary)] leading-none truncate">{name}</p>
        </div>
        <span className={`ml-auto w-2.5 h-2.5 rounded-full shrink-0 ${isOffline ? 'bg-red-400' : 'bg-emerald-400'}`} />
      </div>
    );
  }

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      className={`touch-feedback relative h-full rounded-3xl overflow-hidden border bg-[var(--card-bg)] group transition-all duration-300 ${editMode ? 'cursor-move' : 'cursor-pointer active:scale-[0.98]'}`}
      style={cardStyle}
      onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen?.(); }}
    >
      {controls}

      {!isOffline ? (
        <img
          src={previewUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={handleStreamError}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--glass-bg)]">
          <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)] opacity-70">
            <AlertCircle className="w-10 h-10" />
            <p className="text-xs font-bold uppercase tracking-widest">{t?.('camera.unavailable') || 'Unavailable'}</p>
          </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, transparent 35%, rgba(0,0,0,0.45) 100%)' }} />

      {/* Status badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest popup-surface text-[var(--text-primary)] border border-[var(--glass-border)]">
        <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-400' : 'bg-emerald-400'}`} />
        {isOffline ? (t?.('camera.unavailable') || 'Unavailable') : (t?.('camera.live') || 'Live')}
      </div>

      {/* Motion indicator */}
      {refreshMode === 'motion' && motionSensorId && (() => {
        const motionEntity = entities?.[motionSensorId];
        const isMotion = motionEntity?.state === 'on' || motionEntity?.state === 'detected';
        if (!isMotion) return null;
        return (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-500/60 text-white border border-red-400/40 animate-pulse">
            {t?.('camera.motion') || 'Motion'}
          </div>
        );
      })()}

      {/* Name overlay */}
      <div className="absolute left-3 right-3 bottom-3 flex items-end justify-between gap-3">
        <div className="min-w-0 max-w-[75%] px-3 py-2 rounded-xl popup-surface border border-[var(--glass-border)]">
          <p className="text-xs font-bold text-[var(--text-primary)] truncate tracking-wide uppercase">{name}</p>
        </div>
        <div className="shrink-0 p-2 rounded-xl popup-surface border border-[var(--glass-border)] text-[var(--text-primary)]">
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
