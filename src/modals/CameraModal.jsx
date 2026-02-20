import { useEffect, useMemo, useState } from 'react';
import { X, RefreshCw, Video, Camera } from '../icons';
import { getIconComponent } from '../icons';

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

function normalizeStreamUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== 'rtsp:' && protocol !== 'rtsps:') {
      return { type: 'iframe', url };
    }

    const sourceFromPath = parsed.pathname.replace(/^\/+/, '');
    const source = parsed.searchParams.get('src') || sourceFromPath;
    if (!source) return null;

    const wantsMp4 = parsed.searchParams.has('mp4');
    const browserProtocol = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'https:' : 'http:';
    const base = `${browserProtocol}//${parsed.hostname}:1984`;

    if (wantsMp4) {
      return { type: 'video', url: `${base}/api/stream.mp4?src=${encodeURIComponent(source)}` };
    }

    return { type: 'iframe', url: `${base}/stream.html?src=${encodeURIComponent(source)}` };
  } catch {
    return { type: 'iframe', url };
  }
}

function normalizeHomeAssistantUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    const path = parsed.pathname || '';
    if (path.startsWith('/api/hassio_ingress/') || path.startsWith('/api/webrtc')) {
      return `${path}${parsed.search || ''}${parsed.hash || ''}`;
    }
    return url;
  } catch {
    return url;
  }
}

function resolveEmbeddableStreamUrl(url) {
  if (!url) return url;

  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined);
    const src = parsed.searchParams.get('src');
    const isIngressStream = parsed.pathname.includes('/api/hassio_ingress/') && parsed.pathname.endsWith('/stream.html');
    const isCrossOrigin = typeof window !== 'undefined' && parsed.origin !== window.location.origin;

    if (!src || !isIngressStream || !isCrossOrigin) {
      return url;
    }

    return `${parsed.protocol}//${parsed.hostname}:1984/stream.html?src=${encodeURIComponent(src)}`;
  } catch {
    return url;
  }
}

function getWebrtcUrlFromStream(streamUrl) {
  if (!streamUrl) return null;

  try {
    const parsed = new URL(streamUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const src = parsed.searchParams.get('src');
    if (!src) return null;

    const normalizedSrc = String(src).trim().toLowerCase();
    if (normalizedSrc.startsWith('rtsp://') || normalizedSrc.startsWith('rtsps://')) {
      return null;
    }

    if (!parsed.pathname.endsWith('/stream.html')) return null;

    const webrtcPath = parsed.pathname.replace(/\/stream\.html$/, '/api/webrtc');
    const query = `src=${encodeURIComponent(src)}`;

    if (streamUrl.startsWith('/')) {
      return `${webrtcPath}?${query}`;
    }

    return `${parsed.origin}${webrtcPath}?${query}`;
  } catch {
    return null;
  }
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
  const [streamError, setStreamError] = useState(false);
  const [streamTransport, setStreamTransport] = useState('stream');

  if (!show || !entityId || !entity) return null;

  const attrs = entity.attributes || {};
  const accessToken = attrs.access_token || '';
  const name = customName || attrs.friendly_name || entityId;
  const iconName = customIcon || attrs.icon;
  const Icon = iconName ? (getIconComponent(iconName) || Camera) : Camera;

  const haStreamUrl = useMemo(
    () => getEntityImageUrl(buildCameraUrl('/api/camera_proxy_stream', entityId, accessToken)),
    [entityId, accessToken, getEntityImageUrl],
  );

  const snapshotUrl = useMemo(() => {
    const base = buildCameraUrl('/api/camera_proxy', entityId, accessToken) || attrs.entity_picture;
    const sep = base.includes('?') ? '&' : '?';
    return getEntityImageUrl(`${base}${sep}_ts=${refreshTs}`);
  }, [entityId, accessToken, attrs.entity_picture, refreshTs, getEntityImageUrl]);

  const customStream = useMemo(() => {
    const template = (settings?.cameraStreamUrl || '').trim();
    const resolved = resolveCameraTemplate(template, entityId);
    if (!resolved) return null;
    const normalized = normalizeStreamUrl(normalizeHomeAssistantUrl(resolved));
    if (!normalized?.url) return null;

    const finalUrl = normalized.url.startsWith('http://') || normalized.url.startsWith('https://')
      ? normalized.url
      : getEntityImageUrl(normalized.url);

    if (!finalUrl) return null;
    return { type: normalized.type, url: resolveEmbeddableStreamUrl(finalUrl) };
  }, [settings?.cameraStreamUrl, entityId, getEntityImageUrl]);

  const webrtcUrl = useMemo(() => {
    if (!customStream || customStream.type !== 'iframe') return null;
    return getWebrtcUrlFromStream(customStream.url);
  }, [customStream]);

  useEffect(() => {
    setStreamTransport(webrtcUrl ? 'webrtc' : 'stream');
  }, [webrtcUrl, customStream?.url]);

  const renderContent = () => {
    if (viewMode === 'snapshot') {
      return (
        <img
          src={snapshotUrl}
          alt={name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      );
    }

    if (customStream && !streamError) {
      const activeStreamUrl = streamTransport === 'webrtc' && webrtcUrl ? webrtcUrl : customStream.url;

      if (customStream.type === 'video') {
        return (
          <video
            src={customStream.url}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            controls
            onError={() => setStreamError(true)}
          />
        );
      }

      return (
        <iframe
          src={activeStreamUrl}
          title={name}
          className="w-full h-full border-0"
          onError={() => {
            if (streamTransport === 'webrtc') {
              setStreamTransport('stream');
              return;
            }
            setStreamError(true);
          }}
          allow="fullscreen"
        />
      );
    }

    return (
      <img
        src={streamError ? snapshotUrl : haStreamUrl}
        alt={name}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setStreamError(true)}
      />
    );
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-[96vw] max-h-[96vh] rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl relative font-sans backdrop-blur-xl popup-anim flex flex-col"
        style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 modal-close z-10"><X className="w-4 h-4" /></button>

        <div className="mb-3 pr-12 flex items-center justify-between gap-4">
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
              onClick={() => {
                setViewMode('stream');
                setRefreshTs(Date.now());
                setStreamTransport(webrtcUrl ? 'webrtc' : 'stream');
                setStreamError(false);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border ${viewMode === 'stream' ? 'bg-blue-500/20 text-blue-300 border-blue-400/40' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]'}`}
            >
              <span className="inline-flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {t?.('camera.stream') || 'Stream'}</span>
            </button>
            <button
              onClick={() => { setViewMode('snapshot'); setRefreshTs(Date.now()); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border ${viewMode === 'snapshot' ? 'bg-blue-500/20 text-blue-300 border-blue-400/40' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]'}`}
            >
              <span className="inline-flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> {t?.('camera.snapshot') || 'Snapshot'}</span>
            </button>
            <button
              onClick={() => {
                setRefreshTs(Date.now());
                setStreamTransport(webrtcUrl ? 'webrtc' : 'stream');
                setStreamError(false);
              }}
              className="p-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title={t?.('camera.refresh') || 'Refresh'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative flex-1 min-h-[72vh] rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black/70">
          {renderContent()}

          {viewMode === 'stream' && streamError && (
            <div className="absolute inset-x-0 bottom-0 p-3 text-sm text-amber-200 bg-amber-500/10 border-t border-amber-500/20 text-center">
              {t?.('camera.streamUnavailable') || 'Stream unavailable, showing snapshots may work better.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
