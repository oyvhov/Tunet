import { useEffect, useMemo, useState } from 'react';
import { X, RefreshCw, Video, Camera } from '../icons';
import { getIconComponent } from '../icons';

function appendTs(url, ts) {
  if (!url) return '';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_ts=${ts}`;
}

function buildCameraUrl(basePath, entityId, accessToken) {
  const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return `${basePath}/${entityId}${tokenQuery}`;
}

function resolveCameraTemplate(urlTemplate, entityId) {
  if (!urlTemplate) return '';
  const objectId = (entityId || '').includes('.')
    ? entityId.split('.').slice(1).join('.')
    : entityId;
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

export default function CameraModal({
  show,
  onClose,
  entityId,
  entity,
  customName,
  customIcon,
  getEntityImageUrl,
  settings,
  t,
}) {
  const [viewMode, setViewMode] = useState('stream');
  const [refreshTs, setRefreshTs] = useState(Date.now());
  const [streamSource, setStreamSource] = useState('ha');

  const activeEntity = entity || { attributes: {} };
  const activeEntityId = entityId || '';
  const attrs = activeEntity.attributes || {};
  const accessToken = attrs.access_token || '';
  const name = customName || attrs.friendly_name || activeEntityId;
  const iconName = customIcon || attrs.icon;
  const Icon = iconName ? getIconComponent(iconName) || Camera : Camera;

  const streamBase = useMemo(
    () => buildCameraUrl('/api/camera_proxy_stream', activeEntityId, accessToken),
    [activeEntityId, accessToken]
  );
  const snapshotBase = useMemo(() => {
    return buildCameraUrl('/api/camera_proxy', activeEntityId, accessToken) || attrs.entity_picture;
  }, [activeEntityId, accessToken, attrs.entity_picture]);

  const streamUrl = getEntityImageUrl(appendTs(streamBase, refreshTs));
  const snapshotUrl = getEntityImageUrl(appendTs(snapshotBase, refreshTs));
  const streamEngine = normalizeStreamEngine(settings?.cameraStreamEngine);
  const webrtcTemplate = (settings?.cameraWebrtcUrl || '').trim();
  const webrtcUrl = useMemo(() => {
    const resolved = resolveCameraTemplate(webrtcTemplate, activeEntityId);
    return resolved ? getEntityImageUrl(appendTs(resolved, refreshTs)) : null;
  }, [webrtcTemplate, activeEntityId, refreshTs, getEntityImageUrl]);

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
    if (viewMode === 'stream') {
      setStreamSource(preferredSource);
    }
  }, [preferredSource, viewMode]);

  const activeStreamUrl =
    streamSource === 'webrtc' ? webrtcUrl : streamSource === 'ha' ? streamUrl : snapshotUrl;

  const handleStreamError = () => {
    setStreamSource((current) => {
      if (current === 'webrtc') return streamUrl ? 'ha' : 'snapshot';
      if (current === 'ha') return 'snapshot';
      return 'snapshot';
    });
  };

  const isFallbackActive =
    viewMode === 'stream' && streamSource === 'snapshot' && preferredSource !== 'snapshot';

  if (!show || !entityId || !entity) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl border p-4 font-sans shadow-2xl backdrop-blur-xl sm:rounded-3xl sm:p-6"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-4 right-4 z-10 sm:top-6 sm:right-6"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center justify-between gap-4 pr-12">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                {entityId}
              </p>
              <h3 className="truncate text-lg font-bold text-[var(--text-primary)] sm:text-2xl">
                {name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setViewMode('stream');
                setStreamSource(preferredSource);
                setRefreshTs(Date.now());
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${viewMode === 'stream' ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
            >
              <span className="inline-flex items-center gap-1">
                <Video className="h-3.5 w-3.5" /> {t?.('camera.stream') || 'Stream'}
              </span>
            </button>
            <button
              onClick={() => {
                setViewMode('snapshot');
                setRefreshTs(Date.now());
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${viewMode === 'snapshot' ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
            >
              <span className="inline-flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" /> {t?.('camera.snapshot') || 'Snapshot'}
              </span>
            </button>
            <button
              onClick={() => {
                setStreamSource(preferredSource);
                setRefreshTs(Date.now());
              }}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              title={t?.('camera.refresh') || 'Refresh'}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-black/70">
          {viewMode === 'stream' ? (
            <img
              src={activeStreamUrl}
              alt={name}
              className="h-full w-full object-contain"
              referrerPolicy="no-referrer"
              onError={handleStreamError}
            />
          ) : (
            <img
              src={snapshotUrl}
              alt={name}
              className="h-full w-full object-contain"
              referrerPolicy="no-referrer"
            />
          )}

          {isFallbackActive && (
            <div className="absolute inset-x-0 bottom-0 border-t border-amber-500/20 bg-amber-500/10 p-3 text-center text-sm text-amber-200">
              {t?.('camera.streamUnavailable') ||
                'Stream unavailable, showing snapshots may work better.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
