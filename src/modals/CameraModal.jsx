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

  if (!show || !entityId || !entity) return null;

  const attrs = entity.attributes || {};
  const accessToken = attrs.access_token || '';
  const name = customName || attrs.friendly_name || entityId;
  const iconName = customIcon || attrs.icon;
  const Icon = iconName ? (getIconComponent(iconName) || Camera) : Camera;

  const streamBase = useMemo(() => buildCameraUrl('/api/camera_proxy_stream', entityId, accessToken), [entityId, accessToken]);
  const snapshotBase = useMemo(() => {
    return buildCameraUrl('/api/camera_proxy', entityId, accessToken) || attrs.entity_picture;
  }, [entityId, accessToken, attrs.entity_picture]);

  const streamUrl = getEntityImageUrl(appendTs(streamBase, refreshTs));
  const snapshotUrl = getEntityImageUrl(appendTs(snapshotBase, refreshTs));
  const streamEngine = normalizeStreamEngine(settings?.cameraStreamEngine);
  const webrtcTemplate = (settings?.cameraWebrtcUrl || '').trim();
  const webrtcUrl = useMemo(() => {
    const resolved = resolveCameraTemplate(webrtcTemplate, entityId);
    return resolved ? getEntityImageUrl(appendTs(resolved, refreshTs)) : null;
  }, [webrtcTemplate, entityId, refreshTs, getEntityImageUrl]);

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

  const activeStreamUrl = streamSource === 'webrtc'
    ? webrtcUrl
    : streamSource === 'ha'
      ? streamUrl
      : snapshotUrl;

  const handleStreamError = () => {
    setStreamSource((current) => {
      if (current === 'webrtc') return streamUrl ? 'ha' : 'snapshot';
      if (current === 'ha') return 'snapshot';
      return 'snapshot';
    });
  };

  const isFallbackActive = viewMode === 'stream' && streamSource === 'snapshot' && preferredSource !== 'snapshot';

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-6xl max-h-[92vh] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative font-sans backdrop-blur-xl popup-anim flex flex-col"
        style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 modal-close z-10"><X className="w-4 h-4" /></button>

        <div className="mb-4 pr-12 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)]">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest font-bold text-[var(--text-secondary)] truncate">{entityId}</p>
              <h3 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] truncate">{name}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setViewMode('stream'); setStreamSource(preferredSource); setRefreshTs(Date.now()); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border ${viewMode === 'stream' ? 'bg-[var(--accent-bg)] text-[var(--accent-color)] border-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]'}`}
            >
              <span className="inline-flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {t?.('camera.stream') || 'Stream'}</span>
            </button>
            <button
              onClick={() => { setViewMode('snapshot'); setRefreshTs(Date.now()); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border ${viewMode === 'snapshot' ? 'bg-[var(--accent-bg)] text-[var(--accent-color)] border-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]'}`}
            >
              <span className="inline-flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> {t?.('camera.snapshot') || 'Snapshot'}</span>
            </button>
            <button
              onClick={() => { setStreamSource(preferredSource); setRefreshTs(Date.now()); }}
              className="p-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title={t?.('camera.refresh') || 'Refresh'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative flex-1 min-h-[320px] rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black/70">
          {viewMode === 'stream' ? (
            <img
              src={activeStreamUrl}
              alt={name}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={handleStreamError}
            />
          ) : (
            <img
              src={snapshotUrl}
              alt={name}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          )}

          {isFallbackActive && (
            <div className="absolute inset-x-0 bottom-0 p-3 text-sm text-amber-200 bg-amber-500/10 border-t border-amber-500/20 text-center">
              {t?.('camera.streamUnavailable') || 'Stream unavailable, showing snapshots may work better.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
